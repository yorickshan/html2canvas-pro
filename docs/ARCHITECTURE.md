# html2canvas-pro Architecture

## Overview

html2canvas-pro is a pure TypeScript DOM-to-Canvas rendering engine. It takes a live DOM
element and produces an `<canvas>` that visually matches it — no external dependencies.

```
DOM Clone → CSS Parse → Layout → Stacking Context → Canvas Render
```

## Rendering Pipeline

### Phase 1: DOM Cloning (`src/dom/`)

`DocumentCloner` (`document-cloner.ts`) deep-clones the source DOM tree into a hidden
`<iframe>`. This is necessary because:

1. **getComputedStyle** returns resolved values — the clone must exist in a real document.
2. **Cross-origin isolation** — the iframe `about:blank` origin prevents taint.
3. **CSS resolution** — inline `<style>` sheets are inlined as `textContent` for
   reliable `getComputedStyle` results.

**Slot / Shadow DOM** handling is delegated to `SlotCloner` (`slot-cloner.ts`), which
manages `<slot>` assignment, fallback content, and shadow-root cloning (including custom
elements' shadow roots and attributes). When the target element lives inside a shadow root,
the temporary iframe is created inside that shadow root so scoped styles apply.

`dom-normalizer.ts` optionally normalizes the cloned DOM before capture (disables
animations, resets transforms). Enabled by default; disable with `normalizeDom: false`.

### Phase 2: CSS Parsing (`src/css/`)

#### Tokenizer

`Tokenizer` (`syntax/tokenizer.ts`) implements the [CSS Syntax Module Level 3](https://www.w3.org/TR/css-syntax-3/)
tokenization algorithm. It consumes raw CSS strings as Unicode code points and produces
`CSSToken[]` streams.

**Key design decisions:**
- Written as a character-by-character state machine (~800 lines) — no regex.
- Object pool (`Tokenizer.get()` / `Tokenizer.release()`, max 40) avoids allocation overhead.
- Singleton token constants (e.g., `COMMA_TOKEN`, `COLON_TOKEN`) eliminate allocations for
  single-character tokens.

#### Parser

`Parser` (`syntax/parser.ts`) consumes `CSSToken[]` and produces `CSSValue[]`
(component values). It handles nesting: blocks `{}` `[]` `()`, function tokens, and
comma-separated lists.

#### Property Descriptors

Each CSS property is defined in `css/property-descriptors/<property-name>.ts`. A descriptor
conforms to one of five parsing types defined in `property-descriptor.ts`:

| Type | Use Case | Example |
|------|----------|---------|
| `VALUE` | Single component value | `font-size`, `opacity` |
| `LIST` | Comma/space-separated values | `background-image`, `margin` |
| `IDENT_VALUE` | Keyword only | `display`, `visibility` |
| `TYPE_VALUE` | Typed value (angle, color, image, length, time) | `background-color` |
| `TOKEN_VALUE` | Raw token passthrough | `content` |

Each descriptor exports a `parse(context, token)` function that transforms the parsed value
into a typed internal representation.

#### CSSParsedDeclaration

`CSSParsedDeclaration` (`css/index.ts`) is the central registry class (~105 typed fields).
It maps CSS property names to their descriptors via a `standardProps` array and lazily
parses each property on construction.

**Grouped facades** (`css/grouped/`) provide structured access:
- `styles.border.topColor` — alternative to `styles.borderTopColor`
- `styles.background.color` — alternative to `styles.backgroundColor`
- `styles.font.family` — alternative to `styles.fontFamily`
- `styles.layout.display` — alternative to `styles.display`

The flat API remains fully supported for backward compatibility.

**Parse cache**: A two-level `Map<descriptor, Map<rawValue, result>>` with LRU eviction
(max 200 entries per descriptor). Cache hits avoid repeated tokenization and parsing.

### Phase 3: Layout (`src/css/layout/`)

`Bounds` class computes element dimensions and positions. Text layout (`text.ts`)
handles line breaking, word breaking, and text measurement using `FontMetrics`.

### Phase 4: Stacking Context (`src/render/stacking-context.ts`)

`parseStackingContexts(element)` traverses the parsed DOM tree and builds a
`StackingContext` tree that follows the [CSS Positioned Layout Module Level 3](https://www.w3.org/TR/css-position-3/#painting-order)
painting order:

1. Background & borders of the stacking context root
2. Negative z-index children
3. In-flow, non-positioned, block-level descendants
4. Non-positioned floating descendants
5. In-flow, inline-level, non-positioned descendants
6. z-index: auto/0, opacity<1, and transform descendants
7. Positive z-index children

Each `ElementPaint` in the tree holds an array of `IElementEffect` objects:
- **TransformEffect** — matrix transforms with origin offset (incl. the individual `rotate` property)
- **ClipEffect** — overflow/border-radius clipping via paths
- **OpacityEffect** — global alpha multiplication
- **ClipPathEffect** — CSS `clip-path` shapes
- **BlendEffect** — `mix-blend-mode` composite operations
- **FilterEffect** — CSS `filter` functions

Masked elements (`mask-image`) are also rendered as real stacking contexts and
rasterised through the same surface path: `mask-renderer.ts` paints the mask
layers into an alpha surface which is applied to the element surface with
`destination-in` before compositing. `backdrop-filter` captures the region
already painted beneath the element's border box from the main canvas, runs it
through the filter surface pipeline, and composites it back. `background-clip:
text` uses `text-clip-renderer.ts`: the background is painted to a device-pixel
offscreen surface and clipped to a glyph mask built from the same text layout
the main renderer uses, then composited 1:1 onto the main canvas.

#### Filter & opacity surface compositing

Eligible stacking contexts (see the [support matrix](./filter-support.md)) are rasterized
into an intermediate surface by `filter-surface.ts` (`surface-bounds.ts` computes the
bounded outset), the parsed filter chain (the full standard function set) is applied to
the surface by the native canvas backend, and the layer's CSS `opacity` is composited
once afterwards. A runtime pixel probe picks the native fast path and falls back to an
SVG backend (blur + single drop-shadow subset) on the same surface. Unsupported chains or subtrees stay on the classic per-draw path.

### Phase 5: Canvas Rendering (`src/render/canvas/`)

`CanvasRenderer.render(element)` orchestrates the render pass:
1. Fills the background color (if `options.backgroundColor` is set)
2. Parses the stacking context tree
3. Recursively renders each stacking context

#### Backgrounds (`background-renderer.ts`)

Handles:
- Solid background colors
- URL-based background images (with resize + pattern creation)
- Linear, radial and conic gradients (rendered via offscreen canvases + `createPattern`)
- Repeating variants of all three gradient types
- Background blend modes (via `globalCompositeOperation`)

**Pattern cache**: Instance-level LRU cache (max 50) for `CanvasPattern` objects,
keyed by `URL + size + imageRendering`.

#### Borders (`border-renderer.ts`)

Renders solid, dashed, dotted, and double borders per side.
Border-image uses `border-image-renderer.ts` which implements 9-slice scaling.

#### Box shadows (`box-shadow-*.ts`)

Box shadows are painted by `box-shadow-painter.ts` with geometry from
`box-shadow-geometry.ts` (blur/border-radius scaling, inset masking) and
`box-shadow-transform.ts` (composing shadows through effective canvas transforms).
Shadows participate in filter-surface rasterization when the layer is eligible.

#### Text (`text-renderer.ts`)

`text-renderer.ts` paints text runs: grapheme segmentation, letter-spacing, direction,
writing-mode baselines (CJK stays on the alphabetic baseline), and `webkit-text-stroke`
via `paint-order`. `font-utils.ts` measures baselines; text decoration lines
(underline/overline/line-through with style, thickness, and offset) live in
`text/text-decoration-renderer.ts`.

#### Content (`content-renderer.ts`)

Helper functions extracted from `CanvasRenderer`:
- `renderReplacedElements` — `<img>`, `<canvas>`, `<svg>`, `<iframe>`
- `renderFormElements` — checkboxes, radio buttons, text inputs
- `renderListMarker` — geometric markers for `disc` / `circle` / `square` plus
  `list-style-image` images (contained in the 1em marker box) and `list-style-type` markers

#### Effects (`effects-renderer.ts`)

Manages `ctx.save()` / `ctx.restore()` pairs for effects nesting.
Applies effects via `ctx.save()` before rendering, pops afterward.

## Key Design Patterns

### Property Descriptor Pattern

Every CSS property is self-contained in a descriptor file. Adding a new property:
1. Create `src/css/property-descriptors/<name>.ts` with the descriptor
2. Import it in `src/css/index.ts`
3. Add a typed field to `CSSParsedDeclaration`
4. Add a `[field, descriptor, cssPropName]` tuple to `standardProps`
5. If rendering is needed, add a handler

### Structural Typing for Grouped Facades

Facade classes (`BorderStyles`, etc.) accept any object structurally matching the
required field set — no circular imports with `CSSParsedDeclaration`. The constructor
`private readonly styles: CSSParsedDeclaration` uses `import type` which is erased
at compile time.

### LRU Cache Eviction

Both the CSS parse cache and background pattern cache use `Map` insertion-order for
LRU: on cache hit, delete+re-set to move the entry to the end; on overflow, delete
the first key (oldest entry).

## File Size Reference

| File | Lines | Purpose |
|------|-------|---------|
| `canvas-renderer.ts` | ~1100 | Main canvas renderer orchestration |
| `text-renderer.ts` | ~720 | Text run painting (CJK, writing modes, stroke) |
| `background-renderer.ts` | ~630 | Background rendering + all gradient types + pattern cache |
| `stacking-context.ts` | ~470 | Stacking context tree + effects |
| `content-renderer.ts` | ~420 | Replaced/form/list-item rendering |
| `document-cloner.ts` | ~410 | DOM cloning (slot, pseudo-element and iframe-mount logic extracted) |
| `bound-curves.ts` | ~390 | Border-radius curves per box edge |
| `css/index.ts` | ~350 | `CSSParsedDeclaration` registry |
| `text-clip-renderer.ts` | ~320 | `background-clip: text` device-pixel glyph-mask surfaces |
| `filter-surface.ts` | ~310 | Filter/opacity surface compositing |
| `border-image-renderer.ts` | ~280 | 9-slice border-image rendering |
| `iframe-mount.ts` | ~280 | Temporary iframe creation and mounting (incl. Shadow DOM) |
| `effects.ts` | ~280 | Effect type system |
| `mask-renderer.ts` | ~230 | `mask-image` alpha-surface rasterization |
| `border-renderer.ts` | ~225 | Border rendering |
| `box-shadow-painter.ts` | ~220 | Box shadow painting |
| `slot-cloner.ts` | ~205 | Shadow DOM / Slot cloning |
| `dom-normalizer.ts` | ~130 | Pre-capture DOM normalization |
