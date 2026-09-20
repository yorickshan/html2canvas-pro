// Reuse the exact same DOM oracle and acceptance limits as the original suite.
// Only the fixture corpus is replaced; the original suite still runs separately.
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cases = [
    { id: 'none', shadow: 'none' },
    { id: 'hard-rounded-spread', shadow: '12px 8px 0 10px #c21e50', css: 'border-radius:24px' },
    { id: 'hard-circle-spread', shadow: '12px 8px 0 10px #c21e50', css: 'width:96px;height:96px;border-radius:50%' },
    { id: 'small-radius-spread', shadow: '0 0 0 12px #c21e50', css: 'border-radius:4px' },
    { id: 'hard-rounded-inset', shadow: 'inset 12px 8px 0 10px #203080', css: 'border-radius:24px' },
    { id: 'bordered-inset', shadow: 'inset 12px 8px 10px 4px #203080', css: 'border:8px solid rgba(180,90,50,.5);border-radius:24px' },
    { id: 'bordered-hard-inset', shadow: 'inset 12px 8px 0 4px #203080', css: 'border:8px solid rgba(180,90,50,.5);border-radius:24px' },
    { id: 'collapsed-inset-hole', shadow: 'inset 0 0 12px 80px rgba(0,0,0,.5)', css: 'border-radius:24px' },
    { id: 'inset-large-offset', shadow: 'inset 200px 100px 12px 0 rgba(0,0,0,.5)', css: 'border-radius:24px' },
    { id: 'transparent-inset', shadow: 'inset -8px 10px 10px 4px rgba(0,0,0,.5)', css: 'background:transparent;border-radius:24px' },
    { id: 'multiple-insets', shadow: 'inset 12px 8px 6px 4px rgba(220,20,30,.7),inset -14px -8px 8px 2px rgba(20,40,220,.6)', css: 'border-radius:16px' },
    { id: 'forced-svg-inset', shadow: 'inset -8px 10px 10px 4px rgba(0,0,0,.5)', css: 'border-radius:24px', svg: true }
];
const original = await readFile(new URL('./box-shadow-regressions.mjs', import.meta.url), 'utf8');
const start = original.indexOf('const cases = [');
const end = original.indexOf('\n];\n\nconst html', start);
assert.ok(start >= 0 && end > start, 'Original fixture boundaries changed; update the adapter explicitly');
const source = original.slice(0, start) + 'const cases = ' + JSON.stringify(cases, null, 4) + ';' + original.slice(end + 3);
const temporary = new URL(`./.box-shadow-extended-${randomUUID()}.mjs`, import.meta.url);
try {
    await writeFile(temporary, source, { flag: 'wx' });
    const result = spawnSync(process.execPath, [fileURLToPath(temporary)], {
        stdio: 'inherit',
        env: { ...process.env, BOX_SHADOW_OUTPUT: process.env.BOX_SHADOW_EXTENDED_OUTPUT || 'tmp/box-shadow-extended' }
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
} finally {
    await unlink(temporary);
}
