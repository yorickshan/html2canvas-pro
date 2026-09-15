// Build first. Runs actual Chromium/WebKit pixels, fallback, cleanup and memory checks.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { PNG } from 'pngjs';
import { startFilterServer } from './filter-probe-server.mjs';
const output = new URL('../tmp/filter-surface-regressions/', import.meta.url);
await mkdir(output, { recursive: true });
const decode = (url) => PNG.sync.read(Buffer.from(url.split(',')[1], 'base64'));
const alpha = (png, x, y) => png.data[(y * png.width + x) * 4 + 3];
function mae(reference, capture) {
    assert.equal(reference.width, capture.width);
    assert.equal(reference.height, capture.height);
    let total = 0;
    for (let i = 0; i < reference.data.length; i += 4)
        for (let c = 0; c < 3; c++) {
            const a = capture.data[i + 3] / 255;
            total += Math.abs(reference.data[i + c] - capture.data[i + c] * a - 255 * (1 - a));
        }
    return total / (reference.width * reference.height * 3);
}
const server = await startFilterServer();
const results = [];
const chromiumReferences = new Map();
try {
    for (const [name, engine] of Object.entries({ chromium, webkit })) {
        const browser = await engine.launch({ headless: true });
        try {
            for (const scale of [1, 2]) {
                const page = await browser.newPage({
                    viewport: { width: 1100, height: 1100 },
                    deviceScaleFactor: scale
                });
                await page.goto(server.url + '/tests/reftests/filter/surface-regressions.html');
                for (const id of ['combined', 'z-order', 'nested-outset', 'text-box-shadow', 'rounded-box-shadow']) {
                    const node = page.locator('#' + id);
                    const nativePng = await node.screenshot();
                    const dom = PNG.sync.read(nativePng);
                    await writeFile(new URL(`${name}-${scale}-${id}-native.png`, output), nativePng);
                    if (name === 'chromium' && id === 'nested-outset') chromiumReferences.set(scale, dom);
                    const rendered = await page.evaluate(
                        async ({ id, scale }) => {
                            const serialize = HTMLCanvasElement.prototype.toDataURL;
                            const surfaces = [];
                            HTMLCanvasElement.prototype.toDataURL = function (...args) {
                                const value = serialize.apply(this, args);
                                if (id === 'text-box-shadow') surfaces.push(value);
                                return value;
                            };
                            try {
                                const canvas = await window.html2canvas(document.getElementById(id), {
                                    scale,
                                    backgroundColor: null,
                                    logging: false
                                });
                                return { image: serialize.call(canvas), surfaces };
                            } finally {
                                HTMLCanvasElement.prototype.toDataURL = serialize;
                            }
                        },
                        { id, scale }
                    );
                    const image = rendered.image;
                    for (const [index, surface] of rendered.surfaces.entries())
                        await writeFile(
                            new URL(`${name}-${scale}-${id}-surface-${index}.png`, output),
                            Buffer.from(surface.split(',')[1], 'base64')
                        );
                    const capture = decode(image),
                        error = mae(dom, capture);
                    results.push({ engine: name, scale, id, mae: error });
                    console.log(JSON.stringify(results.at(-1)));
                    await writeFile(
                        new URL(`${name}-${scale}-${id}.png`, output),
                        Buffer.from(image.split(',')[1], 'base64')
                    );
                    if (name === 'webkit' && id === 'nested-outset') {
                        // WebKit's live DOM loses/clips this nested outside shadow.
                        // Use the independently captured Chromium DOM as the geometry oracle.
                        // A release-relative ratio varies with each platform's Canvas filter support;
                        // retain both WebKit measurements without calling them native equality.
                        const before = await page.evaluate(
                            async ({ id, scale }) => {
                                const { default: renderer } = await import('/build/html2canvas-pro-baseline.esm.js');
                                return (
                                    await renderer(document.getElementById(id), {
                                        scale,
                                        backgroundColor: null,
                                        logging: false
                                    })
                                ).toDataURL();
                            },
                            { id, scale }
                        );
                        const baselineError = mae(dom, decode(before));
                        await writeFile(
                            new URL(`${name}-${scale}-${id}-before.png`, output),
                            Buffer.from(before.split(',')[1], 'base64')
                        );
                        const chromiumReferenceMAE = mae(chromiumReferences.get(scale), capture);
                        Object.assign(results.at(-1), {
                            baselineMAE: baselineError,
                            chromiumReferenceMAE,
                            nativeShadowDiscrepancy: true
                        });
                        console.log(JSON.stringify(results.at(-1)));
                        await writeFile(new URL('results.json', output), JSON.stringify(results, null, 2));
                        assert.ok(
                            chromiumReferenceMAE < 2,
                            `nested WebKit shadow differs from Chromium DOM: ${chromiumReferenceMAE}`
                        );
                        assert.ok(alpha(capture, 40 * scale, 60 * scale) > 5, 'outside nested shadow was lost');
                    } else {
                        if (error >= 2) {
                            const before = await page.evaluate(
                                async ({ id, scale }) => {
                                    const { default: renderer } =
                                        await import('/build/html2canvas-pro-baseline.esm.js');
                                    return (
                                        await renderer(document.getElementById(id), {
                                            scale,
                                            backgroundColor: null,
                                            logging: false
                                        })
                                    ).toDataURL();
                                },
                                { id, scale }
                            );
                            await writeFile(
                                new URL(`${name}-${scale}-${id}-before.png`, output),
                                Buffer.from(before.split(',')[1], 'base64')
                            );
                            console.log(
                                JSON.stringify({
                                    engine: name,
                                    scale,
                                    id,
                                    baselineMAE: mae(dom, decode(before)),
                                    afterMAE: error
                                })
                            );
                        }
                        assert.ok(error < 2, `${name}/${id} differs from native DOM: ${error}`);
                    }
                    if (id === 'combined') assert.ok(Math.abs(alpha(capture, 140 * scale, 110 * scale) - 128) <= 1);
                }
                // An offset crop must keep negative shadow/blur contributors beyond its edge.
                const crop = await page.evaluate(async (scale) => {
                    const stage = document.getElementById('combined');
                    const b = stage.getBoundingClientRect();
                    const full = await window.html2canvas(stage, { scale, backgroundColor: null, logging: false });
                    const part = await window.html2canvas(stage, {
                        scale,
                        backgroundColor: null,
                        logging: false,
                        x: 40,
                        y: 30,
                        width: 180,
                        height: 150
                    });
                    const reference = document.createElement('canvas');
                    reference.width = part.width;
                    reference.height = part.height;
                    reference
                        .getContext('2d')
                        .drawImage(
                            full,
                            40 * scale,
                            30 * scale,
                            part.width,
                            part.height,
                            0,
                            0,
                            part.width,
                            part.height
                        );
                    return { a: part.toDataURL(), b: reference.toDataURL(), bounds: [b.x, b.y] };
                }, scale);
                assert.ok(decode(crop.a).data.equals(decode(crop.b).data), 'crop must preserve signed filter outsets');
                await page.close();
            }
            const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
            await page.goto(server.url + '/tests/reftests/filter/surface-regressions.html');
            const fallback = await page.evaluate(async () => {
                const { default: before } = await import('/build/html2canvas-pro-baseline.esm.js');
                const stage = document.getElementById('unsupported'),
                    root = document.getElementById('unsupported-layer');
                root.style.filter = 'none';
                root.style.opacity = '.5';
                const entries = [];
                const originalDecode = HTMLImageElement.prototype.decode;
                for (const target of ['unsupported-ancestor', 'unsupported-child'])
                    for (const [property, value] of [
                        ['transform', 'rotate(12deg)'],
                        ['rotate', '12deg'],
                        ['zoom', '1.2'],
                        ['mixBlendMode', 'multiply'],
                        ['clipPath', 'inset(8px)'],
                        ['filter', 'contrast(2)']
                    ]) {
                        const element = document.getElementById(target);
                        element.style[property] = value;
                        let calls = 0;
                        HTMLImageElement.prototype.decode = function () {
                            if (this.src.startsWith('data:image/svg+xml')) calls++;
                            return originalDecode.call(this);
                        };
                        try {
                            const a = await before(stage, { scale: 1, backgroundColor: null, logging: false });
                            const b = await window.html2canvas(stage, {
                                scale: 1,
                                backgroundColor: null,
                                logging: false
                            });
                            entries.push({ target, property, calls, before: a.toDataURL(), after: b.toDataURL() });
                        } finally {
                            HTMLImageElement.prototype.decode = originalDecode;
                            element.style[property] = '';
                        }
                    }
                return entries;
            });
            for (const row of fallback) {
                assert.equal(row.calls, 0, `${row.property} must retain the existing path`);
                assert.ok(
                    decode(row.before).data.equals(decode(row.after).data),
                    `${row.target}/${row.property} fallback changed`
                );
            }
            // Real cross-origin taint, not an injected SecurityError. Both versions return unreadable canvases.
            const taint = await page.evaluate(async (foreignUrl) => {
                const { default: before } = await import('/build/html2canvas-pro-baseline.esm.js');
                const stage = document.getElementById('combined');
                stage.querySelector('.layer').innerHTML =
                    `<img src="${foreignUrl}" style="position:absolute;left:80px;top:80px;width:100px;height:60px">`;
                await stage.querySelector('img').decode();
                const rows = [];
                for (const renderer of [before, window.html2canvas])
                    for (const allowTaint of [false, true]) {
                        const result = await renderer(stage, {
                            scale: 1,
                            allowTaint,
                            backgroundColor: null,
                            logging: false
                        });
                        let readError = null;
                        try {
                            result.toDataURL();
                        } catch (e) {
                            readError = e.name;
                        }
                        rows.push({
                            allowTaint,
                            readError,
                            iframes: document.querySelectorAll('.html2canvas-container').length
                        });
                    }
                return rows;
            }, server.foreignUrl);
            for (const row of taint) {
                assert.equal(row.readError, row.allowTaint ? 'SecurityError' : null);
                assert.equal(row.iframes, 0);
            }
            await page.goto(server.url + '/tests/reftests/filter/surface-regressions.html');
            const lifecycle = await page.evaluate(async () => {
                const rows = [];
                for (const id of ['combined', 'text-box-shadow']) {
                    const stage = document.getElementById(id);
                    for (const mode of ['decode-failure', 'abort', 'render-failure', 'retain-container']) {
                        const originalDecode = HTMLImageElement.prototype.decode,
                            originalFill = CanvasRenderingContext2D.prototype.fill;
                        const originalCreate = document.createElement;
                        const canvases = [];
                        let error = null;
                        let result;
                        document.createElement = function (tag, ...args) {
                            const element = originalCreate.call(this, tag, ...args);
                            if (tag === 'canvas') canvases.push(element);
                            return element;
                        };
                        const controller = new AbortController();
                        if (mode === 'abort')
                            HTMLImageElement.prototype.decode = function () {
                                setTimeout(() => controller.abort(), 20);
                                return new Promise(() => {});
                            };
                        if (mode === 'decode-failure')
                            HTMLImageElement.prototype.decode = () =>
                                Promise.reject(new Error('Injected SVG decode failure'));
                        if (mode === 'render-failure' || mode === 'retain-container')
                            CanvasRenderingContext2D.prototype.fill = () => {
                                throw new Error('Injected raster failure');
                            };
                        const start = performance.now();
                        try {
                            result = await window.html2canvas(stage, {
                                scale: 1,
                                backgroundColor: null,
                                logging: false,
                                signal: controller.signal,
                                removeContainer: mode !== 'retain-container'
                            });
                        } catch (e) {
                            error = e.name + ': ' + e.message;
                        } finally {
                            HTMLImageElement.prototype.decode = originalDecode;
                            CanvasRenderingContext2D.prototype.fill = originalFill;
                            document.createElement = originalCreate;
                        }
                        rows.push({
                            id,
                            mode,
                            error,
                            elapsed: performance.now() - start,
                            iframes: document.querySelectorAll('.html2canvas-container').length,
                            unreleased: canvases.filter((c) => c !== result && c.width * c.height > 0).length
                        });
                        document.querySelectorAll('.html2canvas-container').forEach((frame) => frame.remove());
                    }
                }
                return rows;
            });
            for (const row of lifecycle) {
                assert.equal(row.iframes, row.mode === 'retain-container' ? 1 : 0, JSON.stringify(row));
                assert.equal(row.unreleased, 0, JSON.stringify(row));
                if (row.mode === 'decode-failure') assert.equal(row.error, null);
                else assert.match(row.error, row.mode === 'abort' ? /^AbortError/ : /Injected raster failure/);
                if (row.mode === 'abort') assert.ok(row.elapsed < 3000);
            }
            await page.goto(server.url + '/tests/reftests/filter/surface-regressions.html?csp');
            const csp = await page.evaluate(async () => {
                const violations = [];
                document.addEventListener('securitypolicyviolation', (e) => violations.push(e.blockedURI));
                const stage = document.getElementById('combined');
                const options = { scale: 1, backgroundColor: null, logging: false };
                const b = await window.html2canvas(stage, options);
                const originalDecode = HTMLImageElement.prototype.decode;
                HTMLImageElement.prototype.decode = () => Promise.reject(new Error('Forced legacy reference'));
                let a;
                try {
                    a = await window.html2canvas(stage, options);
                } finally {
                    HTMLImageElement.prototype.decode = originalDecode;
                }
                return {
                    before: a.toDataURL(),
                    after: b.toDataURL(),
                    violations,
                    iframes: document.querySelectorAll('.html2canvas-container').length
                };
            });
            assert.ok(decode(csp.before).data.equals(decode(csp.after).data), 'CSP fallback changed baseline output');
            assert.equal(csp.iframes, 0);
            assert.ok(csp.violations.includes('data'), 'real CSP must block the SVG data image');
            assert.ok(alpha(decode(csp.after), 140, 110) > 200, 'CSP must retain legacy per-draw opacity');
            await page.close();
            console.log(JSON.stringify({ engine: name, fallback: 12, taint: 'passed', lifecycle, csp: 'passed' }));
        } finally {
            await browser.close();
        }
    }
    await writeFile(new URL('results.json', output), JSON.stringify(results, null, 2) + '\n');
    console.log('PASS: Chromium/WebKit pixels, unsupported paths, taint, CSP, decode failure, abort and cleanup');
} finally {
    await server.close();
}
