# CSS filters and layer opacity

This page describes the limited surface-compositing implementation in PR #239. It is not a claim that the published 2.4.3 release already has these fixes, or that every CSS filter chain matches the browser compositor. The public `html2canvas(element, options)` API is unchanged.

## Supported combinations

For an eligible stacking context, the renderer captures the complete subtree, applies its filter, and then composites its CSS `opacity` once. This avoids applying the parent's opacity separately to overlapping children.

The surface path supports **at most one blur followed by at most one drop shadow**, with either function optional:

| CSS on the layer | Surface path | Notes |
| --- | --- | --- |
| `opacity: 0.5; filter: none` | Supported | Opacity-only composition; no filter capability probe or SVG encoding. |
| `filter: blur(5px)` | Supported | One blur; an additional CSS `opacity` property is allowed. |
| `filter: drop-shadow(-12px 8px 6px rgba(0, 0, 0, 0.6))` | Supported | One shadow, signed offsets and a parsed color. |
| `filter: blur(5px) drop-shadow(-12px 8px 6px rgba(0, 0, 0, 0.6)); opacity: 0.5` | Supported | Blur first, shadow second, layer opacity last. |
| `filter: blur(5px) brightness(2)` | Previous renderer | The entire chain is outside the surface subset; brightness is not silently removed. |
| `filter: drop-shadow(0px 2px 4px black) blur(5px)` | Previous renderer | Reversed order is not supported by the surface path. |
| `filter: blur(2px) blur(3px)` | Previous renderer | Repeated blur functions are not combined by this implementation. |
| `filter: drop-shadow(0px 2px 4px black) drop-shadow(8px 0px 2px red)` | Previous renderer | Multiple CSS drop shadows are outside the subset. |
| `filter: opacity(0.5)` | Previous renderer | The filter function is not the CSS `opacity` property. |
| `filter: url(#my-filter)` | Previous renderer | Arbitrary SVG filter references are outside the subset. |

The CSS descriptor preserves filter syntax, units and functional colors. The separate internal `parseSimpleFilter` helper recognizes this subset from **computed CSS**, whose supported lengths are in pixels. It is not a public parser for arbitrary authored CSS. Browser-resolved values are what matter; an authored relative length is not the same as passing an unresolved `blur(2em)` string to that helper.

Nonzero `blur(5)` is invalid CSS and is not repaired by appending `px`. Valid `blur(0)`, `blur(0px)` and `blur()` are no-op cases after browser computation. Invalid CSS declarations are handled by the browser before capture and may leave a previous valid declaration in effect.

## A supported example

```html
<div id="example" style="position:relative;width:280px;height:220px">
  <div style="position:absolute;inset:0;opacity:0.5;
              filter:blur(4px) drop-shadow(-18px 8px 8px rgba(0,0,0,0.6))">
    <div style="position:absolute;left:80px;top:80px;
                width:80px;height:60px;background:#176b70"></div>
    <div style="position:absolute;left:120px;top:80px;
                width:80px;height:60px;background:#176b70"></div>
  </div>
</div>
```

```js
const canvas = await html2canvas(document.getElementById('example'), {
    scale: 1,
    backgroundColor: null
});
document.body.appendChild(canvas);
```

The two opaque children are assembled before the layer's 50% opacity is applied. The interior overlap remains approximately alpha 128/255; it does not become darker merely because multiple child draws overlap. The regression fixture checks actual pixels rather than only successful completion.

## Subtree restrictions

A supported filter string alone is not enough. Eligibility checks the candidate subtree and relevant ancestors up to the active surface boundary. The surface path is not used when those checks encounter a transform (including individual rotation), `zoom` other than 1, non-normal `mix-blend-mode`, a non-`none` `clip-path`, `display: list-item`, or an unsupported filter chain.

This restriction applies even to a layer with only CSS opacity. An unsupported ancestor or descendant can prevent that layer from using surface composition. It does not mean these CSS properties are unsupported everywhere in the library; their existing rendering paths remain available. Nested eligible filter/opacity layers, ordinary ancestor clipping and signed filter outsets have focused regression coverage.

Several `box-shadow` values are not the same as several `filter: drop-shadow(...)` functions. The former have dedicated source-painting tests; the latter remain outside this surface subset.

## Two different fallback decisions

### Native Canvas to SVG: keep surface composition

For an eligible filtered layer, a cached runtime pixel probe checks that Canvas can actually render blur and a colored semitransparent shadow. Browser names and the existence of a `filter` property alone are not used as proof of support.

When the probe succeeds, the native path filters at alpha 1 and applies layer opacity in a separate pass. When native filtering is unavailable, or a native allocation/assignment/draw fails recoverably, the renderer tries the SVG backend on the same completed surface. **Both backends preserve the filter-then-opacity ordering.** SVG is a backend fallback, not a return to per-draw composition. There is no new public option for forcing either backend.

### Surface composition to the previous renderer: limited guarantees

Unsupported filter chains or subtrees remain on the previous rendering path. An eligible surface also returns to that path for the affected subtree when its raster reservation cannot be obtained, or when the remaining SVG path cannot serialize/decode/draw the source. Examples include origin-tainted pixels that cannot be serialized, a CSP that blocks the required data image, and SVG decode failure or timeout.

The previous path **does not gain the surface-compositing guarantees**. Parent opacity may still compound across draws, and filters unavailable in that runtime may be absent. It is not advertised as visually equivalent to either surface backend. Separate CSS parser fixes still apply, so “previous renderer” does not mean byte-identical output to every 2.4.3 capture.

The native backend needs no PNG/SVG data image and can therefore keep surface composition under a CSP that would block the SVG backend. Neither backend clears canvas origin taint. Cancellation remains an `AbortError` instead of being converted into a successful fallback.

## Bounds, performance and known differences

Intermediate surfaces share a 64 MiB RGBA raster reservation, conservatively accounting for four rasters per active surface, with each side capped at 8192 raster pixels. This is not a 64 MiB total browser-memory guarantee and does not include the final output or all encoder/decoder overhead. Higher capture scales increase the raster area. Over-budget subtrees use the previous path before surface allocation, without silently downscaling the image.

The native fast path avoids the expensive PNG/SVG round trip on supported runtimes. SVG remains significantly more costly for some large, high-entropy inputs. See [production native/SVG measurements](./filter-native-fastpath.md) for the protocol, raw-evidence links and unresolved over-budget performance gap. Passing tests does not certify a universal latency target.

In the named nested outside-shadow case, the implementation retains the complete shadow while native WebKit may clip or suppress part of it. The maintainer [accepted documenting this difference](https://github.com/yorickshan/html2canvas-pro/pull/239#issuecomment-5694372459); it is not pixel-equivalent to native WebKit. The [design note](./filter-compositing-draft.md#native-webkit-discrepancy) records the separate regression policy. SVG `overflow: visible` paint bounds are a different, still-unfixed limitation.

## Verification and further reading

The [design note](./filter-compositing-draft.md) links the reproduction and independent DOM-reference regressions. The [native fast-path report](./filter-native-fastpath.md) covers runtime probing, native/SVG comparisons, cleanup, cancellation and performance. The narrower surface subset does not remove the library's existing [filter-function support](./features.md).

After installing dependencies and building the branch, run:

```sh
pnpm exec playwright install --with-deps chromium firefox webkit
node scripts/filter-descriptor-regressions.mjs
node scripts/filter-native-regressions.mjs
node scripts/filter-surface-regressions.mjs
```

These commands complement the unit suite and the separate native macOS WKWebView probe. They do not establish correctness on every device, for general filter chains, transformed/blended surfaces or arbitrary SVG overflow.
