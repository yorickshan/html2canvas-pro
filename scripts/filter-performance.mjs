// Run after pnpm build. No speed thresholds: fail only on invalid measurements/rendering paths.
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { chromium, webkit, firefox } from 'playwright';

const root = new URL('../', import.meta.url);
const engines = { chromium, webkit, firefox };
const selected = (process.env.BENCH_ENGINES || 'chromium,webkit').split(',');
if (!selected.length || selected.some(name => !engines[name])) throw new Error('BENCH_ENGINES: use chromium,webkit,firefox');
const iterations = Number(process.env.BENCH_ITERATIONS || 9);
const warmups = Number(process.env.BENCH_WARMUPS || 2);
const output = new URL('../tmp/filter-surface-regressions/performance/', import.meta.url);
await mkdir(output, { recursive: true });
const files = new Map([
    ['/tests/manual/filter-performance.html', 'text/html'],
    ['/tests/manual/filter-performance.js', 'text/javascript'],
    ['/tests/manual/filter-performance-results.json', 'application/json'],
    ['/build/filter-surface-benchmark.js', 'text/javascript'],
    ['/dist/html2canvas-pro.esm.js', 'text/javascript'],
    ['/build/html2canvas-pro-baseline.esm.js', 'text/javascript']
]);
const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!files.has(pathname)) { res.writeHead(404).end(); return; }
    try {
        const data = await readFile(new URL(pathname.slice(1), root));
        res.setHeader('Content-Type', files.get(pathname)); res.end(data);
    } catch { res.writeHead(404).end(); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
let revision = 'unknown';
try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fileURLToPath(root), encoding: 'utf8' }).trim(); } catch { /* Archive build. */ }
const hashes = {};
for (const file of ['src/render/canvas/filter-surface.ts', 'tests/manual/filter-performance.js', 'dist/html2canvas-pro.esm.js', 'build/html2canvas-pro-baseline.esm.js']) {
    hashes[file] = createHash('sha256').update(await readFile(new URL(file, root))).digest('hex');
}
const host = { revision, node: process.version, platform: os.platform(), release: os.release(), arch: os.arch(),
    cpu: os.cpus()[0]?.model, logicalCPUs: os.cpus().length, availableParallelism: os.availableParallelism?.(),
    totalMemoryBytes: os.totalmem(), ci: Boolean(process.env.CI), workflowRun: process.env.GITHUB_RUN_ID || null, hashes };
const reports = [];
const markdown = () => {
    const lines = ['# Filter performance', '', `Revision: ${revision}`, '',
        'Serial samples; one first observation, excluded warmups, then rotated backend/version order.',
        'Total includes full output readback to synchronize deferred canvas work. Timings are not an SLA gate.',
        'With fewer than 20 samples, nearest-rank p95 is the maximum. PNG encode/decode medians are not additive.',
        'Release 2.4.3 is not visually equivalent for filtered cases; legacy fallback is not a successful filter optimization.', ''];
    for (const report of reports) {
        lines.push(`## ${report.engine} ${report.browserVersion} (${report.status})`, '',
            '| Raster | Content | Effect | Backend | Median ms | p95 ms | Encode ms | Decode ms |',
            '| --- | --- | --- | --- | ---: | ---: | ---: | ---: |');
        for (const row of report.surface || []) lines.push(row.skipped ?
            `| ${row.size} | ${row.content} | ${row.effect} | ${row.backend}: unsupported | — | — | — | — |` :
            `| ${row.size} | ${row.content} | ${row.effect} | ${row.backend} | ${row.medianMs.toFixed(2)} | ${row.p95Ms.toFixed(2)} | ${row.medianEncodeMs.toFixed(2)} | ${row.medianDecodeMs.toFixed(2)} |`);
        lines.push('', '| Full capture | Version | Median ms | p95 ms | Observed path | Center alpha |', '| --- | --- | ---: | ---: | --- | ---: |');
        for (const row of report.endToEnd || []) lines.push(`| ${row.scenario} | ${row.version} | ${row.medianMs.toFixed(2)} | ${row.p95Ms.toFixed(2)} | ${row.observedPath} | ${row.centerAlpha} |`);
        if (report.error) lines.push('', `Error: ${report.error}`);
        lines.push('');
    }
    return lines.join('\n');
};
const persist = async () => {
    await writeFile(new URL('results.json', output), JSON.stringify({ host, reports }, null, 2) + '\n');
    await writeFile(new URL('summary.md', output), markdown() + '\n');
};
try {
    for (const name of selected) {
        let browser;
        try {
            browser = await engines[name].launch({ headless: true });
            const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
            page.on('console', message => { if (message.type() === 'log') console.log(`${name}: ${message.text()}`); });
            await page.goto(`http://127.0.0.1:${server.address().port}/tests/manual/filter-performance.html?cli`);
            const report = await page.evaluate(async config => {
                const { runPerformance } = await import('./filter-performance.js');
                try { return await runPerformance({ ...config, onProgress: message => console.log(message) }); }
                catch (error) { return error.report || { schemaVersion: 1, status: 'failed', error: String(error) }; }
            }, { iterations, warmups });
            reports.push({ engine: name, browserVersion: browser.version(), ...report });
            if (report.status !== 'passed') process.exitCode = 1;
        } catch (error) {
            reports.push({ engine: name, schemaVersion: 1, status: 'failed', error: String(error) }); process.exitCode = 1;
        } finally { if (browser) await browser.close(); await persist(); }
    }
} finally {
    await persist();
    await new Promise(resolve => server.close(resolve));
}
console.log(`Reports: ${fileURLToPath(output)} (performance is informational, not a speed pass/fail)`);
