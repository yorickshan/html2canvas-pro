import { FilterEffect } from '../effects';

export interface SimpleFilter {
    blur: number;
    shadow?: { x: number; y: number; blur: number; color: string };
}

// This first renderer integration handles computed blur followed by one shadow.
// Unsupported chains retain the existing renderer until general filter support lands.
export function parseSimpleFilter(value: string | null): SimpleFilter | null {
    if (!value || value === 'none') return { blur: 0 };
    const effect = new FilterEffect(value);
    const shadows = value.match(/drop-shadow\(/g) || [];
    if (shadows.length > 1 || (shadows.length === 1 && !effect.shadow)) return null;
    const blur = effect.safeFilterString.match(/^blur\((\d+(?:\.\d+)?)px\)$/);
    if (effect.safeFilterString && !blur) return null;
    if (blur && shadows.length && value.indexOf('blur(') > value.indexOf('drop-shadow(')) return null;
    return {
        blur: blur ? Number(blur[1]) : 0,
        shadow: effect.shadow
            ? {
                  x: effect.shadow.offsetX,
                  y: effect.shadow.offsetY,
                  blur: effect.shadow.blur,
                  color: effect.shadow.color
              }
            : undefined
    };
}

export function filterOutset(filter: SimpleFilter): number {
    return Math.ceil(
        3 * (filter.blur + (filter.shadow?.blur ?? 0)) +
            Math.max(Math.abs(filter.shadow?.x ?? 0), Math.abs(filter.shadow?.y ?? 0))
    );
}

function canvasLike(source: HTMLCanvasElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    return canvas;
}

// Apply effects to the complete raster, then opacity. SVG also works in engines
// without Canvas 2D filters; no foreignObject or external image is used.
export async function renderFilterSurface(
    source: HTMLCanvasElement,
    { blur, shadow }: SimpleFilter,
    opacity: number,
    scale: number
): Promise<HTMLCanvasElement> {
    if (!blur && !shadow) {
        const output = canvasLike(source);
        const context = output.getContext('2d')!;
        context.globalAlpha = opacity;
        context.drawImage(source, 0, 0);
        return output;
    }
    const namespace = 'http://www.w3.org/2000/svg';
    const element = (tag: string, attributes: Record<string, string | number> = {}) => {
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
    filtered.getContext('2d')!.drawImage(image, 0, 0);
    const output = canvasLike(source);
    const context = output.getContext('2d')!;
    context.globalAlpha = opacity;
    context.drawImage(filtered, 0, 0);
    return output;
}
