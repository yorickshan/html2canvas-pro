<p align="center">
<img src="https://raw.githubusercontent.com/yorickshan/html2canvas-pro/main/docs/public/logo.png" height="150">
</p>
<h1 align="center">
html2canvas-pro
</h1>
<p align="center">
Next generation JavaScript screenshot tool.
</p>
<p align="center">
  <a href="https://github.com/yorickshan/html2canvas-pro/actions/workflows/ci.yml"><img src="https://github.com/yorickshan/html2canvas-pro/actions/workflows/ci.yml/badge.svg?branch=main" alt="build status"></a>
	  <a href="https://npm.im/html2canvas-pro"><img src="https://badgen.net/npm/v/html2canvas-pro" alt="npm version"></a>
	  <a href="http://npm.im/html2canvas-pro"><img src="https://badgen.net/npm/dm/html2canvas-pro" alt="npm downloads"></a>
  <a href="https://www.jsdelivr.com/package/npm/html2canvas-pro"><img src="https://data.jsdelivr.com/v1/package/npm/html2canvas-pro/badge" /></a>
  <a href="https://deepwiki.com/yorickshan/html2canvas-pro"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>
<p align="center">
  <a href="https://yorickshan.github.io/html2canvas-pro/getting-started.html">Getting Started</a> ·
  <a href="https://yorickshan.github.io/html2canvas-pro/configuration.html">Configuration</a> ·
  <a href="https://yorickshan.github.io/html2canvas-pro/features.html">Features</a> ·
  <a href="https://yorickshan.github.io/html2canvas-pro/faq.html">FAQ</a>
</p>
<br>

## Why html2canvas-pro?

html2canvas-pro is a fork of [niklasvh/html2canvas](https://github.com/niklasvh/html2canvas) that includes various fixes and new features. It offers several advantages over the original html2canvas:

**Modern CSS support**
- Color functions `color()` (incl. relative colors), `lab()`, `lch()`, `oklab()`, `oklch()` — other functions resolve through the browser's computed styles
- `background-clip: text` support
- `mix-blend-mode` and `background-blend-mode` support
- `object-fit` support for `<img/>`
- CSS `clip-path` support (inset, rect, xywh, circle, ellipse, polygon, path)
- CSS `writing-mode` support (horizontal-tb, vertical-rl, vertical-lr)
- `mask-image` alpha masks with position/size/repeat (see [mask support](docs/features.md#mask-support))
- `backdrop-filter: blur()` for frosted-glass captures (see [backdrop-filter support](docs/features.md#backdrop-filter-support))
- `conic-gradient()`, `repeating-conic-gradient()` and `repeating-radial-gradient()` — complete gradient family
- `text-emphasis` (CJK emphasis marks), `-webkit-box-reflect`, `image-set()`, `border-image-outset` / `border-image-width`
- `accent-color`, `outline`, `-webkit-text-fill-color`, `isolation`
- `filter` compositing for eligible layers — `blur()` / `drop-shadow()` rendered on a dedicated surface with correct layer `opacity` (see [filter support notes](docs/filter-support.md))
- Faithful `box-shadow` rendering, including inset shadows, blur scaling, and shadows through transformed ancestors
- `image-rendering` CSS property plus `imageSmoothing` / `imageSmoothingQuality` options for pixel-perfect output
- Border image, counters & quotes, `direction`, `line-height`, `transform-origin`, and more — see the full [feature list](docs/features.md)

**Developer experience**
- **Security validation** — Built-in input validation (`Validator` API, XSS/SSRF protection)
- **Performance monitoring** — Built-in `PerformanceMonitor` with per-phase timings
- **Error, progress & cancellation hooks** — `onError` for failed resources, `onProgress` for pipeline milestones (incl. per-batch image preload progress), `AbortSignal` cancellation
- **TypeScript** — First-class type definitions included
- **Shadow DOM & Web Components** — slot assignment, shadow-root cloning, and automatic iframe placement

**Performance**
- Deferred (batched, parallel) image preloading
- LRU caches for CSS parsing and gradient patterns
- Native canvas filter fast path with verified SVG fallback

**Render speed** — html2canvas-pro(latest) vs html2canvas 1.4.1, headless Chromium on Apple M4, `scale: 1`, median of 10 interleaved runs ([benchmark script](scripts/benchmarks/render.bench.mjs), reproduce with `corepack pnpm bench:render`):

| Fixture | html2canvas-pro | html2canvas 1.4.1 |
| --- | --- | --- |
| Simple document (~40 elements) | **80 ms** | 87 ms |
| Large document (~1200 elements) | **295 ms** | 468 ms |
| Modern-CSS page (`oklch()`, `conic-gradient()`, …) | **166 ms** | ✗ cannot render (throws on `oklch()`) |

On element-heavy pages html2canvas-pro is ~1.6× faster, and it is the only one of the two that can render modern-CSS content at all. Absolute times vary by machine — compare ratios, not milliseconds.

If you found this helpful, don't forget to
leave a star 🌟.

## Installation

```sh
npm install html2canvas-pro
pnpm add html2canvas-pro
yarn add html2canvas-pro
```

## Usage

```javascript
import html2canvas from 'html2canvas-pro';
```

To render an `element` with html2canvas-pro with some (optional) [options](docs/configuration.md), simply call `html2canvas(element, options);`

### Basic Example

```javascript
html2canvas(document.body).then(function(canvas) {
    document.body.appendChild(canvas);
});
```

### Script tag / CDN

A browser bundle is also available (exposes the global `window.html2canvas`):

```html
<script src="https://cdn.jsdelivr.net/npm/html2canvas-pro/dist/html2canvas-pro.min.js"></script>
<script>
  html2canvas(document.body).then((canvas) => document.body.appendChild(canvas));
</script>
```

### Controlling Output Dimensions

⚠️ **Important**: By default, the output canvas dimensions are affected by `devicePixelRatio`.

```javascript
// If you need exact pixel dimensions (e.g., for a specific file size):
html2canvas(element, {
    width: 1920,
    height: 1080,
    scale: 1  // Set scale to 1 for exact dimensions
}).then(canvas => {
    // Canvas will be exactly 1920×1080 pixels
    const dataURL = canvas.toDataURL('image/png');
});
```

See the [Configuration Guide](docs/configuration.md#canvas-dimensions) for more details.

### Error Handling & Cancellation

```javascript
const controller = new AbortController();

html2canvas(element, {
    useCORS: true,
    onError: (error) => {
        // Called when a resource (image, font, …) fails to load.
        // The render continues — this is a notification hook, not an abort.
        console.warn('Resource failed:', error);
    },
    signal: controller.signal // Rejects with an AbortError when aborted
}).then(canvas => {
    document.body.appendChild(canvas);
});

// Cancel an in-progress capture:
controller.abort();
```

### Pixel-Perfect Capture

```javascript
html2canvas(element, {
    imageSmoothing: false,       // Disable anti-aliasing globally
    scale: 2                     // Upscale without blur
});
// Or per-element via CSS: style="image-rendering: pixelated"
```

## API

The package exports `html2canvas` (default), plus the following named exports:

| Export | Description |
| --- | --- |
| `html2canvas` | Render an element to a `<canvas>` |
| `Html2CanvasConfig` | Per-call runtime config (CSP nonce, shared cache) |
| `Validator` / `createDefaultValidator` | Input validation (URLs, proxy allow-list, element checks) |
| `PerformanceMonitor` | Phase-level timing metrics |
| `Options` | The full options type |
| `ConfigOptions` | Per-call runtime config type (CSP nonce, shared cache) |
| `ValidationResult` | Result type returned by the `Validator` API |

Full type definitions ship with the package — your editor's IntelliSense covers every option. An HTML API reference can be generated locally with `corepack pnpm docs:api` (TypeDoc).

## Documentation

The full documentation site lives at [yorickshan.github.io/html2canvas-pro](https://yorickshan.github.io/html2canvas-pro/):

- [Getting Started](docs/getting-started.md) — installation, usage, live demo
- [Configuration](docs/configuration.md) — every option with defaults and examples
- [Features](docs/features.md) — supported CSS properties and values
- [Proxy](docs/proxy.md) — cross-origin image handling
- [FAQ](docs/faq.md) — canvas size, tainted canvas, browser limits
- [Architecture](docs/ARCHITECTURE.md) — how the rendering pipeline works

## Development

The project uses [pnpm](https://pnpm.io) (the version is pinned via the `packageManager` field — Corepack handles it automatically). Unit tests require **Node.js 24** (jsdom 30).

```sh
corepack pnpm install
corepack pnpm build          # tsc + Rolldown bundles (CJS/ESM/UMD)
corepack pnpm unittest       # Vitest unit tests
corepack pnpm test           # lint + unit tests + browser (Karma) tests
corepack pnpm docs:dev       # VitePress dev server
corepack pnpm docs:api       # Generate the TypeDoc API reference
```

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for the full guide, including how to add a new CSS property.

## Contribution

If you'd like to add a feature, feel free to submit a PR.

Interested in becoming a maintainer? Open an [issue](https://github.com/yorickshan/html2canvas-pro/issues) or reach out to [@yorickshan](https://github.com/yorickshan).

## License

[MIT](LICENSE)
