// Build after pnpm build. All diagnostic bundles stay in ignored build/; dist/ and the public API are untouched.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { rolldown } from 'rolldown';
import { chromium, firefox, webkit } from 'playwright';

const root = new URL('../', import.meta.url);
const selected = (process.env.BENCH_ENGINES || 'chromium,firefox,webkit').split(',');
const engines = { chromium, firefox, webkit };
assert.ok(selected.length && selected.every(name => engines[name]), 'Unknown BENCH_ENGINES');
const config = { iterations: Number(process.env.OVERBUDGET_ITERATIONS || 7),
    warmups: Number(process.env.OVERBUDGET_WARMUPS || 2),
    cases: (process.env.OVERBUDGET_CASES || 'control,blur,combined').split(',') };
const output = new URL('tmp/filter-surface-regressions/performance/', root);
await mkdir(output, { recursive: true });
const baseline = await readFile(new URL('build/html2canvas-pro-baseline.esm.js', root), 'utf8');
// The dependency is pinned to 2.4.3 by copy-filter-baseline.mjs. Fail loudly if its internal symbol changes.
// Append an export only: all of the published executable code remains unchanged.
assert.equal(baseline.split('//#region src/css/property-descriptors/filter.ts').length, 2);
assert.equal(baseline.split('const filter = {\n\tname: "filter",').length, 2);
await writeFile(new URL('build/filter-overbudget-release.js', root), baseline + '\nexport { filter as filterDescriptor };\n');
const entry = '\0filter-overbudget-entry';
const modulePath = path => JSON.stringify(fileURLToPath(new URL(path, root)));
const bundle = await rolldown({ input: entry, plugins: [{ name: 'test-only-overbudget-entry',
    resolveId(id) { if (id === entry) return id; },
    load(id) { if (id === entry) return `
        export {default} from ${modulePath('src/index.ts')};
        export {CanvasRenderer} from ${modulePath('src/render/canvas/canvas-renderer.ts')};
        export {filter as filterDescriptor} from ${modulePath('src/css/property-descriptors/filter.ts')};
        export {Parser} from ${modulePath('src/css/syntax/parser.ts')};`; }
}] });
try { await bundle.write({ file: fileURLToPath(new URL('build/filter-overbudget-current.js', root)), format: 'esm' }); }
finally { await bundle.close(); }
const hashes = {};
for (const path of ['src/css/property-descriptors/filter.ts', 'src/render/canvas/canvas-renderer.ts',
    'src/render/canvas/surface-bounds.ts', 'tests/manual/filter-overbudget.js',
    'build/filter-overbudget-current.js', 'build/filter-overbudget-release.js'])
    hashes[path] = createHash('sha256').update(await readFile(new URL(path, root))).digest('hex');
let revision = 'unknown';
try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fileURLToPath(root), encoding: 'utf8' }).trim(); }
catch { /* An extracted archive may not include Git metadata. */ }
const result = { host: { revision, node: process.version, platform: os.platform(), release: os.release(),
    cpu: os.cpus()[0]?.model, logicalCPUs: os.cpus().length, ci: Boolean(process.env.CI),
    workflowRun: process.env.GITHUB_RUN_ID || null, hashes }, reports: [] };
const allowed = new Set(['/build/filter-overbudget-current.js', '/build/filter-overbudget-release.js',
    '/tests/manual/filter-overbudget.js']);
const server = http.createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/') { res.setHeader('Content-Type', 'text/html');
        res.end('<!doctype html><html><head><style>body{margin:0}</style></head><body></body></html>'); return; }
    if (!allowed.has(path)) { res.writeHead(404).end(); return; }
    try { res.setHeader('Content-Type', 'text/javascript'); res.end(await readFile(new URL(path.slice(1), root))); }
    catch { res.writeHead(404).end(); }
});
const markdown = () => {
    const lines = ['# Over-budget attribution', '', `Checkout: ${revision}`, '',
        'Same DOM, caller-owned output, and synchronized full readback. First observation and warmups excluded.',
        'Parser replacement and bypass are diagnostic-only. No budget increase, downscaling or production change.',
        'Timers are informational; pixel equality, early rejection and zero intermediate allocation are assertions.', ''];
    for (const report of result.reports) {
        lines.push(`## ${report.engine} ${report.browserVersion || ''}: ${report.status}`, '',
            '| Fixture | Variant | Median ms | Min / max ms | Eligibility ms | Rejection ms |',
            '| --- | --- | ---: | ---: | ---: | ---: |');
        for (const row of report.rows || []) lines.push(`| ${row.scenario} | ${row.variant} | ${row.medianMs.toFixed(2)} | ${row.minMs.toFixed(2)} / ${row.maxMs.toFixed(2)} | ${row.medianEligibilityMs.toFixed(3)} | ${row.medianRejectedSurfaceMs.toFixed(3)} |`);
        lines.push('', 'Pixel comparisons: `' + JSON.stringify(report.comparisons || []) + '`', '');
        if (report.error) lines.push(report.error, '');
    }
    return lines.join('\n') + '\n';
};
const persist = async () => {
    await writeFile(new URL('overbudget.json', output), JSON.stringify(result, null, 2) + '\n');
    await writeFile(new URL('overbudget.md', output), markdown());
};
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
try {
    for (const name of selected) {
        let browser;
        try {
            browser = await engines[name].launch({ headless: true });
            const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
            page.on('console', msg => { if (msg.type() === 'log') console.log(`${name}: ${msg.text()}`); });
            await page.goto(`http://127.0.0.1:${server.address().port}/`);
            const report = await page.evaluate(async config => {
                const draft = await import('/build/filter-overbudget-current.js?draft');
                const draftLegacy = await import('/build/filter-overbudget-current.js?legacy');
                const draftOld = await import('/build/filter-overbudget-current.js?old-descriptor');
                const baselineFixed = await import('/build/filter-overbudget-release.js?fixed-descriptor');
                const baseline = await import('/build/filter-overbudget-release.js');
                const { runOverbudget } = await import('/tests/manual/filter-overbudget.js');
                try { return await runOverbudget({ ...config, draft, baseline, draftLegacy, draftOld, baselineFixed, onProgress: console.log }); }
                catch (error) { return error.report || { status: 'failed', error: String(error) }; }
            }, config);
            result.reports.push({ engine: name, browserVersion: browser.version(), ...report });
            if (report.status !== 'passed') process.exitCode = 1;
        } catch (error) {
            result.reports.push({ engine: name, status: 'failed', error: String(error) }); process.exitCode = 1;
        } finally { if (browser) await browser.close(); await persist(); }
    }
} finally { await persist(); await new Promise(resolve => server.close(resolve)); }
console.log(`Over-budget observations: ${fileURLToPath(output)}`);
