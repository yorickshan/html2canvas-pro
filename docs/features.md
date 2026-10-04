# Features

Below is a list of all the supported CSS properties and values.

> **CSS filters and layer opacity:** the surface-compositing path (shipped in 2.4.4 and included in current releases) is deliberately limited in scope. The filter functions listed below are broader than that path. See [CSS filters and layer opacity](./filter-support.md) for supported combinations, subtree restrictions, and the difference between SVG backend fallback and returning to the previous renderer.

 - accent-color (**Checkbox/radio fill** — checked state of `<input>` elements; `auto` falls back to the built-in colour)
 - background
   - background-clip (incl. `text`)
   - background-blend-mode
   - background-color
   - background-image
       - url()
       - linear-gradient()
       - repeating-linear-gradient()
       - radial-gradient()
       - repeating-radial-gradient()
       - conic-gradient()
       - repeating-conic-gradient()
   - background-origin
   - background-position
   - background-repeat
   - background-size
 - border
   - border-color
   - border-image
     - border-image-source
     - border-image-slice
     - border-image-width
     - border-image-outset
     - border-image-repeat
   - border-radius
   - border-style
   - border-width
 - backdrop-filter (**Limited support** — `blur()` on the already-painted backdrop; see [Backdrop filters](#backdrop-filter-support))
 - bottom
 - box-decoration-break (**Parsed only** — no visual effect in single-element rendering)
 - box-shadow
 - box-sizing
 - clip-path
   - `inset()`
   - `rect()`
   - `xywh()`
   - `circle()`
   - `ellipse()`
   - `polygon()`
   - `path()`
 - content
 - counter-increment
 - counter-reset
 - color
 - direction
 - display
 - filter ([surface-compositing scope and fallback behavior](./filter-support.md))
   - blur()
   - brightness()
   - contrast()
   - drop-shadow()
   - grayscale()
   - hue-rotate()
   - invert()
   - opacity()
   - saturate()
   - sepia()
 - flex
 - float
 - font
   - font-family
   - font-size
   - font-style
   - font-variant
   - font-variant-ligatures (**Parsed only** — Canvas renders via browser font engine)
   - font-weight
 - height
 - image-rendering (`auto`, `pixelated`, `crisp-edges`, `smooth`)
 - image-set() (**background-image value** — candidate closest to `devicePixelRatio` is selected)
 - isolation (**Stacking-context flag** — blended descendants are structurally scoped; pixel-level group isolation is not composited separately)
 - left
 - letter-spacing
 - line-break
 - line-height
 - list-style
    - list-style-image
    - list-style-position
    - list-style-type
 - margin
 - mask-image / mask-position / mask-repeat / mask-size (**Alpha masks** — see [Mask support](#mask-support))
 - mix-blend-mode
 - max-height
 - max-width
 - min-height
 - min-width
 - object-fit
 - object-position
 - opacity
 - overflow
 - overflow-wrap
 - outline / outline-offset / outline-color / outline-style / outline-width
 - padding
 - paint-order
 - position
 - quotes
 - right
 - rotate (**Limited support**)
 - text-align
 - text-decoration
   - text-decoration-color
   - text-decoration-line
   - text-decoration-style (`solid`, `double`, `dotted`, `dashed`, `wavy`)
   - text-decoration-thickness
   - text-underline-offset
 - text-emphasis / text-emphasis-style / text-emphasis-color / text-emphasis-position (**Horizontal text**; see [Text emphasis](#text-emphasis-support))
 - text-overflow
 - text-shadow
 - text-transform
 - top
 - transform (**Limited support**)
 - transform-origin
 - visibility
 - white-space
 - width
 - webkit-line-clamp
 - webkit-box-reflect (**Non-standard** — see [Box reflection](#-webkit-box-reflect-support))
 - webkit-text-fill-color (**Fill override** — falls back to `color` for `currentcolor`)
 - webkit-text-stroke
 - word-break
 - word-spacing
 - word-wrap
 - writing-mode
 - z-index
 - zoom

## What's new in v2.5

- **`background-clip: text`** — gradient (and colour) backgrounds clipped to the glyphs, rendered on a device-pixel surface with text-shadow and `-webkit-text-stroke` interaction (see [background-clip: text support](#background-clip-text-support))
- **`mask-image` support** — alpha masks with `mask-position` / `mask-size` / `mask-repeat`, composited on a dedicated surface (see [Mask support](#mask-support))
- **`backdrop-filter: blur()`** — frosted-glass captures via backdrop capture and the filter surface pipeline (see [Backdrop-filter support](#backdrop-filter-support))
- **`conic-gradient()`, `repeating-radial-gradient()` and `repeating-conic-gradient()`** — completing the gradient family
- **`clip-path: rect()` / `xywh()`** — the newer basic shape functions
- **`text-emphasis`** — CJK emphasis marks (`filled`/`open` dot, circle, double-circle, triangle, sesame, or a custom string) in any colour, above or below the text
- **`-webkit-box-reflect`** — mirrored copies below/above/left/right with offset and gradient mask
- **`image-set()`** — the DPR-appropriate candidate is selected from the computed value
- **`border-image-width` / `border-image-outset`** — the border-image geometry family is complete

## What's new in v2.4.x

- **`accent-color`, `outline`, `-webkit-text-fill-color`, `isolation`** — form control colours, focus rings, gradient-text fill overrides, blend scoping
- **box-shadow fidelity** — correct blur/border-radius scaling, inset shadow masking, and shadows preserved through transformed ancestors ([2.4.4](https://github.com/yorickshan/html2canvas-pro/blob/main/CHANGELOG.md), [2.4.5](https://github.com/yorickshan/html2canvas-pro/blob/main/CHANGELOG.md))
- **filter surface compositing** — eligible layers composite `blur()`/`drop-shadow()` on a dedicated surface before layer `opacity` is applied; native canvas fast path with verified SVG fallback ([scope & limits](./filter-support.md))
- **CJK text** — CJK glyphs keep the alphabetic baseline when `letter-spacing` is set
- **textarea text wrapping** — `white-space` aware wrapping inside textareas
- **Cross-origin images** — the resource cache can load cross-origin images with CORS enabled
- **Shadow DOM** — shadow roots and attributes of custom elements are preserved in clones; fieldset legends are positioned like the browser does

## CSS properties supported as of v2.1.1+

All previously listed unsupported properties are now implemented:

 - **background-blend-mode** — Full support for blend modes on background image layers
 - **border-image** — 9-slice border image rendering with stretch/repeat/round
 - **box-decoration-break** — Parsed (`slice` / `clone`); no visual difference in single-element rendering
 - **box-shadow** — Full support including inset shadows
 - **filter** — CSS filter functions: `blur()`, `brightness()`, `contrast()`, `drop-shadow()`, `grayscale()`, `hue-rotate()`, `invert()`, `opacity()`, `saturate()`, `sepia()`. This list does not imply general filter-chain or group-opacity equivalence; see [surface-compositing limits](./filter-support.md).
 - **font-variant-ligatures** — Parsed; Canvas text rendering is handled by the browser font engine
 - **object-position** — Controls alignment of replaced elements (images, canvas, SVG) within their content box
 - **repeating-linear-gradient()** — Repeating linear gradient backgrounds
 - **zoom** — Element zoom via CSS transform scale
 - **translate / scale / rotate** — CSS Transforms Level 2 individual transform properties, composed with `transform` in spec order (translate → rotate → scale → transform) around the shared `transform-origin`
 - **color-mix()** — Interpolation in `srgb`, `srgb-linear`, `lab`, `oklab`, `lch`, `oklch`, `hsl`, `xyz`, `xyz-d50`, `xyz-d65` with alpha premultiplication and named hue methods; unsupported forms degrade to transparent. Modern browsers hand html2canvas-pro the already-resolved `color()`/`lab()`/`oklab()` computed value, so captures work there even without this parser

## Additional Features

### Image Smoothing Control

Control image smoothing (anti-aliasing) for rendered images. Perfect for pixel art, retro games, and low-resolution image upscaling.

**Global Options:**
```javascript
// Disable smoothing for pixel art
html2canvas(element, {
    imageSmoothing: false,
    scale: 2  // Upscale 2x without blur
});

// High quality smoothing for photos
html2canvas(element, {
    imageSmoothing: true,
    imageSmoothingQuality: 'high'  // 'low' | 'medium' | 'high'
});
```

**CSS Property Support:**
```html
<img src="sprite.png" style="image-rendering: pixelated;" />
<img src="photo.jpg" style="image-rendering: smooth;" />
```

**Supported CSS values:**
- `auto` - Browser default behavior
- `pixelated` - Disable smoothing, preserve pixel art style (also `-webkit-optimize-contrast`)
- `crisp-edges` - Disable smoothing, preserve sharp edges (also `-webkit-crisp-edges`, `-moz-crisp-edges`)
- `smooth` - Enable high-quality smoothing

**Common Use Cases:**

1. **Pixel Art / Retro Games**
```javascript
// Capture pixel-perfect game screenshot without blur
const gameCanvas = document.getElementById('game');
const screenshot = await html2canvas(gameCanvas, {
    imageSmoothing: false,
    scale: 2,  // Upscale 2x without blur
    backgroundColor: '#000000'
});
document.body.appendChild(screenshot);
```

2. **UI Icons and Sprites**
```javascript
// Export crisp 16x16 icons at 4x scale for retina displays
const iconElement = document.querySelector('.icon-16');
const exportedIcon = await html2canvas(iconElement, {
    imageSmoothing: false,
    scale: 4,
    backgroundColor: null  // Transparent background
});
```

3. **Mixed Content (Pixel Art + Photos)**
```html
<!-- HTML: Each image controls its own rendering -->
<div id="gallery">
    <img src="pixel-sprite.png" style="image-rendering: pixelated;" />
    <img src="photo.jpg" style="image-rendering: smooth;" />
    <img src="icon.svg" style="image-rendering: crisp-edges;" />
</div>
```
```javascript
// JavaScript: CSS properties are automatically respected
const gallery = document.getElementById('gallery');
await html2canvas(gallery);  // Each image uses its CSS setting
```

4. **High-Quality Photo Export**
```javascript
// Professional photo capture with maximum quality
const photoElement = document.querySelector('.photo-frame');
const canvas = await html2canvas(photoElement, {
    imageSmoothing: true,
    imageSmoothingQuality: 'high',
    scale: 2,
    backgroundColor: '#ffffff'
});

// Download as high-quality PNG
const link = document.createElement('a');
link.download = 'photo-export.png';
link.href = canvas.toDataURL('image/png');
link.click();
```

5. **Tile Map Renderer**
```javascript
// Capture retro-style tile map without interpolation
const tileMap = document.getElementById('tile-map');
const mapImage = await html2canvas(tileMap, {
    imageSmoothing: false,
    scale: 3,  // 3x for better visibility
    logging: false
});
```

6. **Conditional Rendering Based on Content**
```javascript
// Automatically choose smoothing based on content type
async function smartCapture(element, contentType) {
    const options = {
        pixelArt: {
            imageSmoothing: false,
            scale: 2
        },
        photo: {
            imageSmoothing: true,
            imageSmoothingQuality: 'high',
            scale: 1
        },
        document: {
            imageSmoothing: true,
            imageSmoothingQuality: 'medium',
            scale: 2
        }
    };
    
    return await html2canvas(element, options[contentType]);
}

// Usage
await smartCapture(gameElement, 'pixelArt');
await smartCapture(photoGallery, 'photo');
```

**Browser Support:**
- `imageSmoothingEnabled`: All modern browsers
- `imageSmoothingQuality`: Chrome 54+, Firefox 94+, Safari 17+

**References:**
- [Issue #119](https://github.com/yorickshan/html2canvas-pro/issues/119)
- [MDN: imageSmoothingEnabled](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled)
- [MDN: image-rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering)

---

### clip-path Support

Clip elements to arbitrary shapes using the `clip-path` CSS property. The clip is applied to the element and all its descendants, matching browser behaviour.

**Supported shape functions:**

| Function | Description |
|---|---|
| `inset(top [right [bottom [left]]] [round ...])` | Rectangular inset (1–4 values, same shorthand as `margin`). The optional `round` clause is parsed but ignored. |
| `rect(top right bottom left [round ...])` | Distances from each edge; `auto` resolves to 0 for top/left and full extent for right/bottom. Rendered through the inset path. |
| `xywh(x y width height [round ...])` | Rectangle at `(x, y)` from the top-left corner. The optional `round` clause is parsed but ignored. |
| `circle([radius] [at cx cy])` | Circle. Radius accepts `<length>`, `<percentage>`, `closest-side`, or `farthest-side`. Center defaults to `50% 50%`. |
| `ellipse([rx ry] [at cx cy])` | Ellipse with independent horizontal/vertical radii. Same radius keywords as `circle()`. |
| `polygon([fill-rule,] x y, x y, ...)` | Arbitrary polygon. An optional leading `nonzero`/`evenodd` fill-rule is accepted and skipped. |
| `path('svg-path-data')` | SVG path string. Coordinates are in the element's local space (origin = element top-left). Requires `Path2D` browser support (all modern browsers). |

**Usage examples:**

```html
<!-- Circular avatar -->
<img src="avatar.jpg" style="clip-path: circle(50%);" />

<!-- Diamond shape -->
<div style="clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);">
  content
</div>

<!-- Inset frame -->
<div style="clip-path: inset(10%);">
  content
</div>

<!-- Ellipse crop -->
<div style="clip-path: ellipse(60% 40% at 50% 50%);">
  content
</div>

<!-- SVG path (triangle, local coordinates) -->
<div style="width: 200px; height: 200px; clip-path: path('M 100 0 L 200 200 L 0 200 Z');">
  content
</div>
```

**Limitations:**

- `url(#svgClipPath)` references to external SVG `<clipPath>` elements are not yet supported.
- The `round` border-radius clause inside `inset()` is currently ignored (rounded inset clips render as sharp rectangles).
- `path()` coordinates require `Path2D` and `CanvasRenderingContext2D.getTransform()` (available in all evergreen browsers; IE is not supported).

**Browser support requirements:**
- `circle()`, `ellipse()`, `polygon()`, `inset()` — all modern browsers (Chrome 24+, Firefox 54+, Safari 10.1+).
- `path()` — `Path2D` support required (Chrome 36+, Firefox 31+, Safari 10.1+).

**References:**
- [Issue #107](https://github.com/yorickshan/html2canvas-pro/issues/107)
- [MDN: clip-path](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path)
- [CSS Masking Module Level 1](https://www.w3.org/TR/css-masking-1/#the-clip-path)

---

### Mask support

`mask-image` hides parts of an element (and its descendants) where the mask is
transparent — the standard way to fade images into backgrounds. Elements with a
mask are rendered to an intermediate surface and composited with
`destination-in`, so masks combine correctly with the element's own background,
border, and content.

```html
<!-- Fade an image into the page background (very common) -->
<img src="photo.jpg" style="mask-image: linear-gradient(black, transparent); -webkit-mask-image: linear-gradient(black, transparent);" />

<!-- Radial vignette -->
<div style="background: #08c; mask-image: radial-gradient(circle at 50% 50%, black 0%, transparent 70%);">
  content
</div>

<!-- Sized and positioned mask image -->
<div style="mask-image: url(alpha-stamp.png); mask-size: cover; mask-position: center; mask-repeat: no-repeat;">
  content
</div>
```

`mask-position`, `mask-size` and `mask-repeat` share the value grammar of their
`background-*` counterparts. `-webkit-mask-*` aliases work because the browser
resolves them to the standard properties in computed style.

**Limitations (current scope):**

- Alpha masking only (`mask-mode: luminance` is not implemented).
- Multiple mask layers composite additively (the spec default); the other
  `mask-composite` operations are not supported.
- `mask-clip` / `mask-origin` are not parsed; the border box is used as the
  mask positioning area.
- Repeating gradients render their base cycle at the repeating period.
- Like `filter`, an unsupported subtree (transformed ancestors, etc.) keeps the
  previous renderer without the mask — check the console for the info log.

---

### Backdrop-filter support

`backdrop-filter` blurs what has already been painted **behind** an element —
the glassmorphism effect. Because html2canvas paints in stacking order, the
capture takes the element's backdrop region from the canvas, applies the filter
on a dedicated surface, and composites it back before painting the element
itself.

```html
<div style="position: relative;">
  <img src="scenery.jpg" style="width: 100%;" />
  <div style="position: absolute; inset: 20% 30%; backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.4);">
    frosted glass
  </div>
</div>
```

**Limitations (current scope):**

- `blur()` is supported (the same subset as the [filter surface path](./filter-support.md)); other filter functions are ignored for the backdrop.
- Content painted *after* the element (later siblings) is not part of its
  backdrop — matching how the browsers composite within one stacking context,
  but not their cross-layer behaviour.
- The effect is applied in the main renderer only, not inside nested filter
  surfaces.

---

### Text emphasis support

`text-emphasis` draws marks above (or below) each grapheme cluster — the
classic CJK emphasis treatment, also handy for highlighting runs of text.

```html
<!-- CJK emphasis dots -->
<p style="text-emphasis: filled circle #cc0000;">这些文字会带红色圆点</p>

<!-- Open sesame marks below the text -->
<p style="text-emphasis: open sesame; text-emphasis-position: under left;">強調テキスト</p>

<!-- Custom string marks -->
<p style="text-emphasis: '★';">Starred text</p>
```

Supported shapes: `dot`, `circle`, `double-circle`, `triangle`, `sesame`, each
in `filled` (default) or `open` form, plus a custom `<string>` mark rendered at
half the font size. `text-emphasis-color` accepts any colour and falls back to
the text colour for `currentcolor`.

**Limitations (current scope):**

- Horizontal text only; in vertical writing modes the marks are skipped.

---

### -webkit-box-reflect support

`-webkit-box-reflect` paints a mirrored copy of the element (including its
subtree) below, above, left or right of it, with an optional offset and mask —
the classic WebKit reflection effect. The element is rasterised through the
composited surface path and mirrored, then the mask (defined in element
coordinates) is composited in the mirrored space.

```html
<!-- Gradient reflection below an image -->
<img src="screenshot.png" style="-webkit-box-reflect: below 4px linear-gradient(transparent, rgba(255, 255, 255, 0.6));" />

<!-- Masked reflection to the right -->
<div style="-webkit-box-reflect: right 0px linear-gradient(to left, black, transparent);">
  content
</div>
```

**Limitations (current scope):**

- The reflection mirrors the element's border box; combined with
  `filter`/`mask` outsets the mirror source is clipped to the element box.
- `box-reflect` makes the element a stacking context, consistent with WebKit.

---

### background-clip: text support

`background-clip: text` clips the element's background (colour and images) to
the glyphs of its text, with `color: transparent` leaving only the gradient
text. The background is painted to a device-pixel offscreen surface and clipped
to a glyph mask built from the same text layout the main renderer uses
(per-grapheme draws under letter-spacing), then composited 1:1 onto the main
canvas — sharp at any `devicePixelRatio`.

```html
<!-- Gradient text -->
<h1 style="background-image: linear-gradient(90deg, #4b55d8, #262b7e);
           -webkit-background-clip: text; background-clip: text; color: transparent;">
  Gradient heading
</h1>
```

**Interaction with text shadows and stroke:**

- `text-shadow` paints **beneath** the clipped background — silhouettes in the
  shadow colour, in the browser's shadow order (the last shadow deepest).
- `-webkit-text-stroke` **joins the clip region**: the gradient fills the
  stroke band as well as the glyph interiors, matching WebKit.

**Limitations (current scope):**

- Horizontal text only; vertical writing modes fall back to a single mask
  draw per fragment.
- The clip region covers fill (+ stroke band when `-webkit-text-stroke` is
  present); `text-emphasis` marks are not part of it.
