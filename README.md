<p align="center">
<img src="https://raw.githubusercontent.com/yorickshan/html2canvas-pro/main/docs/public/logo.png" height="150">
</p>
<h1 align="center">
html2canvas-pro
</h1>
<p align="center">
Next generation JavaScript screenshots tool.
<p>
<p align="center">
  <a href="https://github.com/yorickshan/html2canvas-pro/actions/workflows/ci.yml"><img src="https://github.com/yorickshan/html2canvas-pro/actions/workflows/ci.yml/badge.svg?branch=main" alt="build status"></a>
  <a href=https://npm.im/html2canvas-pro><img src="https://badgen.net/npm/v/html2canvas-pro" alt="npm version"></a>
  <a href=http://npm.im/html2canvas-pro><img src="https://badgen.net/npm/dm/html2canvas-pro" alt="npm downloads"></a>
  <a href="https://www.jsdelivr.com/package/npm/html2canvas-pro"><img src="https://data.jsdelivr.com/v1/package/npm/html2canvas-pro/badge" /></a>
<p>
<p align="center">
 <a href="https://yorickshan.github.io/html2canvas-pro/">Documentation</a> | <a href="https://yorickshan.github.io/html2canvas-pro/getting-started.html">Getting Started</a>
</p>
<br>

## Why html2canvas-pro?

html2canvas-pro is a fork of [niklasvh/html2canvas](https://github.com/niklasvh/html2canvas) that includes various fixes and new features. It offers several advantages over the original html2canvas, such as:
- support color function ```color()``` (including relative colors)
- support color function ```lab()```
- support color function ```lch()```
- support color function ```oklab()```
- support color function ```oklch()```
- Support object-fit of ```<img/>```
- Fixed some [issues](./CHANGELOG.md)

If you found this helpful, don't forget to
leave a star 🌟.

## Installation

```sh
npm install html2canvas-pro
pnpm / yarn add html2canvas-pro
```

## Usage
```javascript
import html2canvas from 'html2canvas-pro';
```

To render an `element` with html2canvas-pro with some (optional) [options](/docs/configuration.md), simply call `html2canvas(element, options);`

```javascript
html2canvas(document.body).then(function(canvas) {
    document.body.appendChild(canvas);
});
```

## Contribution

If you want to add some features, feel free to submit PR.

## License

[MIT](LICENSE).
