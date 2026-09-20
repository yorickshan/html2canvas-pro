// Compare allocation shape and timings without making wall-clock speed a flaky CI gate.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { startFilterServer } from './filter-probe-server.mjs';
const server = await startFilterServer();
const results = [];
try {
    for (const [engineName, engine] of Object.entries({ chromium, webkit })) {
        const browser = await engine.launch({ headless: true });
        try {
            const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
            await page.goto(server.url + '/tests/reftests/filter/surface-regressions.html');
            const rows = await page.evaluate(async () => {
                const rows = [];
                for (const mode of ['sparse-large', 'deeply-nested', 'over-budget']) {
                    const stage = document.createElement('div');
                    Object.assign(stage.style, {
                        position: 'relative',
                        width: mode === 'over-budget' ? '2600px' : '2400px',
                        height: mode === 'over-budget' ? '2600px' : '1600px'
                    });
                    document.body.replaceChildren(stage);
                    if (mode === 'sparse-large')
                        for (let i = 0; i < 50; i++) {
                            const layer = document.createElement('div');
                            Object.assign(layer.style, {
                                position: 'absolute',
                                left: `${(i % 10) * 230}px`,
                                top: `${Math.floor(i / 10) * 250}px`,
                                width: '120px',
                                height: '60px',
                                background: '#176b70',
                                filter: 'blur(4px) drop-shadow(12px 8px 8px #222)',
                                opacity: '.5'
                            });
                            stage.appendChild(layer);
                        }
                    if (mode === 'deeply-nested') {
                        let parent = stage;
                        for (let i = 0; i < 40; i++) {
                            const layer = document.createElement('div');
                            Object.assign(layer.style, {
                                position: 'absolute',
                                left: '2px',
                                top: '2px',
                                width: '260px',
                                height: '140px',
                                filter: 'blur(2px)',
                                opacity: '.99'
                            });
                            parent.appendChild(layer);
                            parent = layer;
                        }
                        parent.style.background = '#176b70';
                    }
                    if (mode === 'over-budget')
                        stage.innerHTML =
                            '<div style="position:absolute;width:3000px;height:3000px;background:#176b70;filter:blur(4px);opacity:.5"></div>';
                    const result = document.createElement('canvas');
                    result.width = parseInt(stage.style.width);
                    result.height = parseInt(stage.style.height);
                    const created = new Set();
                    const originalCreate = document.createElement;
                    const prototype = HTMLCanvasElement.prototype;
                    const width = Object.getOwnPropertyDescriptor(prototype, 'width'),
                        height = Object.getOwnPropertyDescriptor(prototype, 'height');
                    let peakPixels = 0,
                        maxWidth = 0,
                        maxHeight = 0;
                    const record = () => {
                        let live = 0;
                        for (const canvas of created) {
                            live += canvas.width * canvas.height;
                            maxWidth = Math.max(maxWidth, canvas.width);
                            maxHeight = Math.max(maxHeight, canvas.height);
                        }
                        peakPixels = Math.max(peakPixels, live);
                    };
                    document.createElement = function (tag, ...args) {
                        const element = originalCreate.call(this, tag, ...args);
                        if (tag === 'canvas') created.add(element);
                        return element;
                    };
                    for (const [name, descriptor] of [
                        ['width', width],
                        ['height', height]
                    ])
                        Object.defineProperty(prototype, name, {
                            ...descriptor,
                            set(value) {
                                descriptor.set.call(this, value);
                                record();
                            }
                        });
                    const started = performance.now();
                    try {
                        await html2canvas(stage, { canvas: result, scale: 1, backgroundColor: null, logging: false });
                    } finally {
                        document.createElement = originalCreate;
                        Object.defineProperty(prototype, 'width', width);
                        Object.defineProperty(prototype, 'height', height);
                    }
                    rows.push({
                        mode,
                        elapsedMs: Math.round(performance.now() - started),
                        surfaceCanvases: created.size,
                        peakCanvasBytes: peakPixels * 4,
                        maxWidth,
                        maxHeight,
                        retainedCanvasBytes: [...created].reduce((sum, c) => sum + c.width * c.height * 4, 0),
                        leftoverIframes: document.querySelectorAll('.html2canvas-container').length
                    });
                    result.width = result.height = 0;
                }
                return rows;
            });
            for (const row of rows) {
                console.log(JSON.stringify({ engine: engineName, ...row }));
                results.push({ engine: engineName, ...row });
                assert.equal(row.retainedCanvasBytes, 0);
                assert.equal(row.leftoverIframes, 0);
                assert.ok(
                    row.peakCanvasBytes <= 64 * 1024 * 1024,
                    'nested surface canvases exceeded backing-store budget'
                );
                if (row.mode === 'sparse-large') {
                    assert.ok(row.maxWidth < 400);
                    assert.ok(row.maxHeight < 400);
                    assert.ok(row.peakCanvasBytes < 1024 * 1024);
                }
                if (row.mode === 'over-budget')
                    assert.equal(row.surfaceCanvases, 0, 'over-budget layer must fall back before allocation');
            }
        } finally {
            await browser.close();
        }
    }
    const output = new URL('../tmp/filter-surface-regressions/', import.meta.url);
    await mkdir(output, { recursive: true });
    await writeFile(new URL('benchmark.json', output), JSON.stringify(results, null, 2) + '\n');
    console.log('PASS: bounded sparse/large/nested surfaces and released backing stores');
} finally {
    await server.close();
}
