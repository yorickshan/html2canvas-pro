import { throwIfAborted } from '../../core/abort-helper';

// Only errors in the optional surface path are eligible for legacy fallback.
export class FilterSurfaceError extends Error {}

export const releaseSurface = (canvas: HTMLCanvasElement): void => {
    canvas.width = canvas.height = 0;
};

/**
 * A parsed CSS filter chain. Functions keep their declaration order — CSS
 * applies them left to right, and the native canvas backend reproduces that
 * order exactly. Chains containing functions the backends cannot express
 * (url() references, unknown functions) fail parsing and stay on the legacy
 * renderer, where ctx.filter receives the full string natively.
 */
export type FilterFunction =
    | { kind: 'blur'; value: number }
    | { kind: 'drop-shadow'; x: number; y: number; blur: number; color: string }
    | { kind: 'unitless'; name: UnitlessFilterName; value: number };

export type UnitlessFilterName =
    'brightness' | 'contrast' | 'grayscale' | 'hue-rotate' | 'invert' | 'opacity' | 'saturate' | 'sepia';

export interface ParsedFilter {
    functions: FilterFunction[];
}

const UNITLESS_NAMES: readonly UnitlessFilterName[] = [
    'brightness',
    'contrast',
    'grayscale',
    'hue-rotate',
    'invert',
    'opacity',
    'saturate',
    'sepia'
];

// Distinct filter strings are few, but parsing runs for every node of a
// canComposite() subtree walk, so identical values are memoised with a small
// LRU bound. Returned objects are treated as read-only by all callers.
const PARSED_FILTER_CACHE_MAX = 256;
const parsedFilterCache = new Map<string, ParsedFilter | null>();

const EMPTY_FILTER: ParsedFilter = { functions: [] };

export function parseFilterChain(value: string | null): ParsedFilter | null {
    if (!value || value === 'none') return EMPTY_FILTER;

    const cached = parsedFilterCache.get(value);
    if (cached !== undefined) {
        parsedFilterCache.delete(value);
        parsedFilterCache.set(value, cached);
        return cached;
    }

    const parsed = computeFilterChain(value);
    if (parsedFilterCache.size >= PARSED_FILTER_CACHE_MAX) {
        const oldest = parsedFilterCache.keys().next().value;
        if (oldest !== undefined) parsedFilterCache.delete(oldest);
    }
    parsedFilterCache.set(value, parsed);
    return parsed;
}

const computeFilterChain = (value: string): ParsedFilter | null => {
    const functions: FilterFunction[] = [];
    let index = 0;
    while (index < value.length) {
        const char = value[index];
        if (char === ' ' || char === '\n' || char === '\t') {
            index++;
            continue;
        }
        const open = value.indexOf('(', index);
        if (open === -1) return null; // stray content between functions
        const name = value.slice(index, open).trim();
        if (!/^[a-zA-Z-]+$/.test(name)) return null;
        const bodyEnd = matchingParenthesis(value, open);
        if (bodyEnd === -1) return null;
        const fn = parseFilterFunction(name, value.slice(open + 1, bodyEnd).trim());
        if (!fn) return null;
        functions.push(fn);
        index = bodyEnd + 1;
    }
    return { functions };
};

/** Index of the ')' matching the '(' at `open`, or -1. */
const matchingParenthesis = (value: string, open: number): number => {
    let depth = 1;
    for (let i = open + 1; i < value.length; i++) {
        const char = value[i];
        if (char === '(') depth++;
        else if (char === ')') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
};

const PX_LENGTH_RE = /^-?\d+(?:\.\d+)?px$/;

const parseFilterFunction = (name: string, body: string): FilterFunction | null => {
    if (name === 'blur') {
        // Nonzero unitless lengths are invalid; unitless zero is allowed.
        if (body === '0') return { kind: 'blur', value: 0 };
        if (!PX_LENGTH_RE.test(body)) return null;
        const value = Number.parseFloat(body);
        return value < 0 ? null : { kind: 'blur', value };
    }
    if (name === 'drop-shadow') {
        return parseDropShadowBody(body);
    }
    if ((UNITLESS_NAMES as readonly string[]).indexOf(name) !== -1) {
        const unitless = name as UnitlessFilterName;
        if (unitless === 'hue-rotate') {
            const degrees = parseAngleDegrees(body);
            return degrees === null ? null : { kind: 'unitless', name: unitless, value: degrees };
        }
        const trimmed = body.trim();
        const percentage = trimmed.endsWith('%');
        const numeric = percentage ? trimmed.slice(0, -1) : trimmed;
        if (!/^-?\d+(?:\.\d+)?$/.test(numeric)) return null;
        const value = Number.parseFloat(numeric) * (percentage ? 1 / 100 : 1);
        return { kind: 'unitless', name: unitless, value };
    }
    return null; // url() references and unknown functions stay on the legacy path
};

/** Split on whitespace outside parentheses so rgba(...) colours stay one token. */
const splitTopLevel = (body: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const char of body) {
        if (char === '(') depth++;
        else if (char === ')') depth--;
        if (char === ' ' && depth === 0) {
            if (current) parts.push(current);
            current = '';
            continue;
        }
        current += char;
    }
    if (current) parts.push(current);
    return parts;
};

const parseDropShadowBody = (body: string): FilterFunction | null => {
    const parts = splitTopLevel(body);
    const lengths = parts.filter((part) => PX_LENGTH_RE.test(part)).map((part) => Number.parseFloat(part));
    if (lengths.length < 2 || lengths.length > 3) return null;
    const colors = parts.filter((part) => !PX_LENGTH_RE.test(part));
    if (parts.length - colors.length !== lengths.length) return null;
    return {
        kind: 'drop-shadow',
        x: lengths[0] as number,
        y: lengths[1] as number,
        blur: (lengths[2] as number) ?? 0,
        color: colors.join(' ') || 'rgba(0, 0, 0, 0)'
    };
};

const parseAngleDegrees = (body: string): number | null => {
    const trimmed = body.trim();
    if (trimmed === '0') return 0;
    const numeric = Number.parseFloat(trimmed);
    if (Number.isNaN(numeric)) return null;
    if (trimmed.endsWith('deg')) return numeric;
    if (trimmed.endsWith('grad')) return numeric * 0.9;
    if (trimmed.endsWith('rad')) return (numeric * 180) / Math.PI;
    if (trimmed.endsWith('turn')) return numeric * 360;
    return null;
};

/**
 * Render the chain as a canvas ctx.filter string, scaling all device-space
 * lengths (blur radii, shadow offsets) by the capture scale. Unitless
 * functions and hue angles are scale-invariant.
 */
export const nativeFilterString = (filter: ParsedFilter, scale: number): string =>
    filter.functions
        .map((fn) => {
            switch (fn.kind) {
                case 'blur':
                    return `blur(${fn.value * scale}px)`;
                case 'drop-shadow':
                    return `drop-shadow(${fn.x * scale}px ${fn.y * scale}px ${fn.blur * scale}px ${fn.color})`;
                case 'unitless':
                    return fn.name === 'hue-rotate' ? `hue-rotate(${fn.value}deg)` : `${fn.name}(${fn.value})`;
            }
        })
        .join(' ');

/**
 * Outset (in CSS pixels) a surface must grow so blur/shadow spillover is not
 * cropped. Unitless functions never spread beyond the bounds. Consecutive
 * blurs compound, so their radii sum.
 */
export function filterOutset(filter: ParsedFilter): number {
    let blurSum = 0;
    let maxShadowOffset = 0;
    for (const fn of filter.functions) {
        if (fn.kind === 'blur') blurSum += fn.value;
        else if (fn.kind === 'drop-shadow') {
            blurSum += fn.blur;
            maxShadowOffset = Math.max(maxShadowOffset, Math.abs(fn.x), Math.abs(fn.y));
        }
    }
    return Math.ceil(3 * blurSum + maxShadowOffset);
}

function canvasLike(source: HTMLCanvasElement): HTMLCanvasElement {
    const canvas = (source.ownerDocument ?? document).createElement('canvas');
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
            const blurred = (context.getImageData(6, 12, 1, 1).data[3] ?? 0) > 0;
            context.clearRect(0, 0, 32, 32);
            context.filter = 'drop-shadow(12px 0px 0px rgba(255, 0, 0, 0.5))';
            context.drawImage(source, 0, 0);
            const shadow = context.getImageData(24, 12, 1, 1).data;
            supported =
                blurred &&
                (shadow[0] ?? 0) > 240 &&
                (shadow[1] ?? 0) < 10 &&
                (shadow[3] ?? 0) >= 126 &&
                (shadow[3] ?? 0) <= 129;
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
    filter: ParsedFilter,
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
        context.filter = nativeFilterString(filter, scale);
        if (context.filter === 'none' || context.filter === '') return null;
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

/**
 * The SVG fallback predates the ordered-chain parser and only expresses the
 * blur + single drop-shadow subset (at most one of each, blur before the
 * shadow). Chains outside that subset reject with FilterSurfaceError so the
 * caller keeps its legacy renderer instead of rendering a wrong filter.
 */
const isSvgExpressible = (filter: ParsedFilter): boolean => {
    let blurs = 0;
    let shadows = 0;
    for (const fn of filter.functions) {
        if (fn.kind === 'blur') blurs++;
        else if (fn.kind === 'drop-shadow') shadows++;
        else return false;
    }
    if (blurs > 1 || shadows > 1) return false;
    if (blurs > 0 && shadows > 0) {
        const blurIndex = filter.functions.findIndex((fn) => fn.kind === 'blur');
        const shadowIndex = filter.functions.findIndex((fn) => fn.kind === 'drop-shadow');
        return blurIndex < shadowIndex;
    }
    return true;
};

// Backend selection is internal; the public html2canvas options are unchanged.
export async function renderFilterSurface(
    source: HTMLCanvasElement,
    filter: ParsedFilter,
    opacity: number,
    scale: number,
    signal?: AbortSignal
): Promise<HTMLCanvasElement> {
    throwIfAborted(signal);
    if (filter.functions.length > 0 && supportsNativeFilters(source.ownerDocument ?? document)) {
        const output = tryNativeFilterSurface(source, filter, opacity, scale, signal);
        if (output) return output;
    }
    if (!isSvgExpressible(filter)) {
        // Native filters are unavailable (older WebKit) and the SVG fallback
        // cannot express this chain — reject so the caller keeps the legacy
        // renderer instead of rendering a wrong filter.
        throw new FilterSurfaceError('Filter chain requires native canvas filters');
    }
    return renderSvgFilterSurface(source, filter, opacity, scale, signal);
}

// Explicit SVG entry is internal and allows independent fallback benchmarks/tests.
// No foreignObject or external image is used.
async function renderSvgFilterSurface(
    source: HTMLCanvasElement,
    filter: ParsedFilter,
    opacity: number,
    scale: number,
    signal?: AbortSignal
): Promise<HTMLCanvasElement> {
    throwIfAborted(signal);
    const blur = filter.functions.find((fn) => fn.kind === 'blur');
    const shadow = filter.functions.find((fn) => fn.kind === 'drop-shadow');
    const blurValue = blur && blur.kind === 'blur' ? blur.value : 0;
    const shadowValue =
        shadow && shadow.kind === 'drop-shadow'
            ? { x: shadow.x, y: shadow.y, blur: shadow.blur, color: shadow.color }
            : undefined;
    if (!blurValue && !shadowValue) {
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
    const svgDocument = source.ownerDocument ?? document;
    const element = (tag: string, attributes: Record<string, string | number> = {}) => {
        const node = svgDocument.createElementNS(namespace, tag);
        Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
        return node;
    };
    const svg = element('svg', {
        width: source.width,
        height: source.height,
        viewBox: `0 0 ${source.width} ${source.height}`
    });
    const defs = element('defs');
    const filterElement = element('filter', {
        id: 'composited-filter',
        filterUnits: 'userSpaceOnUse',
        x: 0,
        y: 0,
        width: source.width,
        height: source.height,
        'color-interpolation-filters': 'sRGB'
    });
    if (blurValue) {
        filterElement.appendChild(
            element('feGaussianBlur', { stdDeviation: blurValue * scale, result: 'blurred-source' })
        );
    }
    if (shadowValue) {
        // Explicit primitives avoid the narrower feDropShadow blur observed in WebKit.
        filterElement.appendChild(
            element('feGaussianBlur', {
                in: blurValue ? 'blurred-source' : 'SourceAlpha',
                stdDeviation: shadowValue.blur * scale
            })
        );
        filterElement.appendChild(
            element('feOffset', { dx: shadowValue.x * scale, dy: shadowValue.y * scale, result: 'offset-shadow' })
        );
        filterElement.appendChild(element('feFlood', { 'flood-color': shadowValue.color }));
        filterElement.appendChild(element('feComposite', { in2: 'offset-shadow', operator: 'in' }));
        const merge = element('feMerge');
        merge.appendChild(element('feMergeNode'));
        merge.appendChild(element('feMergeNode', { in: blurValue ? 'blurred-source' : 'SourceGraphic' }));
        filterElement.appendChild(merge);
    }
    defs.appendChild(filterElement);
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
    const imageWindow = svgDocument.defaultView as (Window & { Image?: typeof Image }) | null;
    const image = imageWindow?.Image ? new imageWindow.Image() : new Image();
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
