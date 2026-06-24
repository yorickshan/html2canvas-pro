# About

Before you get started with the script, there are a few things that are good to know regarding the 
script and some of its limitations.

## Introduction
The script lets you capture "screenshots" of web pages or parts of them, directly in the user's browser.
The screenshot is DOM-based and therefore may not be 100% accurate — it renders a representation
from the information available on the page, not a true pixel-level screenshot.

## How it works
The script traverses the DOM of the page it is loaded on. It gathers information on every element,
which it then uses to build a visual representation. It does not actually capture the screen —
instead, it reconstructs the page based on the CSS properties it finds in the DOM.
            
            
As a result, it is only able to render correctly properties that it understands, meaning there are many 
CSS properties which do not work. For a full list of supported CSS properties, check out the 
[supported features](./features) page.

## Limitations
All images that the script uses must reside within the [same origin](http://en.wikipedia.org/wiki/Same_origin_policy)
for it to read them without a [proxy](./proxy). Similarly, any other `canvas`
elements on the page that have been tainted with cross-origin content will become dirty and cannot be read by html2canvas-pro.

The script doesn't render plugin content such as Flash or Java applets.

## Browser compatibility

The library works on all modern evergreen browsers (Chrome, Firefox, Safari, Edge). Specifically tested on:

- Google Chrome (latest)
- Firefox 54+
- Safari 10.1+
- Edge (latest)

**Node.js:** Requires Node.js >=16.0.0 for development and build tooling.
