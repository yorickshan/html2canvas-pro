# html2canvas-pro

> A fork of [niklasvh/html2canvas](https://github.com/niklasvh/html2canvas) with some new features.

## 🌟 Why html2canvas-pro?

html2canvas-pro has several advantages over html2canvas, including:
- support color function "oklch"
- Support object-fit of ```<img/>```

## Install & Usage

```sh
npm install html2canvas-pro
pnpm / yarn add html2canvas-pro
```

```javascript
import html2canvas from 'html2canvas-pro';
```

To render an `element` with html2canvas with some (optional) [options](/configuration/), simply call `html2canvas(element, options);`

```javascript
html2canvas(document.body).then(function(canvas) {
    document.body.appendChild(canvas);
});
```

## Contribution

If you want to add some features, feel free to submit PR.

## License

[MIT](LICENSE).