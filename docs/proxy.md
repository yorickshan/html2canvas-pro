# Proxy

html2canvas-pro cannot bypass content policy restrictions set by your browser. Drawing images from outside
the origin of the current page taints the canvas they are drawn on. Once tainted, the canvas can no longer
be read. To load images that reside outside of your page's origin, you can use a proxy.

## Available proxies

 - [node.js](https://github.com/niklasvh/html2canvas-proxy-nodejs) (community maintained)
