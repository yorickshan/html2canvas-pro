# Proxy

html2canvas-pro cannot bypass content policy restrictions set by your browser. Drawing images from outside
the origin of the current page taints the canvas they are drawn on. Once tainted, the canvas can no longer
be read. To load images that reside outside of your page's origin, you can use a proxy.

## The built-in development proxy

This repository ships a small Express proxy used by the test suite
(`tests/proxy.cjs`, mounted at `/proxy` by `tests/server.ts`). It is intended
for local development and CI — it fetches same-protocol `http` URLs, passes
them through with permissive CORS, and does **not** implement rate limiting,
caching, or access control beyond localhost binding. Do not expose it to the
public internet as-is.

To reuse it in your own dev server (copy the file into your project — the
npm package ships only `dist/`):

```js
const proxy = require('./proxy.cjs'); // copied from tests/proxy.cjs
app.use('/proxy', proxy());
```

Then point html2canvas-pro at it:

```js
html2canvas(element, { proxy: 'http://localhost:8081/proxy' });
```

## Other options

- **[html2canvas-proxy-nodejs](https://github.com/niklasvh/html2canvas-proxy-nodejs)** — the
  standalone proxy from the original html2canvas project (community maintained, largely
  dormant; prefer the built-in one above for new work).
- **Your own backend** — any endpoint that fetches a URL and echoes the bytes with
  `Access-Control-Allow-Origin: *` works. Constrain the hosts it will fetch so it cannot
  be abused as an open relay.
- **CORS-enabled image hosts** — when the source server already sends CORS headers,
  `useCORS: true` needs no proxy at all.
