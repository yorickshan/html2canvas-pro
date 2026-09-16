# Production native filter fast path

Implemented in `1720a274cc94e31fb7777bde184ca0b9621b4601`. Measurements below were recorded on 16 September 2026. The native backend is now used by the production renderer, not just the benchmark. The public API and surface eligibility rules are unchanged.

**Over-budget follow-up:** the [controlled attribution report](./filter-overbudget.md) now separates the earlier release/draft gap from memory-budget overhead. The corrected filter descriptor makes legacy blur actually execute; descriptor-only and direct-legacy controls reproduce the same pixels. The historical numbers below are retained, not reclassified as an isolated cost of budget rejection.

## Rendering policy

Eligible complete layers use Canvas filters only after a cached, per-Document probe observes actual blur and a correctly colored semitransparent shadow. The probe checks for the API before assigning to it, preventing a JavaScript expando from masquerading as support. Probe canvases are released, and only a boolean is retained.

Filtering happens at alpha 1, with all lengths multiplied by capture scale. Layer opacity is applied in a separate canvas pass after filtering and shadow merge. Opacity-only layers skip the probe. A recoverable native allocation, assignment or draw failure retries the existing SVG path. Failed temporary canvases are released; caller-owned source canvases remain intact. Cancellation is propagated, not converted to fallback.

The native path does not serialize the source or create a data image. It therefore avoids the PNG/SVG round trip and can work under a policy that blocks SVG data images. Canvas-origin taint is not cleared. The existing raster reservation and unsupported-subtree legacy fallback remain unchanged. SVG decoding, timeout, cancellation and blocked-data-image fallback are still tested explicitly.

## Verification at 1720a27

[Core CI run 35088872841](https://github.com/yorickshan/html2canvas-pro/actions/runs/35088872841) passed build, bundle-size checks, lint, 1,234 unit tests in 93 files, Chrome/Firefox/Safari browser tests, Chromium/WebKit pixel and allocation regressions, and the native macOS WKWebView pixel probe. CodeQL also passed.

[Native/benchmark run 35088872866](https://github.com/yorickshan/html2canvas-pro/actions/runs/35088872866) completed the independent native/SVG matrix and production benchmarks in Chromium, Firefox and Playwright WebKit. Each engine checks 48 combinations: six filters, four opacity values and scales 1/2. It also checks unavailable/no-op filter implementations, native failure recovery, cancellation, resource cleanup and real CSP behavior. WebKit fallback-vs-SVG comparisons do not prove a native WebKit implementation.

| Engine | Version | Native selected | Cases | Max RGB MAE / 255 | Max alpha MAE / 255 |
| --- | --- | --- | ---: | ---: | ---: |
| chromium | 148.0.7778.96 | yes | 48 | 0.000000 | 0.000000 |
| firefox | 150.0.2 | yes | 48 | 0.000000 | 0.000000 |
| webkit | 26.4 | no, SVG fallback | 48 | 0.000000 | 0.000000 |

The matrix uses a fixed 2/255 mean-error bound, not a blanket claim of pixel equivalence. The existing independent DOM-reference regressions retain their original thresholds and explicit native-WebKit nested-shadow exception.

## Same-run performance measurements

CI checkout: `b5e68ee379839531c3cd2503ada5ebf7be992af2` (test merge of PR head `1720a27`). Environment: linux 6.17.0-1022-azure, x64, AMD EPYC 7763 64-Core Processor, 4 exposed logical CPUs, Node v24.20.0.

Each row has nine measured samples after two excluded warmups and a separately recorded first observation. Backend order rotates. Total includes full output readback; source generation is excluded. These measurements compare the production native dispatcher with the explicit production SVG helper on the same input in the same run. They do not compare the current renderer with an incorrectly rendered release capture.

### 2000 × 2000 surface (milliseconds)

| Engine | Source / effect | SVG median / p95 | Native median / p95 | SVG/native median ratio |
| --- | --- | ---: | ---: | ---: |
| chromium | flat / blur | 91.2 / 113.4 | 45.2 / 45.6 | 2.02× |
| chromium | flat / combined | 136.2 / 146.7 | 101.2 / 105.1 | 1.35× |
| chromium | textured / blur | 890.2 / 947.4 | 44.6 / 47.8 | 19.96× |
| chromium | textured / combined | 924.1 / 1003.2 | 100.6 / 108.8 | 9.19× |
| firefox | flat / blur | 123.0 / 124.0 | 70.0 / 73.0 | 1.76× |
| firefox | flat / combined | 157.0 / 189.0 | 141.0 / 176.0 | 1.11× |
| firefox | textured / blur | 3677.0 / 3686.0 | 69.0 / 74.0 | 53.29× |
| firefox | textured / combined | 3618.0 / 3671.0 | 138.0 / 146.0 | 26.22× |
| webkit | flat / blur | 409.0 / 414.0 | unsupported | — |
| webkit | flat / combined | 459.0 / 465.0 | unsupported | — |
| webkit | textured / blur | 2011.0 / 2157.0 | unsupported | — |
| webkit | textured / combined | 2108.0 / 2144.0 | unsupported | — |

For noisy combined effects, production native filtering was about 9.2× faster than explicit SVG in Chromium and 26.2× in Firefox. This is the cost of filtering a prepared surface, not a whole-page speedup. With nine samples, nearest-rank p95 is the maximum, not a stable estimate of tail latency. Flat and high-entropy noise are controlled fixtures; noise is not a claim that every photograph behaves this way.

### Full DOM capture (milliseconds)

The published release and current draft capture identical DOM but do not always render equivalent pixels. In particular, the combined-effect overlap is checked against alpha 128 in the draft. Do not treat the following ratios as isolated backend overhead or compare runs on different hosts as a controlled before/after experiment.

| Engine | Scenario | Release median | Draft median | Draft backend |
| --- | --- | ---: | ---: | --- |
| chromium | control-512 | 56.1 | 56.5 | legacy/no-filter |
| chromium | combined-512 | 56.5 | 62.6 | native-surface |
| chromium | control-2000 | 66.1 | 66.0 | legacy/no-filter |
| chromium | combined-2000 | 68.8 | 157.4 | native-surface |
| chromium | sparse-50 | 72.2 | 149.6 | native-surface |
| chromium | nested-12 | 57.5 | 74.2 | native-surface |
| chromium | over-budget | 79.0 | 508.9 | legacy-fallback |
| firefox | control-512 | 64.0 | 64.0 | legacy/no-filter |
| firefox | combined-512 | 66.0 | 72.0 | native-surface |
| firefox | control-2000 | 77.0 | 78.0 | legacy/no-filter |
| firefox | combined-2000 | 165.0 | 214.0 | native-surface |
| firefox | sparse-50 | 96.0 | 199.0 | native-surface |
| firefox | nested-12 | 65.0 | 86.0 | native-surface |
| firefox | over-budget | 279.0 | 521.0 | legacy-fallback |
| webkit | control-512 | 60.0 | 60.0 | legacy/no-filter |
| webkit | combined-512 | 85.0 | 70.0 | svg-surface |
| webkit | control-2000 | 76.0 | 73.0 | legacy/no-filter |
| webkit | combined-2000 | 869.0 | 272.0 | svg-surface |
| webkit | sparse-50 | 145.0 | 254.0 | svg-surface |
| webkit | nested-12 | 59.0 | 137.0 | svg-surface |
| webkit | over-budget | 1735.0 | 1735.0 | legacy-fallback |

## Remaining limits

The SVG fallback still pays its encoding/decoding cost on runtimes without working native filters. This change does not fix that cost, nor does it change over-budget legacy rendering. In the historical over-budget Chromium case the draft took 508.9 ms versus 79.0 ms for the release, despite zero SVG encodes. The subsequent [five-variant attribution](./filter-overbudget.md) isolates the descriptor fixes: the release was not applying the same blur, and normal rejection matches a direct-legacy control. This explains the reproduction; it does not make legacy filtering fast or correct its group-opacity limitation. CPU scheduling, browser implementation and image entropy affect results. No peak browser-process-memory measurement or universal latency guarantee is claimed.

Performance measurements here are headless Linux Chromium/Firefox/Playwright WebKit. Passing macOS Safari and WKWebView correctness checks is not a macOS performance measurement. Representative real devices and embedded webview hosts still need timing measurements.

## Reproduce and inspect

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm exec playwright install --with-deps chromium firefox webkit
node scripts/filter-native-regressions.mjs
BENCH_ENGINES=chromium,firefox,webkit node scripts/filter-performance.mjs
```

The manual page is `/tests/manual/filter-performance.html`; it uses the same harness, supports cancellation and JSON import/export, and labels historical reports separately. The older measurements remain in [filter-performance.md](./filter-performance.md).

Raw `results.json`, `summary.md` and `native-regressions.json` are in the `filter-performance` artifact of run 35088872866 (artifact `10444095148`, ZIP SHA-256 `2082921c3064415bc616833541df30dd5eeebd9fc4fbc47af48dfcef57345ad9`). The production report includes `implementation: production-native-with-svg-fallback` and the source/bundle hashes below.

```json
{
  "src/render/canvas/filter-surface.ts": "dfc272bff180780b6399aa4bac9b6ab164a3f4b5986a9dd2f59af4f373169f4c",
  "tests/manual/filter-performance.js": "1fb06e3f0a7fd612c313a7d624b08404241cbcea3a4adcbd3e4a0ab4fec2d08d",
  "dist/html2canvas-pro.esm.js": "ffb6a2027baba83c7cb3d3f4796315a334848b88e855fee5d832b46a3a981d3a",
  "build/html2canvas-pro-baseline.esm.js": "d335004b5269e8ae10c139a105df141a66646960c7b1b5f5def18a8eec80c1d8"
}
```

Updating repository demo sources does not redeploy the existing hosted chatgpt.site URL. Upstream PR-description updates remain unavailable through this integration; this report is committed to the head branch.
