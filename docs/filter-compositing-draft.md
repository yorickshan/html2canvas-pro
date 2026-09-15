# Draft: compositing CSS filters on an intermediate surface

This draft now includes an initial renderer integration, an interactive demo and
a separate test-only prototype. It does not change the public API and is not ready to merge.

The base is `60cb8bdd925fd7c56cd423d6e2127da177a97279` (version 2.4.3).

## Reproduce

1. Run `pnpm install` and `pnpm build`.
2. Run `pnpm exec tsx tests/server --port=8091 --cors=8092`.
3. Open `/tests/reftests/filter/compositing.html?run=false` on that server.
4. Remove `?run=false` to use the standard DOM/capture comparison.
5. Add `?run=false&prototype` to compare with the test-only SVG filter path.

The fixture uses local HTML and inline SVG only. It requires no application,
account, external image, web font, or proprietary asset.

## Interactive HTML demo

Open `/tests/manual/filter-lab.html` on the same local server. The page provides:

- Four sources: a CTA with text, overlapping HTML children, inline SVG and a local raster image.
- Sliders for blur, layer opacity, shadow blur and positive/negative shadow offsets.
- Eight presets covering every on/off combination of blur, shadow and 50% opacity.
- Live DOM, current library and SVG prototype views, plus transparent PNG downloads.
- A full preset matrix at 1x or 2x, runtime capability detection and a JSON report download.

The page tests actual Canvas blur behavior instead of inferring it from a user
agent string. Safari and WebKit-based webviews are a compatibility focus, but the
compositing bugs are not exclusive to webviews: Chromium reproduces them too.
An embedded WKWebView or Android WebView host has not been tested directly.
The [Canvas filter documentation](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter)
and [WebKit implementation tracker](https://bugs.webkit.org/show_bug.cgi?id=198416)
provide context; runtime support still needs to be checked on the target device.

The demo does not upload results or fetch external assets. The first comparison
runs automatically after the page and renderer load. Subsequent captures are
explicit; changing controls invalidates previous playground output. Capture
failures clear stale downloads and leave the controls available for retry.

The manual demo was exercised in Chromium 148 and Playwright WebKit 26.4 across
128 source/preset/scale combinations. Prototype center alpha matched 128 for
50% opacity and 255 for fully opaque presets. Native screenshot comparisons had
mean absolute RGB error below 3/255 for each combination; this is a tolerance,
not pixel equality. Zero opacity, negative offsets, capture failure/retry and
viewport widths 320, 390, 720 and 1440 pixels were also checked. The WebKit runtime
reported unavailable Canvas blur, while Chromium reported working Canvas blur.

## Pixel probe

Run `node scripts/filter-compositing-probe.mjs` for an automated Chromium
comparison at 1x and 2x. Set `CHROME_BIN` if using an installed Chrome instead of
Puppeteer's downloaded browser. Screenshots and metrics go to the ignored
`tmp/filter-compositing-probe/` directory. The probe checks the renderer against
native DOM screenshots, plus nested opacity, source/ancestor clipping and the
still-unfixed SVG overflow case.

## Cases

- An inline SVG with a CSS drop shadow must retain pixels outside its content box.
- Two overlapping children with a parent blur must be filtered as one image.
- Parent blur, drop shadow and 50% opacity must not darken the children's overlap.
- An inline SVG with visible overflow must retain the outside half of its stroke.
  This last case is reproduced only; the prototype does not fix SVG bounds.

In the 2.4.3 baseline, `EffectsRenderer` applies filter and opacity state to individual canvas
draws. `renderReplacedElement` clips its draw to the element's padding box. These
operations do not provide an intermediate surface for the complete filtered
subtree. In addition, assigning `ctx.filter` cannot provide blur on engines that
do not implement Canvas 2D filters.

## Initial renderer integration

`CanvasRenderer` now rasterizes eligible filter/opacity stacking contexts on an
intermediate surface. It applies blur followed by one shadow, then opacity, and
composites the result in z-order. Source effects stop at the surface boundary, so
ancestor and nested opacity do not get applied twice. Capture bounds gain padding
for blur and signed shadow offsets.

This first integration only handles untransformed subtrees without blend modes or
clip-path. Unsupported filter chains retain the existing renderer path. Nested
opacity and filters, ancestor clipping and clipping before blur have focused
checks. SVG paint bounds, general filter chains, transforms, CSP/taint behavior,
large surfaces and broader platform coverage still need work.

Filter parsing also preserves units and functional colors: `blur(5px)` no longer
becomes `blur(5pxpx)`, hue-rotate no longer duplicates its unit, and nested rgba/rgb
color functions retain their arguments. Non-empty filters create a real stacking
context.

The 128 demo comparisons were rerun against the integrated renderer. Both renderer
and prototype stayed below 0.39/255 mean absolute RGB error in Chromium and
1.19/255 in WebKit. Center alpha matched every expected 50% / 100% preset. Two
nested 50% opacities produced alpha 64 in both engines. These results do not prove
arbitrary-page equivalence.

The integrated build, lint, 1,195 unit tests and 113 Chrome reftests passed. The
committed pixel probe also passed in Chrome 152 at 1x and 2x. The Karma suite
checks successful rendering, not pixel equivalence; the probe checks pixels for
the focused filter fixtures.

## Prototype

`tests/manual/filter-compositing.js` captures one untransformed layer without its
parent filter and opacity. It applies blur followed by a single drop shadow to
the raster via SVG, then applies opacity while compositing the result. Both
engines exercise this SVG path; it does not depend on Canvas 2D filter support.

The shadow uses Gaussian blur, offset, flood and composite primitives, rather
than `feDropShadow`. Filters use capture-pixel coordinates and sRGB. The SVG
contains an embedded PNG, with no `foreignObject` or external resource.

The experiment deliberately uses known fixture parameters and generous bounds.
It is not a general filter parser or a production wrapper around html2canvas.

## Initial measurements

The fixtures were checked against native DOM screenshots in Chromium 148 and
Playwright WebKit 26.4, at both 1x and 2x. The SVG path ran in both engines.

Mean absolute RGB error on a white background, per channel on a 0–255 scale:

| Case                    | Chromium baseline → prototype | WebKit baseline → prototype |
| ----------------------- | ----------------------------- | --------------------------- |
| SVG shadow              | 4.54–4.57 → less than 0.001   | 4.29–4.32 → 0.52–0.60       |
| Parent blur             | 3.34–3.67 → 0.015             | 3.33–3.96 → 0.096–0.097     |
| Blur + shadow + opacity | 11.25–12.14 → 0.075–0.081     | 11.24–12.01 → 0.27–0.30     |

The combined fixture's overlapping center has alpha 239–240 in the baseline
capture, versus 128 in the prototype (expected 50%). Outside SVG shadow pixels
have alpha 0 in the baseline capture and 73–74 in the prototype. These are focused
fixture results, not a claim of general rendering equivalence or a full Safari UI
test. WebKit retains a measurable shadow difference that needs investigation.

## Before marking ready for review

- Preserve nested filters, opacity, clipping, transforms, blend modes and z-order.
- Verify derived filter outsets for general cases and preserve SVG paint bounds.
- Preserve filter order, repeated drop shadows, other filter functions and URL filters.
- Handle resource failures, tainted canvases, restrictive CSP and cancellation.
- Bound surface memory and verify performance on large/nested documents.
- Broaden automated browser and embedded-webview coverage before marking ready.

The related shadow report #223 was marked fixed in 2.3.2. This draft supplies
separate fixtures against 2.4.3; it does not assume that report has the same cause.

AI-assisted investigation and implementation.
