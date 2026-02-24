# Features

Below is a list of all the supported CSS properties and values.

 - background
   - background-clip (**Does not support `text`**)
   - background-color
   - background-image
       - url()
       - linear-gradient()
       - radial-gradient()
   - background-origin
   - background-position
   - background-size
 - border
   - border-color
   - border-radius
   - border-style
   - border-width
 - bottom
 - box-sizing
 - clip-path
   - `inset()`
   - `circle()`
   - `ellipse()`
   - `polygon()`
   - `path()`
 - content
 - color
 - display
 - flex
 - float
 - font
   - font-family
   - font-size
   - font-style
   - font-variant
   - font-weight
 - height
 - image-rendering (`auto`, `pixelated`, `crisp-edges`, `smooth`)
 - left
 - letter-spacing
 - line-break
 - list-style
    - list-style-image
    - list-style-position
    - list-style-type
 - margin
 - max-height
 - max-width
 - min-height
 - min-width
 - opacity
 - overflow
 - overflow-wrap
 - padding
 - paint-order
 - position
 - right
 - text-align
 - text-decoration
   - text-decoration-color
   - text-decoration-line
   - text-decoration-style (`solid`, `double`, `dotted`, `dashed`, `wavy`)
   - text-decoration-thickness
   - text-underline-offset
 - text-overflow
 - text-shadow
 - text-transform
 - top
 - transform (**Limited support**)
 - visibility
 - white-space
 - width
 - webkit-line-clamp
 - webkit-text-stroke
 - word-break
 - word-spacing
 - word-wrap
 - z-index
 - [oklch](https://github.com/niklasvh/html2canvas/issues/3148)
 - [object-fit](https://github.com/niklasvh/html2canvas/issues/3072)

## Unsupported CSS properties
These CSS properties are **NOT** currently supported
 - [background-blend-mode](https://github.com/niklasvh/html2canvas/issues/966)
 - [border-image](https://github.com/niklasvh/html2canvas/issues/1287)
 - [box-decoration-break](https://github.com/niklasvh/html2canvas/issues/552)
 - [box-shadow](https://github.com/niklasvh/html2canvas/pull/1086)
 - [filter](https://github.com/niklasvh/html2canvas/issues/493)
 - [font-variant-ligatures](https://github.com/niklasvh/html2canvas/pull/1085)
 - [mix-blend-mode](https://github.com/niklasvh/html2canvas/issues/580)
 - object-position
 - [repeating-linear-gradient()](https://github.com/niklasvh/html2canvas/issues/1162)
 - [writing-mode](https://github.com/niklasvh/html2canvas/issues/1258)
 - [zoom](https://github.com/niklasvh/html2canvas/issues/732)

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
    scale: 2,  // 2x upscale while keeping pixels sharp
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
