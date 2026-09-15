// Draft experiment for compositing.html, not an html2canvas API or a CSS parser.
// Each fixture has one untransformed filtered layer and deliberately ample padding.
const cases = {
    shadow: { blur: 0, shadow: { x: 12, y: 8, blur: 8, color: 'rgba(0, 0, 0, 0.6)' }, opacity: 1 },
    blur: { blur: 4, opacity: 1 },
    combined: { blur: 4, shadow: { x: 12, y: 8, blur: 8, color: 'rgba(0, 0, 0, 0.6)' }, opacity: 0.5 }
};

function canvasLike(source) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    return canvas;
}

// SVG is used even in Chromium here, so both browsers exercise the same fallback.
// The source is already rasterized: no foreignObject or external resources are used.
export async function filterRaster(source, { blur, shadow, opacity }, scale) {
    const namespace = 'http://www.w3.org/2000/svg';
    const element = (tag, attributes = {}) => {
        const node = document.createElementNS(namespace, tag);
        Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
        return node;
    };
    const svg = element('svg', {
        width: source.width,
        height: source.height,
        viewBox: `0 0 ${source.width} ${source.height}`
    });
    const defs = element('defs');
    const filter = element('filter', {
        id: 'composited-filter',
        filterUnits: 'userSpaceOnUse',
        x: 0,
        y: 0,
        width: source.width,
        height: source.height,
        'color-interpolation-filters': 'sRGB'
    });
    if (blur) {
        filter.appendChild(element('feGaussianBlur', { stdDeviation: blur * scale, result: 'blurred-source' }));
    }
    if (shadow) {
        // Explicit primitives avoid the narrower feDropShadow blur observed in WebKit.
        filter.appendChild(
            element('feGaussianBlur', {
                in: blur ? 'blurred-source' : 'SourceAlpha',
                stdDeviation: shadow.blur * scale
            })
        );
        filter.appendChild(
            element('feOffset', { dx: shadow.x * scale, dy: shadow.y * scale, result: 'offset-shadow' })
        );
        filter.appendChild(element('feFlood', { 'flood-color': shadow.color }));
        filter.appendChild(element('feComposite', { in2: 'offset-shadow', operator: 'in' }));
        const merge = element('feMerge');
        merge.appendChild(element('feMergeNode'));
        merge.appendChild(element('feMergeNode', { in: blur ? 'blurred-source' : 'SourceGraphic' }));
        filter.appendChild(merge);
    }
    defs.appendChild(filter);
    svg.appendChild(defs);
    svg.appendChild(
        element('image', {
            width: source.width,
            height: source.height,
            href: source.toDataURL('image/png'),
            filter: 'url(#composited-filter)'
        })
    );
    const image = new Image();
    image.src = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
    await image.decode();
    const filtered = canvasLike(source);
    filtered.getContext('2d').drawImage(image, 0, 0);
    const output = canvasLike(source);
    const context = output.getContext('2d');
    context.globalAlpha = opacity;
    context.drawImage(filtered, 0, 0);
    return output;
}

export async function captureCase(id, scale = 1) {
    if (!cases[id]) throw new Error(`Unknown experiment: ${id}`);
    const stage = document.getElementById(id);
    const options = { backgroundColor: null, scale, logging: false };
    const original = await window.html2canvas(stage, options);
    const source = await window.html2canvas(stage, {
        ...options,
        onclone(document) {
            const layer = document.querySelector(`#${id} .layer`);
            layer.style.filter = 'none';
            layer.style.opacity = '1';
        }
    });
    const prototype = await filterRaster(source, cases[id], scale);
    return { original, source, prototype };
}

export async function showPrototype() {
    const notice = document.createElement('p');
    notice.textContent =
        'Draft: each row shows live DOM, current library capture, then SVG-composited prototype. SVG overflow remains unfixed.';
    document.querySelector('h1').after(notice);
    for (const id of Object.keys(cases)) {
        const { original, prototype } = await captureCase(id);
        for (const [label, canvas] of [
            ['Current capture', original],
            ['Prototype', prototype]
        ]) {
            canvas.className = 'result';
            canvas.setAttribute('aria-label', `${id}: ${label}`);
            const caption = document.createElement('p');
            caption.textContent = label;
            document.getElementById(id).parentElement.append(caption, canvas);
        }
    }
}
