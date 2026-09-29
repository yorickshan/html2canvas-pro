import { defineConfig } from 'vitest/config';

/**
 * Layered coverage thresholds.
 *
 * Unit tests (jsdom) cannot exercise canvas painting, so the browser-only
 * render orchestrators sit far below the layers they drag down. Those files
 * are gated by the karma reftest suite (115 HTML reftests in a real browser,
 * run in CI on a browser matrix) instead of by unit coverage.
 *
 * Layer gates measure each subtree's aggregate at its real unit-testable
 * level (~1.5–2pp headroom), so pure-logic modules are no longer implicitly
 * taxed by the browser-only files under the global threshold. The global
 * values remain as a coarse backstop over the whole tree.
 */
export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        // vmThreads reuses one jsdom environment per worker instead of building
        // one per test file (the environment dominates suite wall time).
        pool: 'vmThreads',
        include: ['src/**/__tests__/**/*.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/__tests__/**',
                'src/**/__mocks__/**',
                'src/global.d.ts'
            ],
            thresholds: {
                // Global backstop (includes the browser-only render files).
                branches: 70,
                functions: 75,
                lines: 60,
                statements: 60,
                // Pure CSS parsing / typed values — no browser dependency.
                'src/css/**': {
                    branches: 82,
                    functions: 92,
                    statements: 90,
                    lines: 90
                },
                // Pipeline orchestration, caching, validation — jsdom-testable.
                'src/core/**': {
                    branches: 88,
                    functions: 92,
                    statements: 92,
                    lines: 92
                },
                // DOM snapshot containers and replaced-element containers.
                // document-cloner iframe quirks remain reftest territory.
                'src/dom/**': {
                    branches: 60,
                    functions: 82,
                    statements: 72,
                    lines: 71
                },
                // Render-domain pure logic (paths, curves, effects, bounds).
                'src/render/*.ts': {
                    branches: 76,
                    functions: 88,
                    statements: 85,
                    lines: 85
                },
                // Canvas painting layer: unit mocks only reach the paint
                // helpers; the orchestrators are covered by reftests.
                'src/render/canvas/**': {
                    branches: 40,
                    functions: 57,
                    statements: 46,
                    lines: 46
                }
            }
        }
    }
});
