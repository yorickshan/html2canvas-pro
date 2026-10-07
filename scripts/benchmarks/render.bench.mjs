/**
 * End-to-end render benchmark: html2canvas-pro vs upstream html2canvas 1.4.1.
 *
 * Renders real fixtures in headless Chromium via Playwright, timing the full
 * clone → parse → rasterise pipeline of both libraries inside the same page,
 * with runs interleaved to cancel ordering / thermal bias.
 *
 * Prerequisites:
 *   corepack pnpm build                 # dist/ must match the current sources
 *   npx playwright install chromium
 *
 * Run with:
 *   corepack pnpm bench:render
 */

import http from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PRO_UMD = path.join(ROOT, 'dist', 'html2canvas-pro.js');
const UPSTREAM_URL = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
const UPSTREAM_CACHE = path.join(os.tmpdir(), 'html2canvas-1.4.1.min.js');
const RUNS = 10;
const WARMUP = 2;
const RUN_TIMEOUT_MS = 60000;

// The page context cannot always reach the CDN, so the upstream bundle is
// fetched once up front and injected from disk (also makes runs offline-safe).
const ensureUpstreamBundle = async () => {
    try {
        const cached = await stat(UPSTREAM_CACHE);
        if (cached.isFile() && cached.size > 100000) return UPSTREAM_CACHE;
    } catch {
        // not cached yet
    }
    const res = await fetch(UPSTREAM_URL);
    if (!res.ok) throw new Error(`Failed to download upstream html2canvas: HTTP ${res.status}`);
    const body = Buffer.from(await res.arrayBuffer());
    await writeFile(UPSTREAM_CACHE, body);
    return UPSTREAM_CACHE;
};

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

const SIMPLE_FIXTURE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #333; }
    .card { background: #fff; border: 1px solid #ddd; border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,.12); padding: 12px 16px; margin-bottom: 12px; }
    .card h3 { margin: 0 0 6px; font-size: 15px; }
    .card p { margin: 0; font-size: 13px; line-height: 1.5; }
    .banner { background: linear-gradient(90deg, #2980b9, #8e44ad); color: #fff;
              padding: 16px; border-radius: 8px; margin-bottom: 16px; }
</style></head><body>
    <div class="banner"><h1>Quarterly report</h1><p>Plain document benchmark fixture</p></div>
    ${Array.from(
        { length: 40 },
        (_, i) =>
            `<div class="card"><h3>Section ${i + 1}</h3><p>Lorem ipsum dolor sit amet, ` +
            'consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore ' +
            'magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p></div>'
    ).join('\n    ')}
</body></html>`;

// Legacy CSS syntax only (hex/rgb colours, linear/radial gradients) so that the
// upstream library can complete it too — isolates pipeline speed from feature coverage.
const LARGE_FIXTURE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .card { display: flex; gap: 12px; align-items: center;
            background: linear-gradient(135deg, rgb(255,255,255), rgb(240,244,250));
            border: 1px solid #d0d7de; border-radius: 10px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15); padding: 14px 16px; margin-bottom: 10px; }
    .avatar { flex: none; width: 44px; height: 44px; border-radius: 50%;
              background: radial-gradient(circle at 30% 30%, rgb(120,190,255), rgb(30,90,180)); }
    .card h3 { margin: 0 0 4px; font-size: 14px; }
    .card p { margin: 0; font-size: 12px; line-height: 1.5; color: #555; }
    .tag { display: inline-block; margin-left: 8px; padding: 1px 8px; border-radius: 999px;
           background: rgb(232,240,254); color: rgb(30,90,180); font-size: 11px; }
</style></head><body>
    ${Array.from({ length: 300 }, (_, i) => {
        const t = i * 37;
        const pastel = `rgb(${140 + (t % 100)}, ${190 + (t % 60)}, 255)`;
        return (
            `<div class="card"><div class="avatar" style="background: radial-gradient(circle at 30% 30%, ${pastel}, rgb(30,90,180))"></div>` +
            `<div><h3>Item ${i + 1} <span class="tag">active</span></h3>` +
            '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor ' +
            'incididunt ut labore et dolore magna aliqua ut enim ad minim veniam.</p></div></div>'
        );
    }).join('\n    ')}
</body></html>`;

const startServer = () =>
    new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
            const file = path.normalize(path.join(ROOT, pathname));
            if (!file.startsWith(ROOT)) {
                res.writeHead(403).end();
                return;
            }
            readFile(file)
                .then((data) => {
                    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
                    res.end(data);
                })
                .catch(() => res.writeHead(404).end());
        });
        server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
    });

// Both bundles expose the global `html2canvas`, so the pro build is loaded first
// and aliased before the upstream build overwrites the global.
const installBench = () => {
    window.html2canvasPro = window.html2canvas;
    window.__run = async (globalName) => {
        const start = performance.now();
        try {
            const canvas = await window[globalName](document.body, { logging: false, scale: 1 });
            return { ms: performance.now() - start, width: canvas.width, height: canvas.height };
        } catch (err) {
            return { error: String(err && err.message ? err.message : err) };
        }
    };
};

const timedRun = (page, globalName) =>
    Promise.race([
        page.evaluate((g) => window.__run(g), globalName),
        new Promise((_, reject) => setTimeout(() => reject(new Error('run timed out')), RUN_TIMEOUT_MS))
    ]).catch(() => null);

const stats = (values) => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return {
        median: sorted[Math.floor(sorted.length / 2)],
        mean,
        min: sorted[0],
        max: sorted[sorted.length - 1]
    };
};

const fmt = (ms) => (ms == null ? '   n/a    ' : `${ms.toFixed(0)} ms`.padStart(9));

const benchFixture = async (page, label, load, pageErrors, upstreamPath) => {
    pageErrors.length = 0;
    await load();
    await page.addScriptTag({ path: PRO_UMD });
    await page.evaluate(installBench);
    await page.addScriptTag({ path: upstreamPath });

    for (let i = 0; i < WARMUP; i++) {
        await timedRun(page, 'html2canvasPro').catch(() => undefined);
        await timedRun(page, 'html2canvas').catch(() => undefined);
    }

    const proTimes = [];
    const upstreamTimes = [];
    let upstreamFailures = 0;
    let firstUpstreamError = null;
    for (let i = 0; i < RUNS; i++) {
        // Sequential runs; alternate which library goes first to cancel ordering bias.
        const proFirst = i % 2 === 0;
        const first = await timedRun(page, proFirst ? 'html2canvasPro' : 'html2canvas');
        const second = await timedRun(page, proFirst ? 'html2canvas' : 'html2canvasPro');
        const pro = proFirst ? first : second;
        const upstream = proFirst ? second : first;
        if (pro?.ms != null) proTimes.push(pro.ms);
        if (upstream?.ms != null) upstreamTimes.push(upstream.ms);
        else {
            upstreamFailures++;
            firstUpstreamError ??= upstream?.error ?? 'timeout';
        }
        if (pro?.ms != null && upstream?.ms != null && i === 0) {
            console.log(
                `  canvas sizes: pro ${pro.width}x${pro.height}, upstream ${upstream.width}x${upstream.height}`
            );
        }
    }

    const pro = stats(proTimes);
    const up = stats(upstreamTimes);
    const speedup = up ? up.median / pro.median : null;
    console.log(`\n[${label}]  (n=${RUNS} measured runs each, after ${WARMUP} warmups)`);
    console.log(
        `  html2canvas-pro       median ${fmt(pro?.median)}  mean ${fmt(pro?.mean)}  min ${fmt(pro?.min)}  max ${fmt(pro?.max)}`
    );
    console.log(
        `  html2canvas 1.4.1     median ${fmt(up?.median)}  mean ${fmt(up?.mean)}  min ${fmt(up?.min)}  max ${fmt(up?.max)}`
    );
    console.log(`  speedup (median):     ${speedup ? `${speedup.toFixed(2)}x` : 'n/a'}`);
    if (upstreamFailures > 0)
        console.log(`  ⚠ upstream failed on ${upstreamFailures}/${RUNS} measured runs: ${firstUpstreamError}`);
    if (pageErrors.length > 0) console.log(`  ⚠ page errors: ${pageErrors.slice(0, 3).join(' | ')}`);
    return { label, pro, up, speedup };
};

const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));

console.log(`\nRender benchmark — html2canvas-pro ${pkg.version} vs html2canvas 1.4.1`);
console.log('Chromium (Playwright, headless), scale: 1 pinned for both, runs interleaved\n');

const { server, port } = await startServer();
const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));

try {
    const upstreamPath = await ensureUpstreamBundle();
    await benchFixture(
        page,
        'simple document (41 cards of text)',
        () => page.setContent(SIMPLE_FIXTURE, { waitUntil: 'load' }),
        pageErrors,
        upstreamPath
    );
    await benchFixture(
        page,
        'large document (300 cards, ~1200 elements, legacy CSS only)',
        () => page.setContent(LARGE_FIXTURE, { waitUntil: 'load' }),
        pageErrors,
        upstreamPath
    );
    await benchFixture(
        page,
        'features-showcase (full CSS feature demo)',
        () => page.goto(`http://127.0.0.1:${port}/dev/features-showcase.html`, { waitUntil: 'load' }),
        pageErrors,
        upstreamPath
    );
} finally {
    await browser.close();
    server.close();
}

console.log('\nAbsolute times vary by machine — compare ratios, not milliseconds.\n');
