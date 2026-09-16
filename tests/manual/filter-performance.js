// Shared by the manual page and the CLI. Both backends are bundled from production source.
import { renderFilterSurface, renderSvgFilterSurface, supportsNativeFilters, releaseSurface } from '../../build/filter-surface-benchmark.js';
import draft from '../../dist/html2canvas-pro.esm.js';
import baseline from '../../build/html2canvas-pro-baseline.esm.js';

const check = (ok, message) => { if (!ok) throw new Error(message); };
const pause = () => new Promise(resolve => setTimeout(resolve, 0));
const median = values => {
    const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const summarize = samples => {
    const sorted = samples.map(s => s.totalMs).sort((a, b) => a - b);
    return { medianMs: median(sorted), p95Ms: sorted[Math.ceil(sorted.length * .95) - 1],
        minMs: sorted[0], maxMs: sorted[sorted.length - 1] };
};
const filters = {
    blur: { blur: 4 },
    combined: { blur: 4, shadow: { x: 12, y: 8, blur: 8, color: 'rgba(0,0,0,0.6)' } }
};
const filterText = ({ blur, shadow }) => `blur(${blur}px)` +
    (shadow ? ` drop-shadow(${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.color})` : '');
function canvas(size) {
    const result = document.createElement('canvas'); result.width = result.height = size; return result;
}
function supportsNative() {
    return supportsNativeFilters();
}
function sourceCanvas(size, content) {
    const c = canvas(size), ctx = c.getContext('2d'), edge = size - 192;
    ctx.fillStyle = '#176b70'; ctx.fillRect(96, 96, edge, edge);
    if (content === 'textured') {
        const pixels = ctx.createImageData(edge, edge); let seed = 239;
        for (let i = 0; i < pixels.data.length; i += 4) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            pixels.data[i] = seed >>> 24; pixels.data[i + 1] = (seed >>> 16) & 255;
            pixels.data[i + 2] = (seed >>> 8) & 255; pixels.data[i + 3] = 255;
        }
        ctx.putImageData(pixels, 96, 96);
    }
    return c;
}
function nativeSurface(source, filter, signal) {
    // Measure the production dispatcher, not a duplicate native implementation.
    return renderFilterSurface(source, filter, .5, 1, signal);
}
async function measure(render, signal, source, realms = [window]) {
    let encodeMs = 0, decodeMs = 0, svgEncodes = 0;
    const restores = [];
    // Instrumentation is isolated to this serial sample and restored even on errors/abort.
    for (const realm of realms) {
        const proto = realm.HTMLCanvasElement.prototype, original = proto.toDataURL;
        proto.toDataURL = function (...args) {
            const start = performance.now();
            try { svgEncodes++; return original.apply(this, args); }
            finally { encodeMs += performance.now() - start; }
        };
        restores.push(() => { proto.toDataURL = original; });
    }
    const proto = HTMLImageElement.prototype, decode = proto.decode;
    proto.decode = async function (...args) {
        const start = performance.now();
        try { return await decode.apply(this, args); }
        finally { decodeMs += performance.now() - start; }
    };
    restores.push(() => { proto.decode = decode; });
    let output;
    try {
        signal?.throwIfAborted();
        const start = performance.now(); output = await render(); const submitted = performance.now();
        check(output.width > 0 && output.height > 0, 'Empty output');
        const pixels = output.getContext('2d').getImageData(0, 0, output.width, output.height).data;
        const end = performance.now();
        return { timing: { totalMs: end - start, submitMs: submitted - start,
            readbackMs: end - submitted, encodeMs, decodeMs, svgEncodes },
            pixels, width: output.width, height: output.height };
    } finally {
        restores.reverse().forEach(restore => restore());
        if (output && output !== source) releaseSurface(output);
    }
}
function compare(a, b) {
    check(a.length === b.length, 'Pixel dimensions differ');
    let rgb = 0, alpha = 0;
    for (let i = 0; i < a.length; i += 4) {
        const aa = a[i + 3] / 255, ba = b[i + 3] / 255;
        for (let ch = 0; ch < 3; ch++) rgb += Math.abs(a[i + ch] * aa + 255 * (1 - aa) - b[i + ch] * ba - 255 * (1 - ba));
        alpha += Math.abs(a[i + 3] - b[i + 3]);
    }
    return { whiteMatteMeanRGBError: rgb / (a.length / 4 * 3), meanAlphaError: alpha / (a.length / 4) };
}

export async function runPerformance({ iterations = 9, warmups = 2, sizes = [512, 1000, 2000],
    endToEnd = true, signal, onProgress = () => {} } = {}) {
    check(Number.isInteger(iterations) && iterations >= 2 && iterations <= 30, 'iterations must be 2..30');
    check(Number.isInteger(warmups) && warmups >= 0 && warmups <= 10, 'warmups must be 0..10');
    check(sizes.length > 0 && sizes.every(n => Number.isInteger(n) && n >= 256 && n <= 2000), 'sizes must be 256..2000 raster pixels');
    const report = { schemaVersion: 1, startedAt: new Date().toISOString(),
        implementation: 'production-native-with-svg-fallback',
        environment: { userAgent: navigator.userAgent, platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency, devicePixelRatio,
            viewport: [innerWidth, innerHeight], canvasFiltersWork: supportsNative() },
        config: { iterations, warmups, sizes, opacity: .5, surfaceScale: 1, endToEnd },
        surface: [], endToEnd: [], status: 'running' };
    const notify = message => onProgress(message, report);
    try {
        for (const size of sizes) for (const content of ['flat', 'textured']) for (const [effect, filter] of Object.entries(filters)) {
            signal?.throwIfAborted(); notify(`Surface ${size} × ${size}, ${content}, ${effect}`); await pause();
            const source = sourceCanvas(size, content), backends = ['copy', 'svg'];
            if (report.environment.canvasFiltersWork) backends.push('canvas');
            else report.surface.push({ size, content, effect, backend: 'canvas', skipped: 'Working Canvas filters unavailable' });
            const rows = Object.fromEntries(backends.map(backend => [backend, { size, content, effect, backend, samples: [] }]));
            let quality;
            try {
                for (let round = 0; round < 1 + warmups + iterations; round++) {
                    signal?.throwIfAborted();
                    // Same changed source for all backends; avoid identical SVG image-cache hits across rounds.
                    const ctx = source.getContext('2d'); ctx.fillStyle = `rgb(${round % 256},31,77)`;
                    ctx.fillRect(size / 2, size / 2, 1, 1);
                    const pixels = {};
                    for (let offset = 0; offset < backends.length; offset++) {
                        const backend = backends[(round + offset) % backends.length];
                        const render = () => backend === 'canvas' ? nativeSurface(source, filter, signal) :
                            renderSvgFilterSurface(source, backend === 'copy' ? { blur: 0 } : filter, .5, 1, signal);
                        const sample = await measure(render, signal, source), row = rows[backend];
                        const middle = ((size / 2 | 0) * size + (size / 2 | 0)) * 4 + 3;
                        const outside = ((size / 2 | 0) * size + 94) * 4 + 3;
                        check(sample.pixels[middle] === 128, `${backend}: layer opacity changed`);
                        check(backend === 'copy' ? sample.pixels[outside] === 0 : sample.pixels[outside] > 0,
                            `${backend}: missing blur; a no-op must not win the benchmark`);
                        check(sample.timing.svgEncodes === (backend === 'svg' ? 1 : 0), `${backend}: unexpected rendering path`);
                        if (round === 0) row.firstMs = sample.timing.totalMs;
                        if (round > warmups) row.samples.push(sample.timing);
                        if (round === 1 + warmups) pixels[backend] = sample.pixels;
                    }
                    if (pixels.canvas) quality = compare(pixels.svg, pixels.canvas);
                    await pause();
                }
                for (const row of Object.values(rows)) {
                    Object.assign(row, summarize(row.samples));
                    row.medianEncodeMs = median(row.samples.map(s => s.encodeMs));
                    row.medianDecodeMs = median(row.samples.map(s => s.decodeMs));
                    row.medianReadbackMs = median(row.samples.map(s => s.readbackMs));
                    row.quality = { centerAlpha: 128, blurOutsideSource: row.backend !== 'copy',
                        ...(row.backend === 'canvas' ? quality : {}) };
                    report.surface.push(row);
                }
            } finally { releaseSurface(source); }
        }
        if (endToEnd) {
            for (const scenario of ['control-512', 'combined-512', 'control-2000', 'combined-2000', 'sparse-50', 'nested-12', 'over-budget']) {
                signal?.throwIfAborted(); notify(`Full capture: ${scenario}`); await pause();
                const size = scenario === 'over-budget' ? 2600 : scenario.includes('2000') || scenario === 'sparse-50' ? 2000 : 512;
                const frame = document.createElement('iframe');
                Object.assign(frame.style, { position: 'absolute', left: '-12000px', top: '0', width: `${size}px`, height: `${size}px`, border: '0' });
                document.body.append(frame);
                const doc = frame.contentDocument;
                doc.open(); doc.write('<!doctype html><html><head><style>body{margin:0}*{box-sizing:border-box}</style></head><body></body></html>'); doc.close();
                const stage = doc.createElement('div');
                Object.assign(stage.style, { width: `${size}px`, height: `${size}px`, position: 'relative' }); doc.body.append(stage);
                const layer = (parent, x, y, w, h, filtered = true, opacity = '.5') => {
                    const el = doc.createElement('div'); Object.assign(el.style, { position: 'absolute', left: `${x}px`, top: `${y}px`,
                        width: `${w}px`, height: `${h}px`, background: '#176b70',
                        filter: filtered ? filterText(filters.combined) : 'none', opacity: filtered ? opacity : '1' });
                    parent.append(el); return el;
                };
                if (scenario === 'sparse-50') for (let i = 0; i < 50; i++) layer(stage, 80 + i % 10 * 185, 80 + (i / 10 | 0) * 350, 110, 70);
                else if (scenario === 'nested-12') {
                    let parent = stage;
                    for (let i = 0; i < 12; i++) {
                        parent = layer(parent, i ? 2 : 100, i ? 2 : 100, 220, 160, true, '.99');
                        parent.style.background = 'transparent'; parent.style.filter = 'blur(2px)';
                    }
                    parent.style.background = '#176b70';
                } else {
                    const over = scenario === 'over-budget';
                    const root = layer(stage, over ? 0 : 96, over ? 0 : 96, over ? size : size - 192, over ? size : size - 192, !scenario.startsWith('control'));
                    // Overlapping draws expose the release's alpha defect; not equivalent work to the fixed renderer.
                    for (const shift of [0, 20]) {
                        const child = layer(root, shift, shift, over ? size - 40 : size - 232, over ? size - 40 : size - 232, false);
                        child.style.background = '#b33c57';
                    }
                }
                const versions = ['release-2.4.3', 'draft'], rows = Object.fromEntries(versions.map(version => [version,
                    { scenario, size, scale: 1, version, samples: [] }]));
                try {
                    for (let round = 0; round < 1 + warmups + iterations; round++) {
                        for (let offset = 0; offset < 2; offset++) {
                            const version = versions[(round + offset) % 2], renderer = version === 'draft' ? draft : baseline;
                            const sample = await measure(() => renderer(stage, { scale: 1, backgroundColor: null, logging: false, signal }),
                                signal, null, [window, frame.contentWindow]);
                            check(sample.width === size && sample.height === size, 'Unexpected full-capture dimensions');
                            const centerAlpha = sample.pixels[((size / 2 | 0) * size + (size / 2 | 0)) * 4 + 3];
                            const expectedSurface = !scenario.startsWith('control') && scenario !== 'over-budget';
                            if (version === 'draft') {
                                const expectsSvg = expectedSurface && !report.environment.canvasFiltersWork;
                                check((sample.timing.svgEncodes > 0) === expectsSvg, `${scenario}: unexpected production backend`);
                                if (scenario.startsWith('combined')) check(centerAlpha === 128, `${scenario}: opacity regression`);
                            }
                            check(doc.querySelectorAll('.html2canvas-container').length === 0, 'Leaked clone iframe');
                            const row = rows[version]; row.centerAlpha = centerAlpha;
                            row.observedPath = sample.timing.svgEncodes > 0 ? 'svg-surface' :
                                version === 'draft' && expectedSurface && report.environment.canvasFiltersWork ? 'native-surface' :
                                scenario === 'over-budget' ? 'legacy-fallback' : 'legacy/no-filter';
                            if (!round) row.firstMs = sample.timing.totalMs;
                            if (round > warmups) row.samples.push(sample.timing);
                        }
                        await pause();
                    }
                    for (const row of Object.values(rows)) { Object.assign(row, summarize(row.samples)); report.endToEnd.push(row); }
                } finally { frame.remove(); }
            }
        }
        report.status = 'passed'; return report;
    } catch (error) {
        report.status = signal?.aborted ? 'aborted' : 'failed'; report.error = String(error); error.report = report; throw error;
    } finally { report.completedAt = new Date().toISOString(); notify(report.status); }
}
