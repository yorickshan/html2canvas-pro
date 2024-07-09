# Getting Started

## Installing

You can install `html2canvas-pro` through npm or [download a built release](https://github.com/yorickshan/html2canvas-pro/releases).

### npm

    npm install html2canvas-pro

```javascript
import html2canvas from 'html2canvas-pro';
```
    
## Usage

To render an `element` with html2canvas with some (optional) [options](./configuration), simply call `html2canvas(element, options);`

```javascript
html2canvas(document.body).then(function(canvas) {
    document.body.appendChild(canvas);
});
```
