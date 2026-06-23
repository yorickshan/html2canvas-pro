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
manages `<slot>` assignment, fallback content, and shadow-root cloning.

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

`CSSParsedDeclaration` (`css/index.ts`) is the central registry class (~86 typed fields).
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
- **TransformEffect** — matrix transforms with origin offset
- **ClipEffect** — overflow/border-radius clipping via paths
- **OpacityEffect** — global alpha multiplication
- **ClipPathEffect** — CSS `clip-path` shapes
- **BlendEffect** — `mix-blend-mode` composite operations
- **FilterEffect** — CSS `filter` functions

### Phase 5: Canvas Rendering (`src/render/canvas/`)

`CanvasRenderer.render(element)` orchestrates the render pass:
1. Fills the background color (if `options.backgroundColor` is set)
2. Parses the stacking context tree
3. Recursively renders each stacking context

#### Backgrounds (`background-renderer.ts`)

Handles:
- Solid background colors
- URL-based background images (with resize + pattern creation)
- Linear and radial gradients (rendered via offscreen canvases + `createPattern`)
- Repeating linear gradients
- Background blend modes (via `globalCompositeOperation`)

**Pattern cache**: Instance-level LRU cache (max 50) for `CanvasPattern` objects,
keyed by `URL + size + imageRendering`.

#### Borders (`border-renderer.ts`)

Renders solid, dashed, dotted, and double borders per side.
Border-image uses `border-image-renderer.ts` which implements 9-slice scaling.

#### Content (`content-renderer.ts`)

Helper functions extracted from `CanvasRenderer`:
- `renderReplacedElements` — `<img>`, `<canvas>`, `<svg>`, `<iframe>`
- `renderFormElements` — checkboxes, radio buttons, text inputs
- `renderListMarker` — `list-style-image` / `list-style-type` markers

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
| `tokenizer.ts` | 822 | CSS tokenizer state machine |
| `document-cloner.ts` | ~780 | DOM cloning (slot logic extracted) |
| `canvas-renderer.ts` | ~450 | Main canvas renderer (content extracted) |
| `color-tests.ts` | 91 tests | Color parsing tests |
| `stacking-context.ts` | ~150 | Stacking context tree |
| `effects.ts` | ~100 | Effect type system |
| `border-renderer.ts` | ~200 | Border rendering |
| `background-renderer.ts` | ~380 | Background rendering + pattern cache |
| `slot-cloner.ts` | ~190 | Shadow DOM / Slot cloning |
| `content-renderer.ts` | ~260 | Replaced/form/list-item rendering |
