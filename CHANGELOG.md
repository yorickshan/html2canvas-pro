## [2.1.1](https://github.com/yorickshan/html2canvas-pro/compare/v2.1.0...v2.1.1) (2026-06-23)

### Features

* add CodeQL workflow for automated code analysis and remove unused dependencies ([12e9551](https://github.com/yorickshan/html2canvas-pro/commit/12e95517e1eb66364228355528d40c8f34748b29))
* enhance version upgrade script for better versioning and changelog generation ([1c28f5e](https://github.com/yorickshan/html2canvas-pro/commit/1c28f5e202a7e38a31b66d425b4e932d75a6cb08))

### Bug Fixes

* add annotation to version tag in release script ([58e8e29](https://github.com/yorickshan/html2canvas-pro/commit/58e8e29e177773ff129eed29b4de24feb599f35b))
* remove deprecated husky v9 bootstrap lines, use pnpm in hooks ([f451783](https://github.com/yorickshan/html2canvas-pro/commit/f4517832074121bba1cfdf1ffd82b7a177a7b361))
* remove unnecessary flag from changelog generation command ([ef7d739](https://github.com/yorickshan/html2canvas-pro/commit/ef7d7392911ea2f1c3053556f0e4f22143ad5e06))
* update bundle size thresholds for warnings in CI workflow ([d934cf0](https://github.com/yorickshan/html2canvas-pro/commit/d934cf0f15669de32c7f9dae3d4a1029aa098585))

## [2.1.0](https://github.com/yorickshan/html2canvas-pro/compare/v2.0.4...v2.1.0) (2026-06-22)

### Features

* add mix-blend-mode CSS property support ([e4ee3b7](https://github.com/yorickshan/html2canvas-pro/commit/e4ee3b76c75254097beadc27c914768ae27e5638)), closes [#123](https://github.com/yorickshan/html2canvas-pro/issues/123)
* Phase 4 API improvements ([c7cd541](https://github.com/yorickshan/html2canvas-pro/commit/c7cd541ac6abf84ae932acf6e47f7a938e9a072c))
* **rendering:** enhance object-fit calculations and add related tests ([aed1547](https://github.com/yorickshan/html2canvas-pro/commit/aed15477b7188eb3917613be3248575d46854ce8))

### Bug Fixes

* add --configPlugin typescript to rollup commands for Node 24 CI compatibility ([3f0c686](https://github.com/yorickshan/html2canvas-pro/commit/3f0c686a296f8f6154f72ae208695646d6f15a8b))
* add --no-git-checks to pnpm publish in CI ([65917f4](https://github.com/yorickshan/html2canvas-pro/commit/65917f41192ef2c2f6dd8fb996c18b3bb0cec625))
* add exports named to rollup output to suppress mixed exports warning ([95ddbec](https://github.com/yorickshan/html2canvas-pro/commit/95ddbec2223122a53c68e997214878de9e8dcf60))
* add packageManager field for pnpm/action-setup in CI ([7ca5f4f](https://github.com/yorickshan/html2canvas-pro/commit/7ca5f4f0ca7cf0bcf8b4559534bff5bfca1dc412))
* correct dependabot package-ecosystem from pnpm to npm ([b6d4001](https://github.com/yorickshan/html2canvas-pro/commit/b6d400101e891425bd3d184d061d4e6701c42aec))
* explicitly list karma plugins instead of using wildcard ([943d2e0](https://github.com/yorickshan/html2canvas-pro/commit/943d2e05ef8997679cd12ff9176ec4a440a42b64))
* extend scroll position fallback to desktop Safari ([b2c0276](https://github.com/yorickshan/html2canvas-pro/commit/b2c027639529d19957aeab0ad5a9933b333c8661))
* post-Phase 5 type fixes and exports cleanup ([8c96dc8](https://github.com/yorickshan/html2canvas-pro/commit/8c96dc8a711af941e8fadb71a3bddcfb94e76f44))
* replace jest-image-snapshot with pixelmatch, remove karma-sauce-launcher ([767db21](https://github.com/yorickshan/html2canvas-pro/commit/767db21bf7cc010f4cfd13612dfddd16b10a6d73))
* replace mkdirp CLI with mkdir -p for CI compatibility ([5619d2b](https://github.com/yorickshan/html2canvas-pro/commit/5619d2be62515c0c2f60771e88286f44b2593e71))
* replace mkdirp with fs.mkdirSync in test server ([eb23651](https://github.com/yorickshan/html2canvas-pro/commit/eb23651c61231440e68e3858dbb4b1f7f13f82f9))
* resolve TS warnings in bounds mock and test server deps ([f317002](https://github.com/yorickshan/html2canvas-pro/commit/f317002a210668518c1f25d22ab0d49e619ed0c4))
* resolve TS warnings in reftest-diff by replacing it.each with for loop ([7f8a80d](https://github.com/yorickshan/html2canvas-pro/commit/7f8a80db24d6fbafd6407a8ee38f078b2ffc8028))
* suppress rollup sourcemap warnings by removing sourceMap from base tsconfig ([fb2006c](https://github.com/yorickshan/html2canvas-pro/commit/fb2006c2127bec6f1e12843eaca4ded8ef3784aa))
* use pnpm-compatible binary calls in build scripts ([0b8b8f9](https://github.com/yorickshan/html2canvas-pro/commit/0b8b8f9fcc99a1d1295912c3e6b91f036e29a44b))

### Performance Improvements

* deferred CSS parsing, TypeDoc, benchmarks ([34e2ae1](https://github.com/yorickshan/html2canvas-pro/commit/34e2ae1ae116e429d226246904df66fddb4f16de))
* Phase 3 performance improvements ([eefd0e3](https://github.com/yorickshan/html2canvas-pro/commit/eefd0e38634181083eef7ec7601a273bb574afd0))
* skip pseudo-element getComputedStyle for void/replaced elements ([d0a99a9](https://github.com/yorickshan/html2canvas-pro/commit/d0a99a90c6fd8002b521794a588e45751a0210c1))

## [2.0.4](https://github.com/yorickshan/html2canvas-pro/compare/v2.0.3...v2.0.4) (2026-05-26)

### Features

* **writing-mode:** implement writing mode support in text rendering and parsing ([a2d8a1c](https://github.com/yorickshan/html2canvas-pro/commit/a2d8a1c3382ec7d45f07a534a634ef5e10291af1))

### Bug Fixes

* **text:** keep range offsets aligned after transform ([494b328](https://github.com/yorickshan/html2canvas-pro/commit/494b328bee5e864683f433a817865473e5293f87))

## [2.0.3](https://github.com/yorickshan/html2canvas-pro/compare/v2.0.1...v2.0.3) (2026-05-23)

### Bug Fixes

* **document-cloner:** ensure correct order for adoptNode() ([58bbe5d](https://github.com/yorickshan/html2canvas-pro/commit/58bbe5dcd80cfc22769863c3a5d6e7b24cf1d142))
* **document-cloner:** use source document baseURI for background-image resolution ([6d1e12a](https://github.com/yorickshan/html2canvas-pro/commit/6d1e12a9e08de48bd8790fce0541f5f594b1a2f5))

## [2.0.1](https://github.com/yorickshan/html2canvas-pro/compare/v1.6.7...v2.0.1) (2026-02-24)

### Features

* add image smoothing control support ([b4d7018](https://github.com/yorickshan/html2canvas-pro/commit/b4d701863a48d66be2a656b0c7d906824a6dbc20))
* add support for clip-path CSS property with various shape functions ([828865f](https://github.com/yorickshan/html2canvas-pro/commit/828865ff38c2723f9548a12f68aaa80c8e7b2b31))

### Bug Fixes

* **dom-normalizer:** replace transforms with identity values ([7b1bccf](https://github.com/yorickshan/html2canvas-pro/commit/7b1bccfaf51237ec329da63b3020e1e4658e3fb5))
* **text-renderer:** fix letter-spacing and CJK baseline offset ([#73](https://github.com/yorickshan/html2canvas-pro/issues/73)) ([3d9d31f](https://github.com/yorickshan/html2canvas-pro/commit/3d9d31fa4a55d71edd9a129975cccb3683591e9f))

## [1.6.7](https://github.com/yorickshan/html2canvas-pro/compare/v1.6.6...v1.6.7) (2026-02-13)

### Bug Fixes

* v1.6.1+ broke my previews after the first shadow-root [#206](https://github.com/yorickshan/html2canvas-pro/issues/206) ([5cc1af9](https://github.com/yorickshan/html2canvas-pro/commit/5cc1af9a0c6c2cd27ac3d28dd67071dfd64bf4da))

## [1.6.6](https://github.com/yorickshan/html2canvas-pro/compare/v1.6.5...v1.6.6) (2026-01-21)

### Bug Fixes

* not support line-clam ([5fffeca](https://github.com/yorickshan/html2canvas-pro/commit/5fffeca3ea5bd2f966836cc2e2b587163fe8a3d4))

## [1.6.5](https://github.com/yorickshan/html2canvas-pro/compare/v1.6.4...v1.6.5) (2026-01-19)

### Features

* iframeContainer ([924e1cc](https://github.com/yorickshan/html2canvas-pro/commit/924e1cc8d7d17601174d009a7cf3e681e28c086c))
* support rotate ([d2fde50](https://github.com/yorickshan/html2canvas-pro/commit/d2fde50caa406700c9723e022db7ed7ab3366a5c))
* text decoration enhancement ([df9c189](https://github.com/yorickshan/html2canvas-pro/commit/df9c189d82e2b1f16a0c4467c70a38efa72ed3e6))
* text-overflow: ellipsis ([5325e7a](https://github.com/yorickshan/html2canvas-pro/commit/5325e7abb444f42ab0b0d8897cbef6c5452faf2d))

## [1.6.4](https://github.com/yorickshan/html2canvas-pro/compare/v1.6.3...v1.6.4) (2026-01-08)

## [1.6.3](https://github.com/yorickshan/html2canvas-pro/compare/v1.6.2...v1.6.3) (2025-12-31)

### Features

* interactive demo ([d5783f8](https://github.com/yorickshan/html2canvas-pro/commit/d5783f8038bb212385f950031a5ba889ad0604ce))

### Bug Fixes

* radial-gradient not support ([5e0e196](https://github.com/yorickshan/html2canvas-pro/commit/5e0e196bf9a99318b7440874364e94e97ad7677c))

## [1.6.2](https://github.com/yorickshan/html2canvas-pro/compare/v1.5.13...v1.6.2) (2025-12-23)

### Features

* calc() in background-position ([14d7f67](https://github.com/yorickshan/html2canvas-pro/commit/14d7f67e318dd4cedcb299ddca1a512982237b93))

### Bug Fixes

* everything in <slot> is not rendered [#108](https://github.com/yorickshan/html2canvas-pro/issues/108) ([d940cb8](https://github.com/yorickshan/html2canvas-pro/commit/d940cb843b6b420787f52429af38bd75d119edc8))
* placeholder padding incorrect render [#92](https://github.com/yorickshan/html2canvas-pro/issues/92) ([b31a1ce](https://github.com/yorickshan/html2canvas-pro/commit/b31a1ce22f02af4bd34dcd18d9aea88598248621))
* text inside inline-flex container not rendering when it's the only child [#137](https://github.com/yorickshan/html2canvas-pro/issues/137) ([11d1be6](https://github.com/yorickshan/html2canvas-pro/commit/11d1be6ff2bfbf4887b9e7baa4e864226003684a))
* text rendered lower than in browser ([667c2cc](https://github.com/yorickshan/html2canvas-pro/commit/667c2cc97802d21094b96ff01595f159d00f7e9d))
* webkit-text-stroke is offseted below when paint-order: stroke fill; is used [#110](https://github.com/yorickshan/html2canvas-pro/issues/110) ([0dbd1f4](https://github.com/yorickshan/html2canvas-pro/commit/0dbd1f4f5a6f0f26d3e6962d403df0dd94c623bf))
* when used with Tailwind, the oklch color is sometimes downgraded to the default black [#134](https://github.com/yorickshan/html2canvas-pro/issues/134) ([21b0672](https://github.com/yorickshan/html2canvas-pro/commit/21b06723e2f543936f58860bb681353d16749288))

## [1.5.13](https://github.com/yorickshan/html2canvas-pro/compare/v1.5.12...v1.5.13) (2025-11-06)

### Bug Fixes

* chrome_138 ignore custom properties ([5e7e132](https://github.com/yorickshan/html2canvas-pro/commit/5e7e13274a4ff6ea71c2ed386b875d08394471e5))

## [1.5.12](https://github.com/yorickshan/html2canvas-pro/compare/v1.5.11...v1.5.12) (2025-10-10)

### Features

* add support for CSS rotate ([ff10bb1](https://github.com/yorickshan/html2canvas-pro/commit/ff10bb1baadec0b384ada9e850d712ac65ad9cc3))

## [1.5.11](https://github.com/yorickshan/html2canvas-pro/compare/v1.5.10...v1.5.11) (2025-05-12)

### Features

* add the `customIsSameOrigin` option to support custom same-origin checks ([dd9ef5e](https://github.com/yorickshan/html2canvas-pro/commit/dd9ef5ebb8439862f597b47c3379e5b6c9f17789))

## [1.5.10](https://github.com/yorickshan/html2canvas-pro/compare/v1.5.8...v1.5.10) (2025-04-27)

### Bug Fixes

* failed to execute 'addColorStop' on 'CanvasGradient' ([f84f057](https://github.com/yorickshan/html2canvas-pro/commit/f84f057ac36aa2f48a5768c10051eaa6311cb663))
* Remove duplicate enum value ([ccaa81d](https://github.com/yorickshan/html2canvas-pro/commit/ccaa81d2103b2ebb1b350e71e7d622aba03a6903))
* Resolve duplicate enum value ([2cf67f9](https://github.com/yorickshan/html2canvas-pro/commit/2cf67f911e9ba3e58c89a67b933b906af8e100a7))
* set font correctly in text input elements ([b0203c0](https://github.com/yorickshan/html2canvas-pro/commit/b0203c041fbdd0c68ba44fa2ddb068cf9f60fc5b))

## [1.5.8](https://github.com/yorickshan/html2canvas-pro/compare/v1.5.7...v1.5.8) (2024-07-22)

### Bug Fixes

* -webkit-text-stroke misaligned with the text ([48e771a](https://github.com/yorickshan/html2canvas-pro/commit/48e771ac906178fb4dfce31e8539894c389d6e44))

## [1.5.7](https://github.com/yorickshan/html2canvas-pro/compare/v1.5.6...v1.5.7) (2024-07-18)

## [1.5.6](https://github.com/yorickshan/html2canvas-pro/compare/v1.5.5...v1.5.6) (2024-07-12)

### Features

* **site:** add logo ([87aae87](https://github.com/yorickshan/html2canvas-pro/commit/87aae87178ddc43f3197a95062fcbb57e8c6888f))

### Bug Fixes

* ts warning ([31f4c6f](https://github.com/yorickshan/html2canvas-pro/commit/31f4c6f73bdf70e8e73ba4895a5dba599a6bd3de))

## [1.5.5](https://github.com/yorickshan/html2canvas-pro/compare/v1.5.4...v1.5.5) (2024-07-09)

### Bug Fixes

* fix error image use transfrom rotate style (Update stacking-context.ts ) [#3153](https://github.com/yorickshan/html2canvas-pro/issues/3153) ([2d9ee18](https://github.com/yorickshan/html2canvas-pro/commit/2d9ee18b53638bce5df304dc471552e394157ecd))
* incorrect typings path ([46c029f](https://github.com/yorickshan/html2canvas-pro/commit/46c029f9f02e1fdf6b62f63b7baf24a485912209))
* vertical text alignment fix [#3151](https://github.com/yorickshan/html2canvas-pro/issues/3151) ([92f6a33](https://github.com/yorickshan/html2canvas-pro/commit/92f6a3391f92da0569e7ec41d3052ecc7a205381))

## [1.5.4](https://github.com/yorickshan/html2canvas-pro/compare/v1.5.3...v1.5.4) (2024-07-08)

### Bug Fixes

* calculateBackgroundRendering may return width or height less than 1 [#2982](https://github.com/yorickshan/html2canvas-pro/issues/2982) ([0b1bdae](https://github.com/yorickshan/html2canvas-pro/commit/0b1bdaed3f5473ce1166632f8850f57b668e6b61))

### Performance Improvements

* migrate from Chromeless to Puppeteer ([25553e3](https://github.com/yorickshan/html2canvas-pro/commit/25553e3e675cf8cb2c08a807da31d0aab0159114))
* remove uglifyjs-webpack-plugin ([53beee8](https://github.com/yorickshan/html2canvas-pro/commit/53beee80659e729e0942b8092ba4e3950b7c72d8))

## [1.5.3](https://github.com/yorickshan/html2canvas-pro/compare/v1.5.2...v1.5.3) (2024-07-04)

### Bug Fixes

* added fix for Firefox issue ([c807c3f](https://github.com/yorickshan/html2canvas-pro/commit/c807c3fed1360a752c8ee5659992b52fcfb02613))

## [1.5.2](https://github.com/yorickshan/html2canvas-pro/compare/v1.5.1...v1.5.2) (2024-07-03)

### Features

* better color() support ([2559164](https://github.com/yorickshan/html2canvas-pro/commit/2559164c9890ea4985ce4cf09d27184da6ee22f8))
* color functions ([1c9ece3](https://github.com/yorickshan/html2canvas-pro/commit/1c9ece3887e229eb69b34a5bb082c059355518e2))
* complete work on relative from colors in the color() function ([ac6e331](https://github.com/yorickshan/html2canvas-pro/commit/ac6e33118be76734ff9b1f5cd92e147babd46548))
* work on relative color support ([88e6aba](https://github.com/yorickshan/html2canvas-pro/commit/88e6abaa47b9c59e49a7bc3c0008849cc365f787))

### Bug Fixes

* color function display-p3 conversion ([b9fd943](https://github.com/yorickshan/html2canvas-pro/commit/b9fd943332a5627a9cd86c62bd6029d461356c14))
* operation is insecure on safari ([71f7c28](https://github.com/yorickshan/html2canvas-pro/commit/71f7c283dfe5a8cd64b39343bc7cec85e3932200))
