# Why html2canvas-pro

html2canvas-pro has several advantages over the original html2canvas, including:

## Color Functions
- support color function `color()` (including relative colors)
- support color function `lab()`
- support color function `lch()`
- support color function `oklab()`
- support color function `oklch()`

## Layout & Rendering
- **`clip-path` support** — `inset()`, `circle()`, `ellipse()`, `polygon()`, `path()`
- **`object-fit` support** for `<img/>`
- **`writing-mode` support** — horizontal-tb, vertical-rl, vertical-lr
- **Image smoothing control** — CSS `image-rendering` property + `imageSmoothing`/`imageSmoothingQuality` options

## Developer Experience
- **Security validation** — Built-in `Validator` API for XSS/SSRF protection
- **Performance monitoring** — Built-in `PerformanceMonitor` API for metrics collection
- **TypeScript** — First-class type definitions included
- **Vitest** — Modern test runner for faster testing

## Bug Fixes
Fixed some [issues](https://github.com/yorickshan/html2canvas-pro/blob/main/CHANGELOG.md) from the original project.
