// Keep the published baseline outside dist/ so it is not shipped in the library package.
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const baselineDist = path.dirname(require.resolve('html2canvas-pro-baseline'));
const pkg = JSON.parse(await readFile(path.join(baselineDist, '../package.json'), 'utf8'));
if (pkg.name !== 'html2canvas-pro' || pkg.version !== '2.4.3') {
    throw new Error('The filter demo requires the exact published html2canvas-pro 2.4.3 baseline');
}
const output = path.join(root, 'build');
await mkdir(output, { recursive: true });
await copyFile(path.join(baselineDist, 'html2canvas-pro.esm.js'), path.join(output, 'html2canvas-pro-baseline.esm.js'));
await copyFile(path.join(baselineDist, 'html2canvas-pro.esm.js.map'), path.join(output, 'html2canvas-pro.esm.js.map'));
console.log('Prepared unmodified published html2canvas-pro 2.4.3 for the before/after demo');

// Benchmark the actual helper, not a reimplementation. This test-only entry is never published in dist/.
const bundle = await rolldown({ input: path.join(root, 'src/render/canvas/filter-surface.ts') });
try {
    await bundle.write({ file: path.join(output, 'filter-surface-benchmark.js'), format: 'esm' });
} finally {
    await bundle.close();
}
