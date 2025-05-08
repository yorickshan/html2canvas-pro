# Configuration

These are all of the available configuration options.

| Name          | Default  | Description |
| ------------- | :------: | ----------- |
| allowTaint | `false` | Whether to allow cross-origin images to taint the canvas
| backgroundColor | `#ffffff` | Canvas background color, if none is specified in DOM. Set `null` for transparent
| canvas | `null` | Existing `canvas` element to use as a base for drawing on
| customIsSameOrigin | `null` | Custom function to determine if an image URL is same-origin. Accepts two parameters: `(src: string, oldFn: (src: string) => boolean) => boolean | Promise<boolean>` where `src` is the image URL and `oldFn` is the default same-origin check function.
| foreignObjectRendering | `false` | Whether to use ForeignObject rendering if the browser supports it
| imageTimeout | `15000` | Timeout for loading an image (in milliseconds). Set to `0` to disable timeout.
| ignoreElements | `(element) => false` | Predicate function which removes the matching elements from the render.
| logging | `true` | Enable logging for debug purposes
| onclone | `null` | Callback function which is called when the Document has been cloned for rendering, can be used to modify the contents that will be rendered without affecting the original source document.
| proxy | `null` | Url to the [proxy](./proxy) which is to be used for loading cross-origin images. If left empty, cross-origin images won't be loaded.
| removeContainer | `true` | Whether to cleanup the cloned DOM elements html2canvas-pro creates temporarily
| scale | `window.devicePixelRatio` | The scale to use for rendering. Defaults to the browsers device pixel ratio.
| useCORS | `false` | Whether to attempt to load images from a server using CORS
| width | `Element` width | The width of the `canvas`
| height | `Element` height | The height of the `canvas`
| x | `Element` x-offset | Crop canvas x-coordinate
| y | `Element` y-offset| Crop canvas y-coordinate
| scrollX | `Element` scrollX | The x-scroll position to used when rendering element, (for example if the Element uses `position: fixed`)
| scrollY | `Element` scrollY | The y-scroll position to used when rendering element, (for example if the Element uses `position: fixed`)
| windowWidth | `Window.innerWidth` | Window width to use when rendering `Element`, which may affect things like Media queries
| windowHeight | `Window.innerHeight` | Window height to use when rendering `Element`, which may affect things like Media queries

If you wish to exclude certain `Element`s from getting rendered, you can add a `data-html2canvas-ignore` attribute to those elements and html2canvas-pro will exclude them from the rendering.

### Custom isSameOrigin usage

The `customIsSameOrigin` option allows you to override the default same-origin detection logic, which is particularly useful in the following scenarios:

1. **Handling redirects**: When an image URL from your domain redirects to an external domain
2. **CDN configurations**: When your content is served from multiple domains or CDNs
3. **Force CORS mode**: When you want to force all images to use CORS regardless of origin

#### Basic usage

```typescript
html2canvas(element, {
    useCORS: true,
    customIsSameOrigin: (src, oldFn) => {
        // If old logic think it's not same origin, certainly it's not
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
    // any other options..
});
```

#### Async validation

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
    // any other options..
});
```

#### Force all images to use CORS

You can use it to force all images to use CORS mode:

```typescript
html2canvas(element, {
    useCORS: true,
    customIsSameOrigin: (src, oldFn) => false, // Always report as not same origin
    // any other options..
});
```
