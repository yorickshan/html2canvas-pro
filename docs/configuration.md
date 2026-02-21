# Configuration Options

This document outlines all available configuration options for html2canvas-pro. These options allow you to customize the rendering behavior, image handling, and output of the canvas.

## Basic Configuration

| Option Name | Default | Description | Example |
| ----------- | :-----: | ----------- | ------- |
| allowTaint | `false` | Whether to allow cross-origin images to taint the canvas | `true` |
| backgroundColor | `#ffffff` | Canvas background color, if none is specified in DOM. Set `null` for transparent | `"rgba(0,0,0,0.5)"` |
| canvas | `null` | Existing `canvas` element to use as a base for drawing on | `document.createElement('canvas')` |
| logging | `true` | Enable logging for debug purposes | `false` |
| removeContainer | `true` | Whether to cleanup the cloned DOM elements html2canvas-pro creates temporarily | `false` |
| scale | `window.devicePixelRatio` | The scale to use for rendering. Controls the canvas internal resolution. Defaults to the browser's device pixel ratio (usually `1` or `2`). Higher values produce sharper images but larger file sizes | `2` or `1` |
| width | `Element` width | The **CSS display width** of the canvas. The actual canvas pixel width will be `width × scale`. See [Canvas Dimensions](#canvas-dimensions) below | `1200` |
| height | `Element` height | The **CSS display height** of the canvas. The actual canvas pixel height will be `height × scale`. See [Canvas Dimensions](#canvas-dimensions) below | `800` |

### Canvas Dimensions

⚠️ **Important**: Understanding how `width`, `height`, and `scale` work together:

- **Canvas Display Size** = `width` × `height` (CSS pixels, how it appears on screen)
- **Canvas Internal Resolution** = `(width × scale)` × `(height × scale)` (actual pixels stored in canvas)

**Example:**
```javascript
// This configuration:
html2canvas(element, {
    width: 1920,
    height: 1080
});

// On a device with devicePixelRatio = 2 (e.g., Retina display):
// Will produce a canvas with:
// - Display size: 1920px × 1080px
// - Internal resolution: 3840px × 2160px (1920×2, 1080×2)
// - Canvas attributes: width="3840" height="2160"
// - Canvas style: width: 1920px; height: 1080px;
```

**To get exact pixel dimensions:**
```javascript
// If you want the canvas to be EXACTLY 1920×1080 pixels:
html2canvas(element, {
    width: 1920,
    height: 1080,
    scale: 1  // Set scale to 1 for exact dimensions
});

// This will produce:
// - Display size: 1920px × 1080px  
// - Internal resolution: 1920px × 1080px
// - Canvas attributes: width="1920" height="1080"
```

**Why does `scale` default to `devicePixelRatio`?**

This produces high-quality images on high-DPI screens (like Retina displays). If you don't need the extra quality or want to control the exact output dimensions, set `scale: 1`.

## Image Handling

Options that control how images are processed and loaded.

| Option Name | Default | Description | Example |
| ----------- | :-----: | ----------- | ------- |
| customIsSameOrigin | `null` | Custom function to determine if an image URL is same-origin. Accepts two parameters: `(src: string, oldFn: (src: string) => boolean) => boolean \| Promise<boolean>` where `src` is the image URL and `oldFn` is the default same-origin check function | See examples below |
| imageSmoothing | `true` | Whether to apply smoothing to images. Set to `false` for pixel-perfect rendering of pixel art, sprites, and low-res images. Also respects CSS `image-rendering` property | `false` |
| imageSmoothingQuality | browser default | Quality level for image smoothing when `imageSmoothing` is enabled: `'low'`, `'medium'`, or `'high'`. Higher quality may be slower for large images | `'high'` |
| imageTimeout | `15000` | Timeout for loading an image (in milliseconds). Set to `0` to disable timeout | `30000` |
| proxy | `null` | Url to the [proxy](./proxy) which is to be used for loading cross-origin images. If left empty, cross-origin images won't be loaded | `"https://proxy.example.com/"` |
| useCORS | `false` | Whether to attempt to load images from a server using CORS | `true` |

## Rendering Control

Options that control how the content is rendered to the canvas.

| Option Name | Default | Description | Example |
| ----------- | :-----: | ----------- | ------- |
| foreignObjectRendering | `false` | Whether to use ForeignObject rendering if the browser supports it | `true` |
| ignoreElements | `(element) => false` | Predicate function which removes the matching elements from the render | `(el) => el.classList.contains('no-capture')` |
| iframeContainer | `null` | Custom parent node for the temporary iframe container. Useful for Shadow DOM scenarios. If not provided, will auto-detect Shadow Root or use `document.body` | `document.querySelector('#my-shadow-host').shadowRoot` |
| onclone | `null` | Callback function which is called when the Document has been cloned for rendering, can be used to modify the contents that will be rendered without affecting the original source document | `(doc) => doc.querySelector('.date').textContent = new Date().toISOString()` |
| x | `Element` x-offset | Crop canvas x-coordinate | `10` |
| y | `Element` y-offset | Crop canvas y-coordinate | `20` |
| scrollX | `Element` scrollX | The x-scroll position to use when rendering element (for example if the Element uses `position: fixed`) | `0` |
| scrollY | `Element` scrollY | The y-scroll position to use when rendering element (for example if the Element uses `position: fixed`) | `100` |
| windowWidth | `Window.innerWidth` | Window width to use when rendering `Element`, which may affect things like Media queries | `1920` |
| windowHeight | `Window.innerHeight` | Window height to use when rendering `Element`, which may affect things like Media queries | `1080` |

## Element Exclusion

If you wish to exclude certain `Element`s from getting rendered, you can add a `data-html2canvas-ignore` attribute to those elements and html2canvas-pro will exclude them from the rendering.

```html
<div>
  This will be rendered
  <div data-html2canvas-ignore>This will NOT be rendered</div>
</div>
```

## Content-Security-Policy (CSP)

### CSP Nonce

```javascript
import html2canvas from 'html2canvas-pro';

html2canvas.setCspNonce(document.querySelector('meta[name="csp-nonce"]').nonce);
```

## Custom isSameOrigin Usage

The `customIsSameOrigin` option allows you to override the default same-origin detection logic, which is particularly useful in the following scenarios:

1. **Handling redirects**: When an image URL from your domain redirects to an external domain
2. **CDN configurations**: When your content is served from multiple domains or CDNs
3. **Force CORS mode**: When you want to force all images to use CORS regardless of origin

### Basic Usage

```typescript
html2canvas(element, {
    useCORS: true,
    customIsSameOrigin: (src, oldFn) => {
        // If old logic thinks it's not same origin, certainly it's not
        if (!oldFn(src)) {
            return false;
        }
        // Otherwise, we need to check if it's a redirect url
        const targetUrl = new URL(src);
        const pathname = targetUrl.pathname;
        // You can replace it with any logic you want. Including but not limited to: using regular expressions, using asynchronous validation logic
        // Here we simply suppose your biz url starts with /some-redirect-prefix and treat it as a redirect url just for example
        return !pathname.startsWith('/some-redirect-prefix');
    },
    // any other options...
});
```

### Async Validation

The function can also return a Promise for asynchronous validation:

```typescript
html2canvas(element, {
    useCORS: true,
    customIsSameOrigin: async (src, oldFn) => {
        // You could check against an API that knows which URLs will redirect
        const response = await fetch('/api/check-redirect?url=' + encodeURIComponent(src));
        const data = await response.json();
        return !data.willRedirect;
    },
    // any other options...
});
```

### Force All Images to Use CORS

You can use it to force all images to use CORS mode:

```typescript
html2canvas(element, {
    useCORS: true,
    customIsSameOrigin: (src, oldFn) => false, // Always report as not same origin
    // any other options...
});
```

## Shadow DOM Support

The `iframeContainer` option allows you to specify where the temporary iframe should be created. This is particularly useful when rendering elements inside Shadow DOM, as styles defined within the Shadow Root need to be accessible to the cloned content.

### Automatic Detection

By default, html2canvas-pro will automatically detect if the target element is inside a Shadow Root and use it as the iframe container:

```javascript
// Element inside Shadow DOM
const shadowHost = document.querySelector('#my-web-component');
const shadowRoot = shadowHost.shadowRoot;
const elementInShadow = shadowRoot.querySelector('.content');

// Auto-detection: iframe will be created inside the Shadow Root
html2canvas(elementInShadow).then(canvas => {
    document.body.appendChild(canvas);
});
```

### Manual Configuration

You can also explicitly specify the iframe container:

```javascript
const shadowHost = document.querySelector('#my-web-component');
const shadowRoot = shadowHost.shadowRoot;
const elementInShadow = shadowRoot.querySelector('.content');

html2canvas(elementInShadow, {
    iframeContainer: shadowRoot  // Explicitly use Shadow Root
}).then(canvas => {
    document.body.appendChild(canvas);
});
```

### Use Cases

1. **Web Components with Shadow DOM**: When capturing custom elements that use Shadow DOM
2. **Scoped Styles**: When the element has styles defined in `<style>` tags within the Shadow Root
3. **Slot Content**: When rendering slotted content that depends on Shadow DOM styles

## Complete Example

Here's a complete example using multiple configuration options:

```typescript
html2canvas(document.getElementById('capture'), {
    scale: 2, // 2x scale for higher resolution
    useCORS: true,
    backgroundColor: '#f5f5f5',
    logging: false,
    imageTimeout: 30000,
    ignoreElements: (element) => {
        return element.classList.contains('do-not-capture');
    },
    onclone: (clonedDoc) => {
        // Modify the cloned document before rendering
        const timestamp = clonedDoc.getElementById('timestamp');
        if (timestamp) {
            timestamp.textContent = new Date().toLocaleString();
        }
    }
}).then(canvas => {
    // Use the resulting canvas
    document.body.appendChild(canvas);
    
    // Or convert to image
    const image = canvas.toDataURL('image/png');
    // Do something with the image...
});
```

## Backward Compatibility

html2canvas-pro keeps existing usage working where possible:

- **Element input**: Besides real `HTMLElement` instances, any object with `ownerDocument` and `ownerDocument.defaultView` is accepted (e.g. element-like mocks or cross-realm references). Validation still requires the element to be attached to a document and window.
- **Numeric options**: Options that expect numbers (`scale`, `width`, `height`, `imageTimeout`, `x`, `y`, `windowWidth`, `windowHeight`, `scrollX`, `scrollY`) accept string numbers and are coerced before validation. For example `scale: "2"` or `width: "800"` from forms or query params will work.
- **Minimal window**: If the element’s `defaultView` does not provide `innerWidth`, `innerHeight`, `pageXOffset`, or `pageYOffset`, sensible defaults (e.g. 800×600, scroll 0) are used so rendering does not produce NaN.
- **Deprecated but supported**: `html2canvas.setCspNonce(nonce)` and the global `setDefaultConfig` / `getDefaultConfig` are deprecated; use the `cspNonce` option and per-call config instead. The old APIs still work for now.
- **DOM normalization**: The default remains `normalizeDom: true` (disable animations / reset transforms during capture). Set `normalizeDom: false` only if you need to preserve the original DOM state.
