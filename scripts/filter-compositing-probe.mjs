// Draft diagnostic, intentionally separate from the production regression suite.
// Uses the existing Puppeteer/pngjs dependencies. Build the library first.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { PNG } from 'pngjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'tmp/filter-compositing-probe');
const decode = (url) => PNG.sync.read(Buffer.from(url.split(',')[1], 'base64'));
const pixel = (png, x, y) => {
    const offset = (y * png.width + x) * 4;
    return Array.from(png.data.subarray(offset, offset + 4));
};

// Compare on white, matching the fixture's body background. The captures retain alpha.
function meanAbsoluteError(reference, capture) {
    assert.equal(reference.width, capture.width);
    assert.equal(reference.height, capture.height);
    let error = 0;
    for (let i = 0; i < reference.data.length; i += 4) {
        const alpha = capture.data[i + 3] / 255;
        for (let channel = 0; channel < 3; channel++) {
            error += Math.abs(reference.data[i + channel] - (capture.data[i + channel] * alpha + 255 * (1 - alpha)));
        }
    }
    return error / (reference.width * reference.height * 3);
}

const allowedFiles = new Set([
    '/tests/reftests/filter/compositing.html',
    '/tests/test.js',
    '/tests/manual/filter-compositing.js',
    '/dist/html2canvas-pro.js'
]);
const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!allowedFiles.has(pathname)) {
        response.writeHead(404).end();
        return;
    }
    try {
        const body = await readFile(path.join(root, pathname));
        response.setHeader('Content-Type', pathname.endsWith('.js') ? 'text/javascript' : 'text/html');
        response.end(body);
    } catch {
        response.writeHead(404).end();
    }
});

await mkdir(output, { recursive: true });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
    browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_BIN || undefined });
    const results = [];
    for (const scale of [1, 2]) {
        const page = await browser.newPage();
        try {
            await page.setViewport({ width: 1280, height: 950, deviceScaleFactor: scale });
            const errors = [];
            page.on('pageerror', (error) => errors.push(String(error)));
            await page.goto(
                `http://127.0.0.1:${server.address().port}/tests/reftests/filter/compositing.html?run=false`
            );
            // No-effect and opacity-only presets must bypass an empty SVG filter.
            const unfiltered = await page.evaluate(async () => {
                const { filterRaster } = await import('/tests/manual/filter-compositing.js');
                const source = document.createElement('canvas');
                source.width = source.height = 4;
                source.getContext('2d').fillRect(1, 1, 2, 2);
                const result = [];
                for (const opacity of [0, 0.5, 1]) {
                    const output = await filterRaster(source, { blur: 0, opacity }, 1);
                    const context = output.getContext('2d');
                    result.push({
                        center: context.getImageData(2, 2, 1, 1).data[3],
                        outside: context.getImageData(0, 0, 1, 1).data[3]
                    });
                }
                return result;
            });
            assert.deepEqual(unfiltered, [
                { center: 0, outside: 0 },
                { center: 128, outside: 0 },
                { center: 255, outside: 0 }
            ]);
            for (const id of ['shadow', 'blur', 'combined']) {
                const stage = await page.$(`#${id}`);
                const dom = await stage.screenshot();
                const captures = await page.evaluate(
                    async (id, scale) => {
                        const { captureCase } = await import('/tests/manual/filter-compositing.js');
                        const result = await captureCase(id, scale);
                        return { original: result.original.toDataURL(), prototype: result.prototype.toDataURL() };
                    },
                    id,
                    scale
                );
                const reference = PNG.sync.read(Buffer.from(dom));
                const original = decode(captures.original);
                const prototype = decode(captures.prototype);
                const result = {
                    browser: await browser.version(),
                    scale,
                    id,
                    originalMAE: meanAbsoluteError(reference, original),
                    prototypeMAE: meanAbsoluteError(reference, prototype),
                    originalCenter: pixel(original, 140 * scale, 100 * scale),
                    prototypeCenter: pixel(prototype, 140 * scale, 100 * scale),
                    originalOutside: pixel(original, 212 * scale, 110 * scale),
                    prototypeOutside: pixel(prototype, 212 * scale, 110 * scale)
                };
                results.push(result);
                console.log(JSON.stringify(result));
                await writeFile(path.join(output, `${scale}-${id}-dom.png`), dom);
                for (const [name, dataUrl] of Object.entries(captures)) {
                    await writeFile(
                        path.join(output, `${scale}-${id}-${name}.png`),
                        Buffer.from(dataUrl.split(',')[1], 'base64')
                    );
                }
                assert.ok(result.prototypeMAE < 1, `${id}: prototype differs from the DOM screenshot`);
                assert.ok(
                    result.prototypeMAE < result.originalMAE / 4,
                    `${id}: draft no longer demonstrates improvement`
                );
                if (id === 'combined') assert.ok(Math.abs(result.prototypeCenter[3] - 128) <= 1);
                if (id === 'shadow') assert.ok(result.prototypeOutside[3] > 50);
            }
            const stage = await page.$('#overflow');
            const reference = PNG.sync.read(Buffer.from(await stage.screenshot()));
            const capture = decode(
                await page.evaluate(async (scale) => {
                    const canvas = await window.html2canvas(document.getElementById('overflow'), {
                        scale,
                        backgroundColor: null,
                        logging: false
                    });
                    return canvas.toDataURL();
                }, scale)
            );
            // This remaining defect is reproduced, not fixed by the prototype.
            assert.deepEqual(pixel(reference, 75 * scale, 100 * scale), [225, 157, 24, 255]);
            assert.equal(pixel(capture, 75 * scale, 100 * scale)[3], 0);
            assert.deepEqual(errors, []);
        } finally {
            await page.close();
        }
    }
    await writeFile(path.join(output, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
} finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
}
