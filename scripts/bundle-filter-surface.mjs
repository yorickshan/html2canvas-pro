// Bundle the production filter helper for the diagnostic harnesses. The output
// stays in the ignored build/ directory and is never published in dist/.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'build');
await mkdir(output, { recursive: true });
// Benchmark the actual helper, not a reimplementation. This test-only entry is never published in dist/.
const bundle = await rolldown({ input: path.join(root, 'src/render/canvas/filter-surface.ts') });
try {
    await bundle.write({ file: path.join(output, 'filter-surface-benchmark.js'), format: 'esm' });
} finally {
    await bundle.close();
}
