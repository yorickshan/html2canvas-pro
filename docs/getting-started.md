# Getting Started

## Installing

You can install `html2canvas-pro` through npm or [download a built release](https://github.com/yorickshan/html2canvas-pro/releases).

```sh
npm install html2canvas-pro
pnpm / yarn add html2canvas-pro
```

## Usage

```javascript
import html2canvas from 'html2canvas-pro';
```

To render an `element` with html2canvas-pro with some (optional) [options](./configuration), simply call `html2canvas(element, options);`

```javascript
html2canvas(document.body).then(function(canvas) {
    document.body.appendChild(canvas);
});
```
