// Build first. Validate production backend selection independently of timing.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, firefox, webkit } from 'playwright';
import { startFilterServer } from './filter-probe-server.mjs';
const server = await startFilterServer();
const output = new URL('../tmp/filter-surface-regressions/performance/', import.meta.url);
await mkdir(output, { recursive: true });
const reports = [];
try {
    for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
        const browser = await engine.launch({ headless: true });
        const report = { engine: name, version: browser.version() };
        reports.push(report);
        try {
            const page = await browser.newPage();
            await page.goto(server.url + '/tests/reftests/filter/surface-regressions.html');
            report.matrix = await page.evaluate(async () => {
                const { supportsNativeFilters, renderFilterSurface, renderSvgFilterSurface, releaseSurface } =
                    await import('/build/filter-surface-benchmark.js');
                const supported = supportsNativeFilters();
                const check = (value, message) => { if (!value) throw new Error(message); };
                const source = document.createElement('canvas');
                source.width = source.height = 384;
                const context = source.getContext('2d');
                context.fillStyle = '#176b70'; context.fillRect(100, 100, 140, 140);
                context.fillStyle = 'rgba(255,20,90,.6)'; context.fillRect(140, 120, 140, 140);
                const filters = [
                    { blur: 0 }, { blur: 4 }, { blur: .5 },
                    { blur: 0, shadow: { x: 15, y: -12, blur: 0, color: 'rgba(255,0,0,.6)' } },
                    { blur: 0, shadow: { x: -20, y: 15, blur: 6, color: 'rgba(0,0,0,.6)' } },
                    { blur: 4, shadow: { x: -20, y: -15, blur: 8, color: 'rgba(0,0,0,.6)' } }
                ];
                const rows = [], original = HTMLCanvasElement.prototype.toDataURL;
                let encodes = 0;
                HTMLCanvasElement.prototype.toDataURL = function (...args) { encodes++; return original.apply(this, args); };
                try {
                    for (const scale of [1, 2]) for (const opacity of [0, .25, .5, 1]) for (const filter of filters) {
                        let a, b;
                        try {
                            encodes = 0;
                            a = await renderFilterSurface(source, filter, opacity, scale);
                            const nativeEncodes = encodes;
                            b = await renderSvgFilterSurface(source, filter, opacity, scale);
                            const ad = a.getContext('2d').getImageData(0, 0, 384, 384).data;
                            const bd = b.getContext('2d').getImageData(0, 0, 384, 384).data;
                            let rgb = 0, alpha = 0;
                            for (let i = 0; i < ad.length; i += 4) {
                                const aa = ad[i + 3] / 255, ba = bd[i + 3] / 255;
                                for (let c = 0; c < 3; c++) rgb += Math.abs(ad[i + c] * aa + 255 * (1 - aa) - bd[i + c] * ba - 255 * (1 - ba));
                                alpha += Math.abs(ad[i + 3] - bd[i + 3]);
                            }
                            const row = { filter, scale, opacity, nativeEncodes, rgbMAE: rgb / (384 * 384 * 3), alphaMAE: alpha / (384 * 384) };
                            rows.push(row);
                            check(row.rgbMAE < 2 && row.alphaMAE < 2, JSON.stringify(row));
                            check(nativeEncodes === (!supported && (filter.blur || filter.shadow) ? 1 : 0), 'Unexpected production backend');
                        } finally {
                            if (a) releaseSurface(a);
                            if (b) releaseSurface(b);
                        }
                    }
                    check(source.width === 384, 'Caller source was released');
                    return { supported, rows };
                } finally { HTMLCanvasElement.prototype.toDataURL = original; releaseSurface(source); }
            });
            if (name !== 'webkit') assert.equal(report.matrix.supported, true, `${name}: expected working native filters`);
            // Simulate a driver failure after a successful capability probe. Fallback
            // must clear failed native allocations; abort must not take that fallback.
            report.recovery = await page.evaluate(async () => {
                const h = await import('/build/filter-surface-benchmark.js');
                if (!h.supportsNativeFilters()) return { skipped: 'native filters unavailable' };
                const results = [];
                for (const mode of ['failure', 'abort']) {
                    const source = document.createElement('canvas'); source.width = source.height = 100;
                    source.getContext('2d').fillRect(20, 20, 50, 50);
                    const draw = CanvasRenderingContext2D.prototype.drawImage, create = document.createElement;
                    const encode = HTMLCanvasElement.prototype.toDataURL, controller = new AbortController();
                    const allocated = []; let injected = false, encodes = 0, result, error = null;
                    document.createElement = function (tag, ...args) {
                        const element = create.call(this, tag, ...args); if (tag === 'canvas') allocated.push(element); return element;
                    };
                    HTMLCanvasElement.prototype.toDataURL = function (...args) { encodes++; return encode.apply(this, args); };
                    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
                        if (!injected && this.filter && this.filter !== 'none') {
                            injected = true;
                            if (mode === 'abort') controller.abort();
                            else throw new Error('Injected native draw failure');
                        }
                        return draw.apply(this, args);
                    };
                    try { result = await h.renderFilterSurface(source, { blur: 4 }, .5, 1, controller.signal); }
                    catch (e) { error = e.name; }
                    finally {
                        CanvasRenderingContext2D.prototype.drawImage = draw;
                        HTMLCanvasElement.prototype.toDataURL = encode;
                        document.createElement = create;
                    }
                    results.push({ mode, injected, encodes, error, sourceWidth: source.width,
                        alpha: result?.getContext('2d').getImageData(40, 40, 1, 1).data[3],
                        leaked: allocated.filter(c => c !== result && c.width * c.height > 0).length });
                    if (result) h.releaseSurface(result); h.releaseSurface(source);
                }
                return results;
            });
            if (Array.isArray(report.recovery)) for (const row of report.recovery) {
                assert.equal(row.injected, true); assert.equal(row.leaked, 0); assert.equal(row.sourceWidth, 100);
                assert.equal(row.error, row.mode === 'abort' ? 'AbortError' : null);
                assert.equal(row.encodes, row.mode === 'abort' ? 0 : 1);
                if (row.mode === 'failure') assert.equal(row.alpha, 128);
            }
            await page.goto(server.url + '/tests/reftests/filter/surface-regressions.html?csp');
            report.csp = await page.evaluate(async () => {
                const { supportsNativeFilters } = await import('/build/filter-surface-benchmark.js');
                const supported = supportsNativeFilters(), violations = [];
                document.addEventListener('securitypolicyviolation', e => violations.push(e.blockedURI));
                const result = await window.html2canvas(document.getElementById('combined'), { scale: 1, backgroundColor: null, logging: false });
                const alpha = result.getContext('2d').getImageData(140, 110, 1, 1).data[3];
                result.width = result.height = 0;
                await new Promise(resolve => setTimeout(resolve, 0));
                return { supported, alpha, violations, iframes: document.querySelectorAll('.html2canvas-container').length };
            });
            assert.equal(report.csp.iframes, 0);
            if (report.csp.supported) { assert.equal(report.csp.alpha, 128); assert.ok(!report.csp.violations.includes('data')); }
            else { assert.ok(report.csp.alpha > 200); assert.ok(report.csp.violations.includes('data')); }
            await page.close();
            report.forcedFallback = [];
            for (const mode of ['missing', 'no-op']) {
                const fallback = await browser.newPage();
                await fallback.addInitScript(mode => {
                    if (mode === 'missing') delete CanvasRenderingContext2D.prototype.filter;
                    else Object.defineProperty(CanvasRenderingContext2D.prototype, 'filter', {
                        configurable: true, get() { return 'none'; }, set() {}
                    });
                }, mode);
                await fallback.goto(server.url + '/tests/reftests/filter/surface-regressions.html');
                const row = await fallback.evaluate(async () => {
                    const h = await import('/build/filter-surface-benchmark.js');
                    const supported = h.supportsNativeFilters(), source = document.createElement('canvas');
                    source.width = source.height = 100; source.getContext('2d').fillRect(20, 20, 50, 50);
                    const result = await h.renderFilterSurface(source, { blur: 4 }, .5, 1);
                    const context = result.getContext('2d');
                    const row = { supported, alpha: context.getImageData(40, 40, 1, 1).data[3], outside: context.getImageData(18, 40, 1, 1).data[3] };
                    h.releaseSurface(result); h.releaseSurface(source); return row;
                });
                assert.equal(row.supported, false); assert.equal(row.alpha, 128); assert.ok(row.outside > 0);
                report.forcedFallback.push({ mode, ...row }); await fallback.close();
            }
            report.status = 'passed';
            console.log(JSON.stringify({ engine: name, status: report.status, matrixCases: report.matrix.rows.length }));
        } catch (error) { report.status = 'failed'; report.error = String(error); throw error; }
        finally {
            await browser.close();
            await writeFile(new URL('native-regressions.json', output), JSON.stringify(reports, null, 2) + '\n');
        }
    }
} finally { await server.close(); }
