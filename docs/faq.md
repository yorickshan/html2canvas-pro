# FAQ

## Why is my canvas output larger/smaller than expected?

When you set `width: 1920` and `height: 1080`, you might expect a canvas with exactly 1920×1080 pixels, but instead get a canvas with 3840×2160 pixels (or 2400×1350 pixels on some devices).

**This is the expected behavior**, not a bug.

### Understanding Canvas Dimensions

The `width` and `height` options set the **CSS display size**, not the internal pixel dimensions.

**Formula:**
```
Canvas pixel width = width × scale
Canvas pixel height = height × scale
```

**Default behavior:**

By default, `scale = window.devicePixelRatio`:
- On standard displays: `scale = 1`
- On Retina/high-DPI displays: `scale = 2`
- On some displays: `scale = 1.25`, `1.5`, etc.

This produces high-quality images for high-DPI screens.

### Example

```javascript
// On a Retina display (devicePixelRatio = 2):
html2canvas(element, {
    width: 1920,
    height: 1080
});

// Results in:
// - Canvas CSS display size: 1920px × 1080px
// - Canvas internal resolution: 3840px × 2160px
// - Canvas HTML: <canvas width="3840" height="2160" style="width: 1920px; height: 1080px;">
```

### Solution

If you want **exact pixel dimensions**, set `scale: 1`:

```javascript
html2canvas(element, {
    width: 1920,
    height: 1080,
    scale: 1  // Now canvas will be exactly 1920×1080 pixels
});
```

### When to use `scale: 1` vs default scale?

| Use Case | Recommended Setting | Reason |
|----------|-------------------|--------|
| Need exact output dimensions | `scale: 1` | Predictable file size and dimensions |
| High-quality screenshots | Default (`scale = devicePixelRatio`) | Better quality on high-DPI displays |
| Smaller file size | `scale: 1` | Lower resolution = smaller file |
| Print quality | `scale: 2` or higher | Higher DPI for better print quality |

## Why aren't my images rendered?
html2canvas-pro cannot bypass content policy restrictions set by your browser. Drawing images from outside the
[origin](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) of the current page will [taint the
canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image#What_is_a_tainted_canvas) they are drawn on. Once the canvas is tainted, it can no longer be read. Therefore, html2canvas-pro checks
whether an image would taint the canvas before drawing it. If you have set the `allowTaint`
[option](./configuration) to `false`, it will skip the image.

If you wish to load images that reside outside of your page's origin, you can use a [proxy](./proxy) to load them.

## Why is the produced canvas empty or cut off halfway through?
Make sure the `canvas` element doesn't exceed [browser limits](https://stackoverflow.com/questions/6081483/maximum-size-of-a-canvas-element) for canvas dimensions, or use the window configuration options to set a custom window size based on the element:
```javascript
import html2canvas from 'html2canvas-pro';

await html2canvas(element, {
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight
});
```
Window limits vary by browser, operating system, and system hardware.

### Chrome
> Maximum height/width: 32,767 pixels
> Maximum area: 268,435,456 pixels (e.g., 16,384 x 16,384)

### Firefox
> Maximum height/width: 32,767 pixels
> Maximum area: 472,907,776 pixels (e.g., 22,528 x 20,992)

### iOS
> The maximum size for a canvas element is 3 megapixels for devices with less than 256 MB RAM and 5 megapixels for devices with greater or equal than 256 MB RAM

## Why doesn't CSS property X render correctly or only partially?
Each CSS property must be manually implemented to render correctly, so html2canvas-pro will *never* have full CSS support.
The library strives to support the most [commonly used CSS properties](./features) as far as possible. If a CSS property
is missing or incomplete and you believe it should be included, create a test case and file an issue.

## How do I get html2canvas-pro to work in a browser extension?
You should not use html2canvas-pro inside a browser extension. Most browsers provide native APIs for capturing screenshots from
tabs within extensions. See [Chrome](https://developer.chrome.com/extensions/tabs#method-captureVisibleTab) and
[Firefox](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D#drawWindow()) for details.
