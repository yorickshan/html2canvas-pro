// Build first. Compares CSS `filter: url(#id)` captures with the live DOM.
// Run with: node scripts/filter-reference-regressions.mjs [chromium,firefox,webkit]
//
// Chromium and Firefox render referenced SVG filters on HTML elements, so the
// capture must match the live pixels. WebKit's live rendering differs for the
// alpha-inverting inner shadow on HTML boxes (it paints none, or artifacts), so
// there the check is that the capture contains the filter output; the glow,
// which WebKit does paint, is compared with the live DOM in every engine.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import playwright from 'playwright';

const library = fileURLToPath(new URL('../dist/html2canvas-pro.js', import.meta.url));
const output = new URL('../tmp/filter-surface-regressions/', import.meta.url);
await mkdir(output, { recursive: true });

// Inner shadow: inverted alpha, blurred, offset, tinted red and clipped to the source.
const filterMarkup = (id) => `
<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">
  <filter id="${id}" color-interpolation-filters="sRGB">
    <feComponentTransfer in="SourceAlpha" result="inverted"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer>
    <feGaussianBlur in="inverted" stdDeviation="4" result="blurred"/>
    <feOffset in="blurred" dx="6" dy="6" result="offset"/>
    <feFlood class="tint" result="flood"/>
    <feComposite in="flood" in2="offset" operator="in" result="tinted"/>
    <feComposite in="tinted" in2="SourceAlpha" operator="in" result="shadow"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shadow"/></feMerge>
  </filter>
</svg>`;
// Outer glow in a region twice the border box: paints outside the element.
const glowMarkup = (id) => `
<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">
  <filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
    <feMorphology in="SourceAlpha" operator="dilate" radius="6" result="grown"/>
    <feGaussianBlur in="grown" stdDeviation="6" result="soft"/>
    <feFlood flood-color="#ffb703" result="color"/>
    <feComposite in="color" in2="soft" operator="in" result="glow"/>
    <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</svg>`;
const box = 'width:100px;height:100px;background:#8ecae6';
const cases = [
    { name: 'box', filter: 'url(#f-box)', html: `<div style="${box}"></div>` },
    {
        name: 'box with text',
        filter: 'url(#f-text)',
        html: `<div style="${box};border-radius:20px;font:bold 28px sans-serif;color:#023047;display:flex;align-items:center;justify-content:center">Hi</div>`
    },
    {
        name: 'inline svg',
        filter: 'url(#f-svg)',
        html: '<svg width="100" height="100"><circle cx="50" cy="50" r="48" fill="#8ecae6"/></svg>'
    },
    {
        name: 'chain with blur and drop-shadow',
        filter: 'url(#f-chain) blur(1px) drop-shadow(4px 4px 4px rgba(0, 0, 0, 0.6))',
        html: `<div style="${box}"></div>`
    },
    {
        name: 'layer opacity',
        filter: 'url(#f-opacity)',
        opacity: 0.5,
        html: `<div style="${box}"></div>`
    },
    { name: 'text', filter: 'url(#f-glyphs)', html: '<div style="font:bold 40px sans-serif;color:#219ebc">Abc</div>' },
    {
        name: 'glow outside the border box',
        filter: 'url(#f-glow)',
        markup: glowMarkup,
        shadow: false,
        matchesWebKit: true,
        html: `<div style="${box};border-radius:50%"></div>`
    },
    // An unresolved reference keeps the existing renderer and must not throw.
    { name: 'missing reference', filter: 'url(#missing)', html: `<div style="${box}"></div>`, reference: false }
];
const page = `<!doctype html><html><head><style>
  body { margin: 0; background: #fff }
  .case { position: absolute; top: 0; width: 160px; height: 160px; background: #fff }
  .tint { flood-color: #ff0000 }
</style></head><body>${cases
    .map(({ filter, html, markup = filterMarkup, opacity = 1 }, index) => {
        const id = /#([\w-]+)/.exec(filter)[1];
        return `<div class="case" style="left:${index * 170}px">${id === 'missing' ? '' : markup(id)}
  <div style="position:absolute;left:30px;top:30px;filter:${filter};opacity:${opacity}">${html}</div></div>`;
    })
    .join('')}</body></html>`;

const engines = (process.argv[2] ?? 'chromium,webkit').split(',');
const reports = [];
try {
    for (const name of engines) {
        const browser = await playwright[name].launch({ headless: true });
        try {
            for (const scale of [1, 2]) {
                const context = await browser.newContext({ deviceScaleFactor: scale });
                const tab = await context.newPage();
                await tab.setContent(page);
                await tab.addScriptTag({ path: library });
                const elements = await tab.$$('.case');
                for (const [index, testCase] of cases.entries()) {
                    const live = (await elements[index].screenshot()).toString('base64');
                    const row = await tab.evaluate(
                        async ({ index, scale, live }) => {
                            const element = document.querySelectorAll('.case')[index];
                            const capture = await window.html2canvas(element, {
                                scale,
                                backgroundColor: '#ffffff',
                                logging: false
                            });
                            const image = new Image();
                            image.src = `data:image/png;base64,${live}`;
                            await image.decode();
                            const read = (source) => {
                                const canvas = document.createElement('canvas');
                                canvas.width = canvas.height = 160 * scale;
                                const context = canvas.getContext('2d');
                                context.drawImage(source, 0, 0, canvas.width, canvas.height);
                                return context.getImageData(0, 0, canvas.width, canvas.height).data;
                            };
                            const a = read(image);
                            const b = read(capture);
                            let error = 0;
                            let liveRed = 0;
                            let captureRed = 0;
                            const red = (data, i) => data[i] > 150 && data[i + 1] < 120 && data[i + 2] < 140;
                            for (let i = 0; i < a.length; i += 4) {
                                for (let c = 0; c < 3; c++) error += Math.abs(a[i + c] - b[i + c]);
                                if (red(a, i)) liveRed++;
                                if (red(b, i)) captureRed++;
                            }
                            return { rgbMAE: error / (a.length * 0.75), liveRed, captureRed };
                        },
                        { index, scale, live }
                    );
                    const report = { engine: name, scale, case: testCase.name, ...row };
                    reports.push(report);
                    const expectsShadow =
                        testCase.reference !== false && testCase.opacity === undefined && testCase.shadow !== false;
                    if (testCase.reference === false) {
                        // Engines disagree on a missing reference: Firefox hides the
                        // element, Chromium paints it unfiltered. Only require that the
                        // capture completed without inventing a filter.
                        assert.equal(row.captureRed, 0, JSON.stringify(report));
                    } else if (name === 'webkit' && !testCase.matchesWebKit) {
                        if (expectsShadow) assert.ok(row.captureRed > 0, JSON.stringify(report));
                    } else {
                        // The glow's wide blur is quantized slightly differently for an
                        // HTML box's filter and for the same filter inside an SVG image.
                        const tolerance = testCase.matchesWebKit ? 1.5 : 0.5;
                        assert.ok(row.rgbMAE < tolerance, JSON.stringify(report));
                        if (expectsShadow) {
                            assert.ok(row.liveRed > 0, JSON.stringify(report));
                            assert.ok(
                                Math.abs(row.captureRed - row.liveRed) <= row.liveRed * 0.02,
                                JSON.stringify(report)
                            );
                        }
                    }
                }
                await context.close();
            }
        } finally {
            await browser.close();
        }
    }
} finally {
    await writeFile(new URL('filter-reference-regressions.json', output), JSON.stringify(reports, null, 2));
}
console.log(JSON.stringify(reports));
