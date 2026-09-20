# Over-budget fallback: attributing the slowdown

The earlier 2600 × 2600 release/draft timing gap is not a clean measurement of memory-budget overhead. The published 2.4.3 descriptor turns `blur(4px)` into `blur(4pxpx)` and drops functional shadow-color arguments. The corrected descriptor changes the rendering work even when the surface path falls back.

## Controlled comparison

`node scripts/filter-overbudget.mjs` compares five variants on identical DOM, within one browser run:

| Variant | Descriptor | Rendering path | Purpose |
| --- | --- | --- | --- |
| `release` | Published 2.4.3 | Published legacy renderer | Reproduce the apparently fast baseline. |
| `release-fixed-descriptor` | Current PR descriptor | Published legacy renderer | Isolate the descriptor fix without any new surface machinery. |
| `draft` | Current PR descriptor | Normal budget rejection, then legacy | Actual production behavior. |
| `draft-forced-legacy` | Current PR descriptor | Bypass eligibility/bounds/reservation and render legacy directly | Isolate the cost of trying and rejecting a surface. |
| `draft-old-descriptor` | Published 2.4.3 | Current renderer | Inverse ablation: restore the historical parsing bug, for diagnosis only. |

The published executable bundle remains unchanged apart from a test-only export of its descriptor. The current diagnostic bundle is built from production source with additional internal exports. No replacement parser is reimplemented. Overrides are restored after each capture and never enter `dist/` or the public API.

**Parse-cache isolation matters:** each variant has its own module instance. Replacing a descriptor on a module already used by another variant can return cached CSS values instead of exercising the replacement. The harness rejects shared descriptor instances and verifies the effective Canvas filter assignments.

Fixtures are a no-effects control, blur-only, and blur plus a semitransparent shadow. The two filtered cases have a 2600-pixel layer and two overlapping large children at opacity 0.5, intentionally exceeding the unchanged intermediate raster reservation. A caller-owned 2600 × 2600 output canvas is prepared before timing. The measurements include cloning, rendering and full pixel readback. The first observation is recorded separately; two warmups precede seven samples, rotating variant order. Pixel comparisons are outside the timer.

## What is asserted, rather than inferred from speed

For each engine, the diagnostic checks:

- Filtered draft fixtures reject exactly one surface before allocation; the no-effects control and explicit bypass make no surface attempt.
- There are no intermediate canvases, SVG encodes or leftover clone iframes. The output remains caller-owned.
- `draft`, `draft-forced-legacy` and `release-fixed-descriptor` produce byte-identical pixels on the first measured round.
- `release` and the inverse `draft-old-descriptor` ablation produce byte-identical pixels.
- With a native Canvas filter API, the corrected variants assign and draw with `blur(4px)`, whereas the old descriptor attempts `blur(4pxpx)` and the context retains `none`.

The report also records draw counts, center alpha, distinct requested/effective filters, eligibility time and rejected-surface time. Timings are informational, not noisy CI speed thresholds. An equivalence or path assertion fails the run instead of presenting incomparable variants as an optimization.

## Recorded three-engine run

Validated on PR head `b01f867ade845b4eca2fe0733803980fe0af5a2f` in [run 35097366430](https://github.com/yorickshan/html2canvas-pro/actions/runs/35097366430). The diagnostic completed all 45 fixture/variant/engine combinations: three fixtures, five variants and three engines. Seven measured captures per combination followed two warmups and one separately recorded first observation (315 measured captures, 450 including first observations and warmups).

Environment and exact checkout:

```json
{
  "revision": "361a2b578c7e91dbe31c8740a8637712f59de9ac",
  "node": "v24.20.0",
  "platform": "linux",
  "release": "6.17.0-1022-azure",
  "cpu": "AMD EPYC 7763 64-Core Processor",
  "logicalCPUs": 4,
  "ci": true,
  "workflowRun": "35097366430"
}
```

### Combined blur + shadow, 2600 × 2600: median milliseconds

| Variant | Chromium | Firefox | Linux WebKit |
| --- | ---: | ---: | ---: |
| `release` | 80.30 | 291.00 | 1736.00 |
| `release-fixed-descriptor` | 537.40 | 543.00 | 1738.00 |
| `draft` | 537.10 | 549.00 | 1737.00 |
| `draft-forced-legacy` | 537.70 | 548.00 | 1739.00 |
| `draft-old-descriptor` | 81.10 | 294.00 | 1737.00 |

For blur alone, Chromium measured 76.50 ms for the release, 239.20 ms with only the descriptor fixed, 240.60 ms for the draft, 239.70 ms for direct legacy, and 76.80 ms after restoring the old descriptor. This isolates the doubled-unit bug without a shadow-color change. The no-effects control measured 73.80 ms for release and 73.90 ms for draft.

### Measured budget-selection work in the combined draft fixture

| Engine / version | Eligibility median ms | Rejected surface median ms | Intermediate canvases | SVG encodes |
| --- | ---: | ---: | ---: | ---: |
| chromium 148.0.7778.96 | 0.000 | 0.000 | 0 | 0 |
| firefox 150.0.2 | 0.000 | 0.000 | 0 | 0 |
| webkit 26.4 | 0.000 | 0.000 | 0 | 0 |

A measured zero means below the browser timer resolution, not mathematically zero cost. Full per-sample timings, draw traces and all no-effects / blur-only results are in `overbudget.json` and `overbudget.md` in the run artifact. All 27 asserted pairwise pixel comparisons passed. The output of release-vs-draft is also recorded but is not assumed identical.

These are same-run diagnostic timings with instrumentation. They are not directly comparable to absolute timings on another host or a previous benchmark with a different allocation protocol. The effect is not made cheaper by removing the budget check, and the old release is not an equivalent correctness baseline.

The complete run passed normal [CI](https://github.com/yorickshan/html2canvas-pro/actions/runs/35097366330), CodeQL and Filter performance. Artifact `filter-performance`, ID `10447196350`, includes both the new diagnosis and the broader native/SVG measurements. ZIP SHA-256: `8bc8e9de78367e293b36988b1e08b65e85fbe582d29cad223d96d8b399acb412`.

Raw `overbudget.json` SHA-256: `c9e086131da561e6a0fc4e49acbf095619377bbaa51886e3a961b778d25c6f55`.

Local preflight separately passed in Chromium 144 using the exact `1720a27` CI bundle (production renderer unchanged at `0d7d507`). Those short two-sample preflights are not mixed into the CI medians.

## Interpretation

The expensive work in this reproduction is legacy **per-draw filtering that now actually takes effect**, not another rasterization before the budget check. The descriptor-only variant is a control that has no new surface machinery at all; inverse ablation tests the causal direction as well. The blur-only fixture isolates the doubled-unit bug from shadow-color serialization.

The renderer cannot legitimately recover the old time by dropping blur again. Increasing the budget, reducing resolution, ignoring the failure or changing the effect is not part of this investigation. The 64 MiB reservation remains unchanged, as do production rendering and the public API.

This is an attribution for these fixtures, not proof that arbitrary large trees have zero eligibility overhead. Budget rejection still falls back to legacy composition: filtered overlapping draws can have incorrect group opacity, and repeated full-size filtering can remain expensive. Center alpha is reported, not asserted to equal 128 on this fallback. Tiled filtering or other bounded-memory compositing would be a separate rendering feature requiring seam, shadow-outset, opacity and memory tests. No peak process-memory or system Safari/WKWebView performance claim is made.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm exec playwright install --with-deps chromium firefox webkit
node scripts/filter-overbudget.mjs
```

Optional focused run:

```sh
BENCH_ENGINES=chromium OVERBUDGET_CASES=combined \
  OVERBUDGET_ITERATIONS=7 OVERBUDGET_WARMUPS=2 \
  node scripts/filter-overbudget.mjs
```

Raw observations and a summary are written to `tmp/filter-surface-regressions/performance/overbudget.json` and `overbudget.md`. The existing Filter performance workflow runs this diagnostic before the broader benchmark and retains the files in its `filter-performance` artifact. No new macOS job or publication dependency is added.

The earlier, unisolated measurements remain historical context in [the native fast-path report](./filter-native-fastpath.md). The distinction between backend fallback and legacy fallback is described in [filter support](./filter-support.md).

Canvas invalid-assignment semantics are specified in [the HTML Standard's filter setter](https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-filter). The browser trace here verifies the actual assignments instead of relying only on that specification.
