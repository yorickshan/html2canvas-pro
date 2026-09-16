import { FilterEffect } from '../effects';
import { throwIfAborted } from '../../core/abort-helper';

// Only errors in the optional surface path are eligible for legacy fallback.
export class FilterSurfaceError extends Error {}

export const releaseSurface = (canvas: HTMLCanvasElement): void => {
    canvas.width = canvas.height = 0;
};

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

const decodeSurface = (image: HTMLImageElement, signal?: AbortSignal): Promise<void> =>
    new Promise((resolve, reject) => {
        const finish = (error?: Error) => {
            clearTimeout(timer);
            signal?.removeEventListener('abort', abort);
            if (error) reject(error);
            else resolve();
        };
        const abort = () => finish(new DOMException('The operation was aborted.', 'AbortError'));
        const timer = setTimeout(() => finish(new FilterSurfaceError('Filter surface image decode timed out')), 10000);
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) abort();
        else
            image.decode().then(
                () => finish(),
                () => finish(new FilterSurfaceError('Filter surface image decode failed'))
            );
    });

// Cache only a capability result, never raster storage. Separate Documents may use
// different Canvas implementations (including embedded webviews and test realms).
const canvasFilterSupport = new WeakMap<Document, boolean>();

export function supportsNativeFilters(owner: Document = document): boolean {
    const cached = canvasFilterSupport.get(owner);
    if (cached !== undefined) return cached;
    const source = owner.createElement('canvas');
    const target = owner.createElement('canvas');
    let supported = false;
    try {
        source.width = source.height = target.width = target.height = 32;
        const input = source.getContext('2d');
        const context = target.getContext('2d');
        // Check before assignment: on older WebKit assigning filter creates an
        // expando property, not a working implementation.
        if (input && context && 'filter' in context) {
            input.fillStyle = '#fff';
            input.fillRect(8, 8, 8, 8);
            context.filter = 'blur(2px)';
            context.drawImage(source, 0, 0);
            const blurred = context.getImageData(6, 12, 1, 1).data[3] > 0;
            context.clearRect(0, 0, 32, 32);
            context.filter = 'drop-shadow(12px 0px 0px rgba(255, 0, 0, 0.5))';
            context.drawImage(source, 0, 0);
            const shadow = context.getImageData(24, 12, 1, 1).data;
            supported = blurred && shadow[0] > 240 && shadow[1] < 10 && shadow[3] >= 126 && shadow[3] <= 129;
        }
    } catch {
        // Readback can itself be unavailable. Be conservative and retain SVG.
    } finally {
        releaseSurface(source);
        releaseSurface(target);
    }
    canvasFilterSupport.set(owner, supported);
    return supported;
}

function tryNativeFilterSurface(
    source: HTMLCanvasElement,
    { blur, shadow }: SimpleFilter,
    opacity: number,
    scale: number,
    signal?: AbortSignal
): HTMLCanvasElement | null {
    let filtered: HTMLCanvasElement | undefined;
    let output: HTMLCanvasElement | undefined;
    let complete = false;
    try {
        throwIfAborted(signal);
        filtered = canvasLike(source);
        const context = filtered.getContext('2d');
        if (!context || !('filter' in context)) return null;
        const functions = [];
        if (blur) functions.push(`blur(${blur * scale}px)`);
        if (shadow)
            functions.push(
                `drop-shadow(${shadow.x * scale}px ${shadow.y * scale}px ${shadow.blur * scale}px ${shadow.color})`
            );
        context.filter = functions.join(' ');
        if (context.filter === 'none') return null;
        // Canvas applies globalAlpha before filtering. Filter the complete layer
        // at alpha 1, then composite opacity separately, including its shadow.
        context.drawImage(source, 0, 0);
        throwIfAborted(signal);
        output = canvasLike(source);
        const composite = output.getContext('2d');
        if (!composite) return null;
        composite.globalAlpha = opacity;
        composite.drawImage(filtered, 0, 0);
        throwIfAborted(signal);
        complete = true;
        return output;
    } catch {
        // A native allocation/draw failure may still succeed through SVG, but
        // cancellation must never silently degrade to a successful fallback.
        throwIfAborted(signal);
        return null;
    } finally {
        if (filtered) releaseSurface(filtered);
        if (output && !complete) releaseSurface(output);
    }
}

// Backend selection is internal; the public html2canvas options are unchanged.
export async function renderFilterSurface(
    source: HTMLCanvasElement,
    filter: SimpleFilter,
    opacity: number,
    scale: number,
    signal?: AbortSignal
): Promise<HTMLCanvasElement> {
    throwIfAborted(signal);
    if ((filter.blur || filter.shadow) && supportsNativeFilters()) {
        const output = tryNativeFilterSurface(source, filter, opacity, scale, signal);
        if (output) return output;
    }
    return renderSvgFilterSurface(source, filter, opacity, scale, signal);
}

// Explicit SVG entry is internal and allows independent fallback benchmarks/tests.
// No foreignObject or external image is used.
export async function renderSvgFilterSurface(
    source: HTMLCanvasElement,
    { blur, shadow }: SimpleFilter,
    opacity: number,
    scale: number,
    signal?: AbortSignal
): Promise<HTMLCanvasElement> {
    throwIfAborted(signal);
    if (!blur && !shadow) {
        const output = canvasLike(source);
        const context = output.getContext('2d');
        if (!context) {
            releaseSurface(output);
            throw new FilterSurfaceError('Filter surface canvas is unavailable');
        }
        context.globalAlpha = opacity;
        try {
            context.drawImage(source, 0, 0);
            return output;
        } catch {
            releaseSurface(output);
            throw new FilterSurfaceError('Filter surface image cannot be drawn');
        }
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
    let sourceUrl: string;
    try {
        sourceUrl = source.toDataURL('image/png');
        if (sourceUrl === 'data:,') throw new Error('Canvas size is unsupported');
    } catch {
        // allowTaint may intentionally produce an unreadable canvas. Keep that
        // API behavior by letting the caller render the subtree on the old path.
        throw new FilterSurfaceError('Filter surface pixels cannot be serialized');
    }
    svg.appendChild(
        element('image', {
            width: source.width,
            height: source.height,
            href: sourceUrl,
            filter: 'url(#composited-filter)'
        })
    );
    const image = new Image();
    let output: HTMLCanvasElement | undefined;
    try {
        image.src = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
        await decodeSurface(image, signal);
        throwIfAborted(signal);
        output = canvasLike(source);
        const context = output.getContext('2d');
        if (!context) throw new FilterSurfaceError('Filter surface canvas is unavailable');
        context.globalAlpha = opacity;
        context.drawImage(image, 0, 0);
        return output;
    } catch (error) {
        if (output) releaseSurface(output);
        if (signal?.aborted) throwIfAborted(signal);
        throw error instanceof FilterSurfaceError
            ? error
            : new FilterSurfaceError('Filter surface image cannot be drawn');
    } finally {
        image.removeAttribute('src');
    }
}
