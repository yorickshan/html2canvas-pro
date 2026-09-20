// Native CSS/Canvas acceptance checks complement filter.test.ts serialization tests.
// Run with: node scripts/filter-descriptor-regressions.mjs (no build required).
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

// Nonzero unitless lengths are invalid; unitless zero and an omitted radius are valid.
// https://www.w3.org/TR/filter-effects-1/#funcdef-filter-blur
// https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-filter
const cases = [
    { value: 'blur(5)', valid: false },
    { value: 'blur(0.5)', valid: false },
    { value: 'blur(-5)', valid: false },
    { value: 'blur(5%)', valid: false },
    { value: 'blur(-5px)', valid: false },
    { value: 'blur(5pxpx)', valid: false },
    { value: 'blur(5) brightness(2)', valid: false },
    { value: 'blur(0)', valid: true, computed: 'blur(0px)', noEffect: true },
    { value: 'blur(0px)', valid: true, computed: 'blur(0px)', noEffect: true },
    { value: 'blur()', valid: true, computed: 'blur(0px)', noEffect: true },
    { value: 'blur(5px)', valid: true, computed: 'blur(5px)', noEffect: false },
    // Subpixel kernels may be quantized; check acceptance, not a minimum visual difference.
    { value: 'blur(0.5px)', valid: true, computed: 'blur(0.5px)' }
];
const output = new URL('../tmp/filter-surface-regressions/', import.meta.url);
await mkdir(output, { recursive: true });
const reports = [];
try {
    for (const [name, engine] of Object.entries({ chromium, webkit })) {
        const browser = await engine.launch({ headless: true });
        try {
            const page = await browser.newPage();
            await page.setContent('<!doctype html><html><body></body></html>');
            const report = await page.evaluate((cases) => {
                const supportsCanvasFilter = 'filter' in document.createElement('canvas').getContext('2d');
                const draw = (value, initial = 'none') => {
                    const canvas = document.createElement('canvas');
                    canvas.width = canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    ctx.filter = initial;
                    const before = ctx.filter;
                    ctx.filter = value;
                    ctx.fillRect(24, 24, 16, 16);
                    return { before, after: ctx.filter, pixels: ctx.getImageData(0, 0, 64, 64).data };
                };
                const samePixels = (a, b) => a.pixels.every((value, index) => value === b.pixels[index]);
                // Detect support before any assignment: WebKit without CanvasFilters must not
                // appear supported just because setting ctx.filter creates a JavaScript expando.
                const plain = supportsCanvasFilter ? draw('none') : null;
                const blurred = supportsCanvasFilter ? draw('blur(2px)') : null;
                const rows = cases.map(({ value }) => {
                    const element = document.body.appendChild(document.createElement('div'));
                    try {
                        element.style.filter = value;
                        const row = {
                            value,
                            cssSupported: CSS.supports('filter', value),
                            inline: element.style.filter,
                            computed: getComputedStyle(element).filter
                        };
                        element.style.filter = 'blur(2px)';
                        const previous = element.style.filter;
                        element.style.filter = value;
                        row.domKeptPrevious = element.style.filter === previous;
                        if (supportsCanvasFilter) {
                            const fresh = draw(value);
                            const seeded = draw(value, 'blur(2px)');
                            row.canvas = {
                                freshFilter: fresh.after,
                                seedFilter: seeded.before,
                                seededFilter: seeded.after,
                                freshMatchesNone: samePixels(fresh, plain),
                                seededMatchesBlur: samePixels(seeded, blurred),
                                seededMatchesNone: samePixels(seeded, plain)
                            };
                        }
                        return row;
                    } finally {
                        element.remove();
                    }
                });
                return {
                    supportsCanvasFilter,
                    nativeBlurChangesPixels: supportsCanvasFilter ? !samePixels(plain, blurred) : null,
                    nativeBlurOutsideAlpha: supportsCanvasFilter ? blurred.pixels[(32 * 64 + 22) * 4 + 3] : null,
                    rows
                };
            }, cases);
            reports.push({ engine: name, version: browser.version(), ...report });
            // Persist the observations before assertions so failed runs also retain evidence.
            await writeFile(new URL('filter-descriptor.json', output), JSON.stringify(reports, null, 2) + '\n');
            if (name === 'chromium') assert.equal(report.supportsCanvasFilter, true, 'Chromium CanvasFilters missing');
            if (report.supportsCanvasFilter) {
                assert.equal(report.nativeBlurChangesPixels, true, `${name}: native blur must actually render`);
                assert.ok(report.nativeBlurOutsideAlpha > 0, `${name}: blur must extend beyond the source rectangle`);
            }
            for (const [index, row] of report.rows.entries()) {
                const expected = cases[index];
                const label = `${name}/${expected.value}`;
                assert.equal(row.value, expected.value, label);
                assert.equal(row.cssSupported, expected.valid, `${label}: CSS.supports`);
                assert.equal(row.computed, expected.computed || 'none', `${label}: computed filter`);
                if (!expected.valid) {
                    assert.equal(row.inline, '', `${label}: invalid CSS must not become a pixel length`);
                    assert.equal(row.domKeptPrevious, true, `${label}: invalid CSS must preserve the previous value`);
                }
                if (!report.supportsCanvasFilter) continue;
                const canvas = row.canvas;
                assert.notEqual(canvas.seedFilter, 'none', `${label}: positive blur control must be accepted`);
                if (!expected.valid) {
                    // Invalid assignments are ignored; they neither reset the filter nor add px.
                    assert.equal(canvas.freshFilter, 'none', `${label}: invalid filter on a fresh context`);
                    assert.equal(canvas.seededFilter, canvas.seedFilter, `${label}: prior filter must survive`);
                    assert.equal(canvas.freshMatchesNone, true, `${label}: invalid filter must not blur`);
                    assert.equal(canvas.seededMatchesBlur, true, `${label}: prior blur pixels must survive`);
                } else {
                    assert.notEqual(canvas.freshFilter, 'none', `${label}: valid filter must be accepted`);
                    assert.notEqual(canvas.seededFilter, canvas.seedFilter, `${label}: valid filter must replace prior blur`);
                    if (expected.noEffect !== undefined) {
                        assert.equal(canvas.freshMatchesNone, expected.noEffect, `${label}: fresh-context pixels`);
                        assert.equal(canvas.seededMatchesNone, expected.noEffect, `${label}: seeded-context pixels`);
                    }
                }
            }
            console.log(JSON.stringify({
                engine: name,
                version: browser.version(),
                cssCases: report.rows.length,
                canvasCases: report.supportsCanvasFilter ? report.rows.length : 0,
                canvasStatus: report.supportsCanvasFilter ? 'passed' : 'unsupported; native Canvas checks skipped',
                status: 'passed'
            }));
            await page.close();
        } finally {
            await browser.close();
        }
    }
} finally {
    await writeFile(new URL('filter-descriptor.json', output), JSON.stringify(reports, null, 2) + '\n');
}
