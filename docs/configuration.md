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
| scale | `window.devicePixelRatio` | The scale to use for rendering. Defaults to the browser's device pixel ratio | `2` |
| width | `Element` width | The width of the `canvas` | `1200` |
| height | `Element` height | The height of the `canvas` | `800` |

## Image Handling

Options that control how images are processed and loaded.

| Option Name | Default | Description | Example |
| ----------- | :-----: | ----------- | ------- |
| customIsSameOrigin | `null` | Custom function to determine if an image URL is same-origin. Accepts two parameters: `(src: string, oldFn: (src: string) => boolean) => boolean \| Promise<boolean>` where `src` is the image URL and `oldFn` is the default same-origin check function | See examples below |
| imageTimeout | `15000` | Timeout for loading an image (in milliseconds). Set to `0` to disable timeout | `30000` |
| proxy | `null` | Url to the [proxy](./proxy) which is to be used for loading cross-origin images. If left empty, cross-origin images won't be loaded | `"https://proxy.example.com/"` |
| useCORS | `false` | Whether to attempt to load images from a server using CORS | `true` |

## Rendering Control

Options that control how the content is rendered to the canvas.

| Option Name | Default | Description | Example |
| ----------- | :-----: | ----------- | ------- |
| foreignObjectRendering | `false` | Whether to use ForeignObject rendering if the browser supports it | `true` |
| ignoreElements | `(element) => false` | Predicate function which removes the matching elements from the render | `(el) => el.classList.contains('no-capture')` |
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
