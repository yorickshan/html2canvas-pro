# Why html2canvas-pro

html2canvas-pro has several advantages over the original html2canvas, including:

## Color Functions
- support color function `color()` (including relative colors)
- support color function `lab()`
- support color function `lch()`
- support color function `oklab()`
- support color function `oklch()`

## Layout & Rendering
- **`clip-path` support** — `inset()`, `rect()`, `xywh()`, `circle()`, `ellipse()`, `polygon()`, `path()`
- **`mask-image` support** — alpha masks with position / size / repeat, composited on a dedicated surface
- **`backdrop-filter: blur()`** — frosted-glass captures (see [Backdrop-filter support](./features#backdrop-filter-support))
- **`background-clip: text`** — gradient text rendered on a device-pixel surface, sharp at any `devicePixelRatio`
- **Complete gradient family** — `linear-gradient()`, `radial-gradient()`, `conic-gradient()` and all `repeating-*` variants
- **`object-fit` support** for `<img/>`
- **`writing-mode` support** — horizontal-tb, vertical-rl, vertical-lr
- **Image smoothing control** — CSS `image-rendering` property + `imageSmoothing`/`imageSmoothingQuality` options
- **Faithful box-shadows** — inset shadows, blur/border-radius scaling, and shadows that follow transformed ancestors ([v2.4.5](https://github.com/yorickshan/html2canvas-pro/blob/main/CHANGELOG.md))
- **Filter compositing** — eligible layers render `blur()` / `drop-shadow()` on a dedicated surface with correct layer `opacity`; see [filter support notes](./filter-support)
- **Counters & quotes** — `counter-increment` / `counter-reset` and the `quotes` property for `content`

## DOM Coverage
- **Shadow DOM & Web Components** — slot assignment, shadow-root cloning, and automatic iframe placement inside the shadow root
- **Custom elements** — shadow roots and attributes are preserved in clones
- **Fieldset & legend** — legend bounds are centered like the browser does
- **CJK text** — correct alphabetic baseline with `letter-spacing`, and `white-space` aware textarea wrapping

## Developer Experience
- **Security validation** — Built-in `Validator` API for XSS/SSRF protection
- **Performance monitoring** — Built-in `PerformanceMonitor` API for metrics collection
- **Error, progress & cancellation hooks** — `onError` callback, `onProgress` pipeline milestones and `AbortSignal` cancellation
- **TypeScript** — First-class type definitions included
- **Vitest** — Modern test runner for faster testing

## Performance
- Deferred CSS parsing with LRU caches
- Batched, parallel image preloading
- Native canvas filter fast path with a verified SVG fallback

## Bug Fixes
Fixed some [issues](https://github.com/yorickshan/html2canvas-pro/blob/main/CHANGELOG.md) from the original project.
