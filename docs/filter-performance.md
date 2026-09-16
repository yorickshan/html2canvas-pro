# Filter-surface performance

These are reproducible observations, not a universal performance approval. The benchmark does not change the production renderer; its Canvas alternative is test-only.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm exec playwright install --with-deps chromium webkit
node scripts/filter-performance.mjs
```

Optional: `BENCH_ENGINES=chromium BENCH_ITERATIONS=21 BENCH_WARMUPS=3 node scripts/filter-performance.mjs`.
Firefox can also be selected after installing its Playwright browser. The default run covers Chromium and WebKit, not system Safari, real WKWebView, iOS or Android.

For the browser UI, run the normal test server and open `/tests/manual/filter-performance.html`, linked from the filter lab's Performance section. No benchmark starts automatically. Keep the tab visible and avoid other CPU-intensive work. The page supports cancellation and JSON export/import.

CLI output is `tmp/filter-surface-regressions/performance/results.json` and `summary.md`. The Ubuntu-only `Filter performance` workflow retains both in its `filter-performance` artifact. It is not a dependency of NPM publication. Timings are informational; invalid execution, rendering paths or pixel sanity checks fail the job, not a speed threshold.

## Protocol

The build bundles the actual `src/render/canvas/filter-surface.ts` into the ignored `build/filter-surface-benchmark.js`. There is no copied SVG implementation, new public export or new published dependency.

**Surface microbenchmark:** 512, 1000 and 2000 raster pixels per side, scale 1. Compare flat fill and deterministic high-entropy RGB noise, with blur(4px), or blur plus one shadow (12px, 8px, 8px, alpha 0.6), then layer opacity 0.5. Source creation is excluded. The opacity-only copy is a cost floor, not an equivalent visual result. The Canvas alternative filters at alpha 1 before a second opacity pass, preserving operation order.

**Full capture:** identical DOM, dimensions and scale for the pinned unmodified 2.4.3 and the draft. Cases cover no-effects controls, combined effects, 50 sparse layers, 12 nested filters and a 2600-pixel over-budget capture. Cloning and rendering are timed. The 2000-pixel filtered DOM fixture has inset content so its padded intermediate surface fits the existing budget; output is exactly 2000 by 2000.

**Sampling:** first observation recorded separately, two excluded warmups, nine measured samples by default. Backend/version order rotates each round. The microbenchmark changes one source pixel between rounds to avoid identical SVG image-cache hits. Full captures represent repeated capture of a stable DOM. The first observation is not a claim of process-cold startup timing.

**Synchronization:** total includes full output `getImageData` readback, not merely draw submission. This prevents deferred filter work from disappearing from the measurement. Submission, readback, PNG encoding and `Image.decode()` waits are also recorded. SVG filtering can be deferred past `decode()` into drawing or readback: these stages are not an exact browser-engine profiler. Stage medians are not additive. With nine samples, nearest-rank p95 is the maximum and only a coarse tail observation.

**Validity:** Canvas support is checked before assignment and by actual pixels; unsupported engines are skipped, not timed as no-ops. Center alpha 128, blur outside the source, SVG encoding calls, output dimensions and clone cleanup are checked. The first measured SVG/Canvas pair also records mean RGB-on-white and alpha differences. These are focused sanity checks, not general pixel equivalence. Existing pixel regressions and allocation tests remain necessary.

**Limits:** shared headless runners do not represent every device. Noise is an encoding stress case, not a claim that every photograph costs this much. This benchmark does not measure peak process or SVG-decoder memory; readbacks themselves allocate buffers. The existing 64 MiB reservation is not total process RSS. Release captures can omit effects or compound opacity, so their speed ratios do not isolate compositing overhead. Memory-budget fallback is not a successful filtered-rendering optimization.

## Cross-engine CI — 16 September 2026

[Run 35085900932](https://github.com/yorickshan/html2canvas-pro/actions/runs/35085900932) completed both engines with valid observations. Environment: Ubuntu, AMD EPYC 7763, four exposed logical CPUs, Node 24.20.0. PR head `ec0183e90f8d7c017de53c1999588ed55b909952`; GitHub test-merge checkout `c39a63e97dec134c3dab64b21a49673b49e58316`. Nine measured samples after two warmups. Chromium 148.0.7778.96 and Playwright WebKit 26.4.

**This is Linux Playwright WebKit, not macOS Safari or native WKWebView performance.** Canvas filters did not work in this WebKit runtime and are explicitly skipped. Core CI and CodeQL also passed on `ec0183e`.

### 2000 by 2000 surface

All times are milliseconds, including output readback.

| Source / effect | Chromium SVG median / p95 | Chromium Canvas median / p95 | WebKit SVG median / p95 |
| --- | ---: | ---: | ---: |
| Flat, blur | 99.4 / 135.1 | 49.1 / 52.6 | 415.0 / 423.0 |
| Flat, blur + shadow | 173.7 / 180.2 | 111.7 / 114.5 | 467.0 / 473.0 |
| Noise, blur | 925.6 / 1021.9 | 49.4 / 52.4 | 2023.0 / 2105.0 |
| Noise, blur + shadow | 954.1 / 1053.6 | 109.0 / 111.1 | 2106.0 / 2179.0 |

In Chromium, the high-entropy combined case was about 8.8 times slower through SVG than the test-only native path; isolated blur was about 18.7 times slower. These are fixture-specific comparisons, not general browser rankings. The measured SVG/Canvas pairs stayed below 0.001/255 mean RGB error on white in this microbenchmark; broader native-path correctness still needs validation.

For noisy combined effects, median PNG encoding / `Image.decode()` waits were 133.1 / 502.5 ms in Chromium and 668.0 / 832.0 ms in WebKit. Flat sources measured 14.5 / 5.6 ms and 185.0 / 4.0 ms respectively. Substantial work can also occur in serialization, drawing or readback; these stage medians do not sum to the total median.

### Full capture

| Scenario | Chromium release / draft median | WebKit release / draft median |
| --- | ---: | ---: |
| No effects, 512 | 57.6 / 57.9 | 60.0 / 60.0 |
| Combined effects, 512 | 57.3 / 64.0 | 85.0 / 71.0 |
| No effects, 2000 | 66.6 / 66.8 | 74.0 / 72.0 |
| Combined effects, 2000 | 70.3 / 196.2 | 868.0 / 278.0 |
| 50 sparse layers | 74.1 / 158.0 | 146.0 / 255.0 |
| 12 nested filters | 59.0 / 85.8 | 60.0 / 139.0 |
| Over-budget, 2600 | 81.0 / 540.1 | 1737.0 / 1735.0 |

No-effects controls remained similar in this run. Filtered rows require the correctness context: the release combined overlap had alpha 252; the draft correctly had 128. In the WebKit 2000-pixel DOM fixture the fixed result was both faster and correct, but this does not erase high-entropy surface costs.

Over-budget rows use legacy fallback with zero SVG encodes in both engines. Investigate them independently rather than attributing their entire timing difference to the SVG round trip: parser fixes and non-equivalent release rendering also remain in play.

### Provenance and raw observations

The `filter-performance` artifact contains all raw samples, stage timings, quality deltas, browser metadata and hashes. Artifact ID: `10441544362`; downloaded ZIP SHA-256: `7640e55b51b40788590d7e0514d77e9359c0fe42aa30595adbceb5f9287fb025`.

- Benchmark source SHA-256: `101847ce458057b7fd632d7a6179ece6f99572ab1d978093a548b81817116adf`.
- Production renderer ESM SHA-256: `d8885dda1aa84ea4b726c3b5917e9cca63747028ba6d757f7ba74991bed80953`.
- Pinned release ESM SHA-256: `d335004b5269e8ae10c139a105df141a66646960c7b1b5f5def18a8eec80c1d8`.

A separate local preflight used Chromium 144.0.7559.96 on headless Linux with the exact prior CI artifacts from [run 35074811940](https://github.com/yorickshan/html2canvas-pro/actions/runs/35074811940), loaded as in-memory modules in Python Playwright. Renderer and benchmark hashes matched the cross-engine run. It independently showed the same issue: noisy combined 2000-pixel SVG surfaces had median 1014.1 ms versus 138.0 ms on the Canvas alternative, while flat combined surfaces measured 198.4 versus 147.2 ms. This pilot is not a WebKit measurement.

## Engineering conclusion

There is a material high-entropy SVG round-trip cost. Do not describe the current implementation as having no significant performance risk. A native Canvas fast path is worth implementing and validating separately where filters actually work, retaining SVG for unsupported runtimes. That optimization is not enabled by this benchmark, and correctness, memory, CSP, taint and cancellation requirements are unchanged.

Representative devices and system Safari/WKWebView still need performance measurements. A successful benchmark job means valid observations, not speed certification.
