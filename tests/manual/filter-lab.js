import { captureLayer } from './filter-compositing.js';

const $ = (id) => document.getElementById(id);
const presets = [
    { name: 'No effects', blur: false, shadow: false, opacity: false },
    { name: 'Blur', blur: true, shadow: false, opacity: false },
    { name: 'Shadow', blur: false, shadow: true, opacity: false },
    { name: 'Opacity', blur: false, shadow: false, opacity: true },
    { name: 'Blur + shadow', blur: true, shadow: true, opacity: false },
    { name: 'Blur + opacity', blur: true, shadow: false, opacity: true },
    { name: 'Shadow + opacity', blur: false, shadow: true, opacity: true },
    { name: 'All three', blur: true, shadow: true, opacity: true }
];
const shadow = { x: 12, y: 8, blur: 8, color: 'rgba(0, 0, 0, 0.6)' };
const presetEffects = (preset) => ({
    blur: preset.blur ? 4 : 0,
    shadow: preset.shadow ? { ...shadow } : undefined,
    opacity: preset.opacity ? 0.5 : 1
});

function imageSource() {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 120;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 240, 120);
    gradient.addColorStop(0, '#176b70');
    gradient.addColorStop(1, '#d9b25e');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 240, 120);
    context.fillStyle = '#fff9';
    context.beginPath();
    context.arc(175, 40, 25, 0, Math.PI * 2);
    context.fill();
    return canvas.toDataURL();
}

const fixtures = {
    cta: '<div class="cta">Get started</div>',
    overlap: '<div class="piece"></div><div class="piece"></div>',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" rx="16" fill="#176b70"/></svg>',
    image: `<img alt="Locally generated gradient" src="${imageSource()}" />`
};

function capability() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const context = canvas.getContext('2d');
    const exposed = typeof context.filter === 'string';
    let blurWorks = false;
    if (exposed) {
        context.filter = 'blur(2px)';
        context.fillRect(6, 6, 4, 4);
        blurWorks = context.getImageData(4, 7, 1, 1).data[3] > 0;
    }
    return {
        canvasFilterExposed: exposed,
        canvasBlurWorks: blurWorks,
        userAgent: navigator.userAgent,
        devicePixelRatio
    };
}

const runtime = capability();
$('capability').textContent = runtime.canvasBlurWorks
    ? 'This runtime: Canvas 2D blur works. The prototype still exercises the SVG path.'
    : 'This runtime: Canvas 2D blur is unavailable. The prototype uses the SVG path.';
$('runtime').textContent = `${runtime.userAgent} · device pixel ratio ${runtime.devicePixelRatio}`;

let busy = false;
let comparisonReport = null;
let matrixReport = [];
const settings = () => ({
    source: $('source').value,
    scale: Number($('scale').value),
    effects: {
        blur: Number($('blur').value),
        shadow: $('shadow').checked
            ? {
                  x: Number($('shadow-x').value),
                  y: Number($('shadow-y').value),
                  blur: Number($('shadow-blur').value),
                  color: shadow.color
              }
            : undefined,
        opacity: Number($('opacity').value) / 100
    }
});

function filterCss(effects) {
    return (
        [
            ...(effects.blur ? [`blur(${effects.blur}px)`] : []),
            ...(effects.shadow
                ? [
                      `drop-shadow(${effects.shadow.x}px ${effects.shadow.y}px ${effects.shadow.blur}px ${effects.shadow.color})`
                  ]
                : [])
        ].join(' ') || 'none'
    );
}
const describe = (effects) => `filter: ${filterCss(effects)}; opacity: ${effects.opacity};`;

function setLayer(stage, source, effects) {
    const layer = stage.querySelector('.layer');
    // Source is selected from the static local fixtures above, never remote HTML.
    layer.innerHTML = fixtures[source];
    layer.style.filter = filterCss(effects);
    layer.style.opacity = String(effects.opacity);
}

function clearOutput(frame) {
    const placeholder = document.createElement('p');
    placeholder.className = 'placeholder';
    placeholder.textContent = 'Capture to compare';
    frame.replaceChildren(placeholder);
}

function updateReport() {
    const report = {
        draft: true,
        productionRendererChanged: true,
        capturedAt: new Date().toISOString(),
        runtime,
        comparison: comparisonReport,
        matrix: matrixReport,
        limitations:
            'Single untransformed layer; blur then one shadow then opacity. No nested effects or SVG overflow fix.'
    };
    $('report-download').href =
        `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(report, null, 2))}`;
    $('report-download').download = 'filter-lab-report.json';
    $('report-download').hidden = !comparisonReport && !matrixReport.length;
}

function buildMatrix() {
    const { source } = settings();
    $('matrix').replaceChildren();
    presets.forEach((preset, index) => {
        const row = document.createElement('section');
        row.className = 'matrix-row';
        row.dataset.preset = String(index);
        row.innerHTML = `<h3></h3><code class="css-value"></code><div class="comparison">
            <figure><figcaption>Live DOM</figcaption><div class="frame"><div class="scene" id="matrix-${index}"><div class="layer"></div></div></div></figure>
            <figure><figcaption>Draft PR renderer</figcaption><div class="frame original" data-html2canvas-ignore></div><p class="metric"></p></figure>
            <figure><figcaption>SVG surface prototype</figcaption><div class="frame prototype" data-html2canvas-ignore></div><p class="metric"></p></figure>
        </div>`;
        row.querySelector('h3').textContent = preset.name;
        row.querySelector('code').textContent = describe(presetEffects(preset));
        setLayer(row.querySelector('.scene'), source, presetEffects(preset));
        clearOutput(row.querySelector('.original'));
        clearOutput(row.querySelector('.prototype'));
        $('matrix').appendChild(row);
    });
    matrixReport = [];
    $('matrix-status').textContent = 'Choose Capture all eight to generate the PNG comparisons.';
    $('matrix-status').dataset.error = 'false';
}

function refresh({ rebuildMatrix = false } = {}) {
    const { source, effects } = settings();
    for (const id of ['blur', 'shadow-blur', 'shadow-x', 'shadow-y']) $(id + '-value').value = `${$(id).value} px`;
    $('opacity-value').value = `${$('opacity').value}%`;
    for (const id of ['shadow-blur', 'shadow-x', 'shadow-y']) $(id).disabled = !$('shadow').checked;
    setLayer($('playground'), source, effects);
    $('css-value').textContent = describe(effects);
    for (const output of ['original', 'prototype']) {
        clearOutput($(output + '-output'));
        $(output + '-metric').textContent = '—';
        $(output + '-download').hidden = true;
    }
    comparisonReport = null;
    $('status').textContent = 'Settings changed. Capture to update both PNGs.';
    $('status').dataset.error = 'false';
    document.querySelectorAll('#presets button').forEach((button, index) => {
        button.setAttribute('aria-pressed', String(describe(effects) === describe(presetEffects(presets[index]))));
    });
    if (rebuildMatrix) buildMatrix();
    updateReport();
}

function setBusy(value) {
    busy = value;
    $('controls').disabled = value;
    $('capture').disabled = value;
    $('capture-matrix').disabled = value;
    $('comparison').setAttribute('aria-busy', String(value));
    $('matrix').setAttribute('aria-busy', String(value));
}

function canvasMetrics(canvas) {
    const context = canvas.getContext('2d');
    const alpha = context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data[3];
    return { width: canvas.width, height: canvas.height, centerAlpha: alpha };
}
const metricLabel = (metric) =>
    `${metric.width} × ${metric.height} px · center alpha ${(metric.centerAlpha / 255).toFixed(2)}`;

async function captureComparison() {
    if (busy) return;
    setBusy(true);
    $('status').textContent = 'Capturing the element and applying effects to the complete layer…';
    const selected = settings();
    const started = performance.now();
    try {
        const result = await captureLayer($('playground'), selected.effects, selected.scale);
        const metrics = {};
        for (const name of ['original', 'prototype']) {
            const canvas = result[name];
            canvas.setAttribute('aria-label', `${selected.source}: ${name} capture`);
            $(name + '-output').replaceChildren(canvas);
            metrics[name] = canvasMetrics(canvas);
            $(name + '-metric').textContent = metricLabel(metrics[name]);
            $(name + '-download').href = canvas.toDataURL();
            $(name + '-download').download = `filter-lab-${selected.source}-${name}.png`;
            $(name + '-download').hidden = false;
        }
        comparisonReport = { ...selected, metrics, elapsedMs: Math.round(performance.now() - started) };
        $('status').textContent = `Comparison ready · ${comparisonReport.elapsedMs} ms · SVG prototype path`;
        $('status').dataset.error = 'false';
    } catch (error) {
        for (const name of ['original', 'prototype']) {
            clearOutput($(name + '-output'));
            $(name + '-download').hidden = true;
            $(name + '-metric').textContent = '—';
        }
        comparisonReport = null;
        $('status').textContent = `Capture failed: ${error.message}. Controls remain available; adjust and retry.`;
        $('status').dataset.error = 'true';
    } finally {
        setBusy(false);
        updateReport();
    }
}

async function captureMatrix() {
    if (busy) return;
    setBusy(true);
    buildMatrix();
    const { source, scale } = settings();
    try {
        for (const [index, preset] of presets.entries()) {
            $('matrix-status').textContent = `Capturing ${index + 1} / ${presets.length}: ${preset.name}…`;
            const effects = presetEffects(preset);
            const result = await captureLayer($(`matrix-${index}`), effects, scale);
            const row = document.querySelector(`[data-preset="${index}"]`);
            const metrics = {};
            for (const name of ['original', 'prototype']) {
                const canvas = result[name];
                canvas.setAttribute('aria-label', `${preset.name}: ${name} capture`);
                row.querySelector('.' + name).replaceChildren(canvas);
                metrics[name] = canvasMetrics(canvas);
                row.querySelector('.' + name).nextElementSibling.textContent = metricLabel(metrics[name]);
            }
            matrixReport.push({ preset: preset.name, source, scale, effects, metrics });
        }
        $('matrix-status').textContent = `All eight combinations captured · ${source} · ${scale}× · SVG prototype path`;
    } catch (error) {
        $('matrix-status').textContent =
            `Stopped after ${matrixReport.length} completed rows: ${error.message}. Retry with Capture all eight.`;
        $('matrix-status').dataset.error = 'true';
    } finally {
        setBusy(false);
        updateReport();
    }
}

presets.forEach((preset) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = preset.name;
    button.addEventListener('click', () => {
        const effects = presetEffects(preset);
        $('blur').value = String(effects.blur);
        $('opacity').value = String(effects.opacity * 100);
        $('shadow').checked = preset.shadow;
        $('shadow-x').value = String(shadow.x);
        $('shadow-y').value = String(shadow.y);
        $('shadow-blur').value = String(shadow.blur);
        refresh();
    });
    $('presets').appendChild(button);
});
$('controls').addEventListener('input', (event) =>
    refresh({ rebuildMatrix: ['source', 'scale'].includes(event.target.id) })
);
$('capture').addEventListener('click', captureComparison);
$('capture-matrix').addEventListener('click', captureMatrix);
for (const name of ['original', 'prototype']) $(name + '-output').setAttribute('data-html2canvas-ignore', '');
refresh({ rebuildMatrix: true });
setBusy(true);
$('status').textContent = 'Waiting for the page and renderer to finish loading…';
const initialCapture = () => {
    setBusy(false);
    captureComparison();
};
if (document.readyState === 'complete') initialCapture();
else window.addEventListener('load', initialCapture, { once: true });
