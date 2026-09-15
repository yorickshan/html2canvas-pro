# Draft: compositing CSS filters on an intermediate surface

This is a reproduction and a test-only prototype. It does not change the public
API or the production renderer. The draft is not ready to merge.

The base is `60cb8bdd925fd7c56cd423d6e2127da177a97279` (version 2.4.3).

## Reproduce

1. Run `pnpm install` and `pnpm build`.
2. Run `pnpm exec tsx tests/server --port=8091 --cors=8092`.
3. Open `/tests/reftests/filter/compositing.html?run=false` on that server.
4. Remove `?run=false` to use the standard DOM/capture comparison.
5. Add `?run=false&prototype` to compare with the test-only SVG filter path.

The fixture uses local HTML and inline SVG only. It requires no application,
account, external image, web font, or proprietary asset.

Run `node scripts/filter-compositing-probe.mjs` for an automated Chromium
comparison at 1x and 2x. Set `CHROME_BIN` if using an installed Chrome instead of
Puppeteer's downloaded browser. Screenshots and metrics go to the ignored
`tmp/filter-compositing-probe/` directory. The probe asserts the prototype's
improvement and the still-unfixed overflow case; it is not a production regression
test that should remain unchanged after integration.

## Cases

- An inline SVG with a CSS drop shadow must retain pixels outside its content box.
- Two overlapping children with a parent blur must be filtered as one image.
- Parent blur, drop shadow and 50% opacity must not darken the children's overlap.
- An inline SVG with visible overflow must retain the outside half of its stroke.
  This last case is reproduced only; the prototype does not fix SVG bounds.

`EffectsRenderer` currently applies filter and opacity state to individual canvas
draws. `renderReplacedElement` clips its draw to the element's padding box. These
operations do not provide an intermediate surface for the complete filtered
subtree. In addition, assigning `ctx.filter` cannot provide blur on engines that
do not implement Canvas 2D filters.

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

| Case                    | Chromium current → prototype | WebKit current → prototype |
| ----------------------- | ---------------------------- | -------------------------- |
| SVG shadow              | 4.54–4.57 → less than 0.001  | 4.29–4.32 → 0.52–0.60      |
| Parent blur             | 3.34–3.67 → 0.015            | 3.33–3.96 → 0.096–0.097    |
| Blur + shadow + opacity | 11.25–12.14 → 0.075–0.081    | 11.24–12.01 → 0.27–0.30    |

The combined fixture's overlapping center has alpha 239–240 in the current
capture, versus 128 in the prototype (expected 50%). Outside SVG shadow pixels
have alpha 0 in the current capture and 73–74 in the prototype. These are focused
fixture results, not a claim of general rendering equivalence or a full Safari UI
test. WebKit retains a measurable shadow difference that needs investigation.

The library build, lint, 1,178 unit tests and 112 Chrome reftests passed. The Karma
suite checks successful rendering, not pixel equivalence; the screenshot probe
provides the pixel comparison for these new cases.

## Before integrating into the renderer

- Define intermediate surfaces at the appropriate stacking-context boundary.
- Preserve nested filters, opacity, clipping, transforms, blend modes and z-order.
- Derive filter outsets and SVG paint bounds rather than relying on fixture padding.
- Preserve filter order, repeated drop shadows, other filter functions and URL filters.
- Handle resource failures, tainted canvases, restrictive CSP and cancellation.
- Bound surface memory and verify performance on large/nested documents.
- Add automated browser regressions before promoting this draft to a mergeable fix.

The related shadow report #223 was marked fixed in 2.3.2. This draft supplies
separate fixtures against 2.4.3; it does not assume that report has the same cause.

AI-assisted investigation and prototype.
