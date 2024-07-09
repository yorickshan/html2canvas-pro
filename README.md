# html2canvas-pro

[![npm version](https://badgen.net/npm/v/html2canvas-pro)](https://npm.im/html2canvas-pro) [![npm downloads](https://badgen.net/npm/dm/html2canvas-pro)](https://npm.im/html2canvas-pro)

> A fork of [niklasvh/html2canvas](https://github.com/niklasvh/html2canvas) with some fixes and new features.
>
> If you found this helpful, don't forget to leave a star. 😄

## 🌟 Why html2canvas-pro?

html2canvas-pro has several advantages over html2canvas, including:
- support color function ```color()``` (including relative colors)
- support color function ```lab()```
- support color function ```lch()```
- support color function ```oklab()```
- support color function ```oklch()```
- Support object-fit of ```<img/>```
- Fixed some known [issues](./CHANGELOG.md)

## Installation

```sh
npm install html2canvas-pro
pnpm / yarn add html2canvas-pro
```

## Usage
```javascript
import html2canvas from 'html2canvas-pro';
```

To render an `element` with html2canvas with some (optional) [options](/docs/configuration.md), simply call `html2canvas(element, options);`

```javascript
html2canvas(document.body).then(function(canvas) {
    document.body.appendChild(canvas);
});
```

## Contribution

If you want to add some features, feel free to submit PR.

## License

[MIT](LICENSE).
