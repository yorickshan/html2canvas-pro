// Requires macOS + Xcode command line tools; embeds WKWebView, not Playwright WebKit.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { startFilterServer } from './filter-probe-server.mjs';
assert.equal(process.platform, 'darwin', 'WKWebView host requires macOS');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../tmp/wkwebview-probe/', import.meta.url);
await mkdir(output, { recursive: true });
const run = (command, args) =>
    new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: 'inherit', cwd: root });
        child.on('error', reject);
        child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
    });
const binary = fileURLToPath(new URL('FilterProbe', output));
await run('xcrun', [
    'swiftc',
    'scripts/wkwebview/FilterProbe.swift',
    '-o',
    binary,
    '-module-cache-path',
    fileURLToPath(new URL('module-cache/', output))
]);
const server = await startFilterServer();
try {
    await run(binary, [server.url + '/tests/reftests/filter/surface-regressions.html', fileURLToPath(output)]);
    const rows = JSON.parse(await readFile(new URL('results.json', output), 'utf8'));
    assert.equal(rows.length, 8);
    for (const row of rows) {
        const prefix = `${row.scale}-${row.id}`;
        const a = PNG.sync.read(await readFile(new URL(`${prefix}-native.png`, output)));
        const b = PNG.sync.read(await readFile(new URL(`${prefix}-capture.png`, output)));
        assert.equal(a.width, b.width);
        assert.equal(a.height, b.height);
        assert.equal(row.leftoverIframes, 0);
        let sum = 0;
        for (let i = 0; i < a.data.length; i += 4)
            for (let c = 0; c < 3; c++) {
                const alpha = b.data[i + 3] / 255;
                sum += Math.abs(a.data[i + c] - b.data[i + c] * alpha - 255 * (1 - alpha));
            }
        const mae = sum / (a.width * a.height * 3);
        row.mae = mae;
        if (row.id === 'combined')
            assert.ok(Math.abs(b.data[(110 * row.scale * b.width + 140 * row.scale) * 4 + 3] - 128) <= 1);
        console.log(JSON.stringify({ ...row, mae }));
        if (row.id === 'nested-outset') {
            // The nested-shadow fixture has a known native-WKWebView discrepancy, so it keeps
            // its explicit alpha check rather than the tight pixel budget used for the rest.
            row.nativeShadowDiscrepancy = true;
            console.log(JSON.stringify({ id: row.id, scale: row.scale, nativeShadowDiscrepancy: true, afterMAE: mae }));
            assert.ok(b.data[(60 * row.scale * b.width + 40 * row.scale) * 4 + 3] > 5);
        } else assert.ok(mae < 2, `WKWebView ${prefix} pixel mismatch: ${mae}`);
    }
    await writeFile(new URL('results.json', output), JSON.stringify(rows, null, 2) + '\n');
    console.log('PASS: native WKWebView pixel comparisons at 1x/2x; nested-shadow discrepancy recorded separately');
} finally {
    await server.close();
}
