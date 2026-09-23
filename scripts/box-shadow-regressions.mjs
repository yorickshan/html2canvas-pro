// Build first, then: node scripts/box-shadow-regressions.mjs
// This is a correctness test, not a baseline updater: failures are never blessed.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { PNG } from 'pngjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const bundlePath = path.resolve(root, process.env.BOX_SHADOW_BUNDLE || 'dist/html2canvas-pro.esm.js');
const output = path.resolve(root, process.env.BOX_SHADOW_OUTPUT || 'tmp/box-shadow-regressions');
const engines = { chromium, firefox, webkit };
const names = (process.env.BOX_SHADOW_BROWSERS || 'chromium,firefox,webkit').split(',');
for (const name of names) assert.ok(engines[name], `Unknown browser: ${name}`);
const bundle = await readFile(bundlePath);
await mkdir(output, { recursive: true });

// Keep tolerances fixed across browsers, scales and cases. Compare only pixels
// affected by the shadow (reference OR actual), so empty margins cannot hide loss.
// Values are on a 0..255 premultiplied RGBA scale; invisible RGB is immaterial.
const limits = { controlMAE: 1.5, shadowMAE: 8, badPixelDelta: 32, badPixelRatio: 0.10,
    minEffectRatio: 0.75, maxEffectRatio: 1.25 };
const cases = [
    { id: 'none', shadow: 'none' },
    { id: 'outer-hard', shadow: '18px 12px 0 0 rgb(30, 70, 210)' },
    { id: 'outer-blur', shadow: '14px 10px 12px 0 rgba(0, 0, 0, .6)' },
    { id: 'outer-negative-offset', shadow: '-18px -12px 8px 0 rgba(20, 40, 160, .65)' },
    { id: 'outer-positive-spread', shadow: '0 0 0 10px rgb(190, 30, 80)' },
    { id: 'outer-negative-spread', shadow: '20px 16px 0 -8px rgb(190, 30, 80)' },
    { id: 'outer-negative-spread-blur', shadow: '18px 14px 12px -6px rgba(0, 0, 0, .7)' },
    { id: 'outer-rounded', shadow: '12px 9px 16px 6px rgba(40, 20, 140, .6)', css: 'border-radius:24px' },
    { id: 'outer-circle', shadow: '-10px 12px 10px 4px rgba(0, 0, 0, .65)', css: 'width:96px;height:96px;border-radius:50%' },
    { id: 'multiple-order', shadow: '12px 8px 0 6px rgba(220, 20, 30, .8), -14px -8px 0 10px rgba(20, 70, 220, .8)' },
    { id: 'multiple-blurred', shadow: '12px 8px 14px 4px rgba(220, 20, 30, .65), -14px -8px 8px 2px rgba(20, 70, 220, .7)' },
    { id: 'inset-hard', shadow: 'inset 12px 8px 0 0 rgb(20, 40, 120)' },
    { id: 'inset-blur', shadow: 'inset 10px 8px 12px 4px rgba(0, 0, 0, .65)' },
    { id: 'inset-negative-offset', shadow: 'inset -12px -8px 0 0 rgb(20, 40, 120)' },
    { id: 'inset-positive-spread', shadow: 'inset 0 0 0 10px rgb(160, 20, 60)' },
    { id: 'inset-negative-spread', shadow: 'inset 14px 12px 8px -5px rgba(0, 0, 0, .8)' },
    { id: 'inset-rounded', shadow: 'inset -10px 8px 12px 5px rgba(0, 0, 0, .7)', css: 'border-radius:24px' },
    { id: 'mixed-inset-outer', shadow: 'inset 8px 5px 6px 2px rgba(20, 40, 120, .7), 12px 10px 10px 4px rgba(170, 30, 70, .6)', css: 'border-radius:16px' },
    { id: 'transparent-box', shadow: '14px 10px 10px 6px rgba(0, 0, 0, .65)', css: 'background:transparent;border-radius:20px' },
    { id: 'transparent-border', shadow: '12px 10px 8px 5px rgba(0, 0, 0, .65)', css: 'border:8px solid transparent;background-clip:padding-box;border-radius:24px' },
    { id: 'current-color', shadow: '15px 10px 4px currentColor', css: 'color:rgb(150, 20, 70)' },
    { id: 'overflow-clip', shadow: '18px 12px 14px 8px rgba(20, 30, 120, .7)', clip: true },
    { id: 'opacity-outer', shadow: '12px 8px 12px 6px rgba(0, 0, 0, .65)', layer: 'opacity:.5', css: 'border-radius:20px' },
    { id: 'opacity-inset', shadow: 'inset 10px 8px 10px 4px rgba(0, 0, 0, .7)', layer: 'opacity:.5', css: 'border-radius:20px' },
    { id: 'blur-layer', shadow: '12px 8px 10px 6px rgba(0, 0, 0, .65)', layer: 'filter:blur(3px);opacity:.6', css: 'border-radius:16px' },
    { id: 'blur-layer-svg', shadow: '12px 8px 10px 6px rgba(0, 0, 0, .65)', layer: 'filter:blur(3px);opacity:.6', css: 'border-radius:16px', svg: true },
    { id: 'drop-shadow-layer', shadow: '10px 8px 8px 4px rgba(120, 20, 70, .6)', layer: 'filter:drop-shadow(-12px 6px 5px rgba(20, 40, 150, .6));opacity:.6' },
    { id: 'offset-crop', shadow: '-18px -12px 12px 6px rgba(0, 0, 0, .65)', crop: { x: 85, y: 65, width: 165, height: 145 } },
    { id: 'offset-crop-surface', shadow: '-18px -12px 12px 6px rgba(0, 0, 0, .65)', layer: 'opacity:.5', crop: { x: 85, y: 65, width: 165, height: 145 } }
];

// Additional suites supply fixtures, not alternative metrics or tolerances.
const selectedCases = process.env.BOX_SHADOW_FIXTURES ? JSON.parse(process.env.BOX_SHADOW_FIXTURES) : cases;
assert.ok(Array.isArray(selectedCases) && selectedCases.length > 0, 'Expected a non-empty fixture list');
const scales = [...new Set(selectedCases.flatMap((test) => test.scales || [1, 2]))];
assert.ok(scales.every((scale) => Number.isFinite(scale) && scale > 0), 'Invalid capture scale');

const html = (test) => `<!doctype html><meta charset="utf-8"><title>${test.id}</title>
${test.fallback ? '<meta http-equiv="Content-Security-Policy" content="img-src \'none\'">' : ''}
<style>
* { box-sizing:border-box } html,body { margin:0;background:transparent }
#stage { position:relative;width:320px;height:260px;margin:40px;background:transparent }
#layer { position:absolute;inset:0;${test.layer || ''} }
#clip { position:absolute;${test.clip ? 'left:90px;top:70px;width:150px;height:110px;overflow:hidden;border-radius:18px' : 'inset:0'} }
.box { position:absolute;left:${test.clip ? 10 : 100}px;top:${test.clip ? 10 : 80}px;width:120px;height:90px;background:rgb(65,165,130);box-shadow:${test.shadow};${test.css || ''} }
</style><div id="stage"><div id="layer"><div id="clip"><div class="box"></div></div></div></div>
<script type="module">import renderer from '/bundle.js';window.renderer=renderer;</script>`;
const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/bundle.js') {
        res.writeHead(200, { 'Content-Type': 'text/javascript' }).end(bundle);
    } else {
        const test = selectedCases.find((item) => '/' + item.id === url.pathname);
        if (!test) return res.writeHead(404).end();
        res.writeHead(200, { 'Content-Type': 'text/html' }).end(html(test));
    }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const decode = (data) => PNG.sync.read(Buffer.from(data.split(',')[1], 'base64'));
async function nativeDOM(page, stage, name, prefix, region, scale) {
    if (name !== 'firefox') return crop(PNG.sync.read(await stage.screenshot({ omitBackground: true })), region, scale);
    // Playwright Firefox cannot omit the screenshot background. These fixtures
    // use source-over only: black = RGB * alpha; white - black = 255 * (1-alpha).
    // Reconstruct premultiplied transparency from two independently captured
    // opaque backgrounds, keeping both originals as evidence. No library output
    // participates in the reconstruction.
    const previous = await page.evaluate(() => document.documentElement.getAttribute('style'));
    let white, black;
    try {
        await page.evaluate(() => document.documentElement.style.setProperty('background', 'white', 'important'));
        white = crop(PNG.sync.read(await stage.screenshot()), region, scale);
        await page.evaluate(() => document.documentElement.style.setProperty('background', 'black', 'important'));
        black = crop(PNG.sync.read(await stage.screenshot()), region, scale);
    } finally {
        await page.evaluate((value) => {
            if (value === null) document.documentElement.removeAttribute('style');
            else document.documentElement.setAttribute('style', value);
        }, previous);
    }
    assert.equal(white.width, black.width);
    assert.equal(white.height, black.height);
    const result = new PNG({ width: white.width, height: white.height });
    for (let i = 0; i < result.data.length; i += 4) {
        const differences = [0, 1, 2].map((c) => white.data[i + c] - black.data[i + c]);
        assert.ok(Math.max(...differences) - Math.min(...differences) <= 3,
            'Native reference does not satisfy source-over background reconstruction');
        const alpha = Math.max(0, Math.min(255, Math.round(255 - differences.reduce((sum, v) => sum + v, 0) / 3)));
        result.data[i + 3] = alpha;
        for (let c = 0; c < 3; c++) result.data[i + c] = alpha ? Math.min(255, Math.round(black.data[i + c] * 255 / alpha)) : 0;
    }
    await writeFile(path.join(output, `${prefix}-white.png`), PNG.sync.write(white));
    await writeFile(path.join(output, `${prefix}-black.png`), PNG.sync.write(black));
    return result;
}
function vector(data, i) {
    const a = data[i + 3] / 255;
    return [data[i] * a, data[i + 1] * a, data[i + 2] * a, data[i + 3]];
}
function measure(reference, capture, referenceControl, captureControl) {
    for (const other of [capture, referenceControl, captureControl]) {
        assert.equal(other.width, reference.width, 'Width differs from native DOM');
        assert.equal(other.height, reference.height, 'Height differs from native DOM');
    }
    let roi = 0, expected = 0, bad = 0, error = 0, controlError = 0;
    let expectedEnergy = 0, actualEnergy = 0;
    const diff = new PNG({ width: reference.width, height: reference.height });
    for (let i = 0; i < reference.data.length; i += 4) {
        const r = vector(reference.data, i), a = vector(capture.data, i);
        const rc = vector(referenceControl.data, i), ac = vector(captureControl.data, i);
        const delta = r.map((v, c) => Math.abs(v - a[c]));
        const re = r.map((v, c) => Math.abs(v - rc[c]));
        const ae = a.map((v, c) => Math.abs(v - ac[c]));
        controlError += rc.reduce((sum, v, c) => sum + Math.abs(v - ac[c]), 0);
        if (Math.max(...re) >= 3) expected++;
        if (Math.max(...re, ...ae) >= 3) {
            roi++;
            error += delta.reduce((sum, v) => sum + v, 0);
            if (Math.max(...delta) > limits.badPixelDelta) bad++;
            expectedEnergy += re.reduce((sum, v) => sum + v, 0);
            actualEnergy += ae.reduce((sum, v) => sum + v, 0);
        }
        // White means equal; stronger red means a larger premultiplied difference.
        const intensity = Math.min(255, Math.round(Math.max(...delta) * 4));
        diff.data.set([255, 255 - intensity, 255 - intensity, 255], i);
    }
    return { expectedPixels: expected, roiPixels: roi, controlMAE: controlError / reference.data.length,
        shadowMAE: roi ? error / (roi * 4) : 0, badPixelRatio: roi ? bad / roi : 0,
        effectRatio: expectedEnergy ? actualEnergy / expectedEnergy : null, diff };
}
function violations(metrics, none = false) {
    const errors = [];
    if (metrics.controlMAE > limits.controlMAE) errors.push('shadow-free control differs from DOM');
    if (!none && metrics.expectedPixels < 16) errors.push('native reference has no meaningful shadow');
    if (metrics.shadowMAE > limits.shadowMAE) errors.push('shadow-region MAE exceeded');
    if (metrics.badPixelRatio > limits.badPixelRatio) errors.push('too many incorrect shadow pixels');
    if (!none && (metrics.effectRatio < limits.minEffectRatio || metrics.effectRatio > limits.maxEffectRatio))
        errors.push('shadow effect is missing, misplaced, or too strong');
    return errors;
}
function crop(png, region, scale) {
    if (!region) return png;
    const result = new PNG({ width: region.width * scale, height: region.height * scale });
    PNG.bitblt(png, result, region.x * scale, region.y * scale, result.width, result.height, 0, 0);
    return result;
}
const results = [];
let gitRevision = null;
try { gitRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); } catch { /* Optional outside a checkout. */ }
const metadata = { gitRevision, bundle: path.relative(root, bundlePath),
    bundleSHA256: createHash('sha256').update(bundle).digest('hex'), node: process.version,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`, limits, browsers: {}, started: new Date().toISOString() };
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
async function report() {
    const summary = { passed: results.filter((r) => r.passed).length, failed: results.filter((r) => !r.passed).length };
    await writeFile(path.join(output, 'results.json'), JSON.stringify({ metadata, summary, results }, null, 2));
    await writeFile(path.join(output, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Box-shadow correctness</title>
<style>body{font:15px system-ui;margin:28px;max-width:1400px}table{border-collapse:collapse}td,th{padding:6px;border:1px solid #bbb;text-align:left}img{max-width:30%;background:repeating-conic-gradient(#ddd 0% 25%,#fff 0% 50%) 50%/16px 16px}details{margin:20px 0}.fail{color:#b00020}</style>
<h1>Box-shadow: native DOM vs html2canvas-pro</h1><p>${summary.passed} passed; ${summary.failed} failed. No expected failures are suppressed.</p>
<p>Commit: <code>${escape(gitRevision)}</code><br>Bundle SHA256: <code>${metadata.bundleSHA256}</code></p>
<p>Each image triplet is native DOM / library / amplified pixel difference. Transparent PNGs use a checkerboard. Firefox transparency is reconstructed from native white/black screenshots, which are also saved. Thresholds apply to the union of native and rendered shadow regions, not empty margins.</p>
<pre>${escape(JSON.stringify(metadata, null, 2))}</pre>
${results.map((r) => `<details ${r.passed ? '' : 'open'}><summary class="${r.passed ? '' : 'fail'}">${escape(r.key)}: ${r.passed ? 'PASS' : 'FAIL'}</summary><pre>${escape(JSON.stringify(r, null, 2))}</pre>${r.images ? ['native', 'actual', 'diff'].map((kind) => `<a href="${r.key}-${kind}.png"><img alt="${kind}" src="${r.key}-${kind}.png"></a>`).join(' ') : ''}</details>`).join('\n')}`);
}
try {
    for (const name of names) {
        let browser;
        try {
            browser = await engines[name].launch({ headless: true });
            metadata.browsers[name] = browser.version();
            for (const scale of scales) {
                for (const test of selectedCases) {
                    if (!(test.scales || [1, 2]).includes(scale)) continue;
                    const key = `${name}-${scale}x-${test.id}`;
                    const entry = { key, browser: name, scale, id: test.id, backend: test.fallback ? 'forced-native-shadow-fallback' : test.svg ? 'forced-svg' : 'auto', referenceMethod: name === 'firefox' ? 'dual-background-alpha' : 'transparent-screenshot', passed: false };
                    const page = await browser.newPage({ viewport: { width: 500, height: 420 }, deviceScaleFactor: scale });
                    const pageErrors = [];
                    page.on('pageerror', (error) => pageErrors.push(error.message));
                    page.setDefaultTimeout(15000);
                    try {
                        if (test.svg || test.fallback) await page.addInitScript(() => {
                            Object.defineProperty(CanvasRenderingContext2D.prototype, 'filter', {
                                configurable: true, get() { return 'none'; }, set() {}
                            });
                        });
                        await page.goto(origin + '/' + test.id);
                        await page.waitForFunction(() => typeof window.renderer === 'function');
                        const stage = page.locator('#stage');
                        entry.computed = await page.locator('.box').evaluate((element) => ({
                            boxShadow: getComputedStyle(element).boxShadow,
                            borderRadius: getComputedStyle(element).borderRadius
                        }));
                        const native = await nativeDOM(page, stage, name, key + '-native', test.crop, scale);
                        const capture = async () => page.evaluate(async ({ scale, region }) => {
                            const canvas = await window.renderer(document.getElementById('stage'), {
                                scale, backgroundColor: null, logging: false, ...(region || {})
                            });
                            return canvas.toDataURL();
                        }, { scale, region: test.crop });
                        const actual = decode(await capture());
                        // Firefox's addStyleTag observes unrelated delayed CSP image
                        // errors. Change the fixture inline instead; do not suppress
                        // page errors or weaken the native/capture comparisons.
                        const originalStyle = await page.locator('.box').evaluate((element) => {
                            const style = element.getAttribute('style');
                            element.style.setProperty('box-shadow', 'none', 'important');
                            return style;
                        });
                        const nativeControl = await nativeDOM(page, stage, name, key + '-native-no-shadow', test.crop, scale);
                        const actualControl = decode(await capture());
                        await page.locator('.box').evaluate((element, style) => {
                            if (style === null) element.removeAttribute('style');
                            else element.setAttribute('style', style);
                        }, originalStyle);
                        const { diff, ...metrics } = measure(native, actual, nativeControl, actualControl);
                        entry.metrics = metrics;
                        entry.errors = violations(metrics, test.id === 'none');
                        // Negative control: a renderer returning the shadow-free image must
                        // fail the SAME acceptance criteria, even for a tiny/soft shadow.
                        if (test.id !== 'none') {
                            const stripped = measure(native, actualControl, nativeControl, actualControl);
                            entry.missingShadowDetected = violations(stripped).length > 0;
                            if (!entry.missingShadowDetected) entry.errors.push('oracle accepted a removed shadow');
                        }
                        if (pageErrors.length) entry.errors.push(...pageErrors);
                        entry.passed = entry.errors.length === 0;
                        for (const [suffix, png] of Object.entries({ native, actual, diff, 'native-no-shadow': nativeControl, 'actual-no-shadow': actualControl }))
                            await writeFile(path.join(output, `${key}-${suffix}.png`), PNG.sync.write(png));
                        entry.images = true;
                    } catch (error) {
                        entry.errors = [error.stack || String(error)];
                    } finally {
                        await page.close();
                    }
                    results.push(entry);
                    console.log(JSON.stringify(entry));
                    await report();
                }
            }
        } catch (error) {
            results.push({ key: `${name}-launch`, browser: name, passed: false, errors: [error.stack || String(error)] });
        } finally {
            if (browser) await browser.close();
        }
    }
} finally {
    metadata.finished = new Date().toISOString();
    await report();
    await new Promise((resolve) => server.close(resolve));
}
const failures = results.filter((r) => !r.passed);
console.log(`Box-shadow regressions: ${results.length - failures.length} passed, ${failures.length} failed. Report: ${output}`);
if (failures.length) process.exitCode = 1;
