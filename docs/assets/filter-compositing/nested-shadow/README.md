# Nested-shadow evidence

These images show the `nested-outset` fixture from code revision
`05ab767061672b68cb619d8934d12cc2e10d27e7`. They come from the
[passing CI run](https://github.com/yorickshan/html2canvas-pro/actions/runs/34973159143),
using its `native-wkwebview-pixels` and `filter-pixels-and-memory` artifacts.
The native macOS host ran WKWebView on macOS 26.6.2. The portable comparisons ran
Chromium and Playwright WebKit on Linux.

Each original PNG is 560 × 440 pixels from a 2× capture of the same 280 × 220 CSS
pixel fixture. The comparison figures place these images at their original pixel
size on white and add captions outside the panels. No source pixels were resized,
retouched or generated. Each panel was verified against the original composited
on white, with zero RGB difference. Original alpha is preserved in the source PNGs.
File hashes and artifact paths are recorded in [provenance.json](./provenance.json).

| Actual macOS WKWebView                           | Published 2.4.3                                    | PR result in WKWebView                      |
| ------------------------------------------------ | -------------------------------------------------- | ------------------------------------------- |
| [Original native PNG](./wkwebview-native-2x.png) | [Original baseline PNG](./wkwebview-before-2x.png) | [Original PR PNG](./wkwebview-after-2x.png) |

| Native Chromium on Linux                          | Native WebKit on Linux                              | PR result in Linux WebKit                      |
| ------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| [Original Chromium PNG](./chromium-native-2x.png) | [Original WebKit PNG](./linux-webkit-native-2x.png) | [Original PR PNG](./linux-webkit-after-2x.png) |

The figures document an unresolved native rendering difference. They do not claim
that the PR is pixel-equivalent to native WebKit. See the
[design note](../../../filter-compositing-draft.md#native-webkit-discrepancy)
for measurements and the explicit regression-test exception.
