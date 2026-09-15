import { Bounds } from '../../css/layout/bounds';
import { ElementContainer } from '../../dom/element-container';
import { getAbsoluteValue } from '../../css/types/length-percentage';
import { filterOutset, parseSimpleFilter } from './filter-surface';

// Budget backing stores across all active nested surfaces in one capture.
// Reserve source, filtered output and decoded SVG/PNG rasters conservatively.
// Browser encoder/decoder overhead and the caller's output canvas are separate.
export const MAX_SURFACE_PIXELS = 16 * 1024 * 1024;
export const MAX_SURFACE_SIDE = 8192;
export interface SurfaceBudget {
    pixels: number;
}

export function reserveSurface(budget: SurfaceBudget, width: number, height: number): number {
    const pixels = width * height * 4;
    if (
        !Number.isFinite(pixels) ||
        width <= 0 ||
        height <= 0 ||
        width > MAX_SURFACE_SIDE ||
        height > MAX_SURFACE_SIDE ||
        budget.pixels + pixels > MAX_SURFACE_PIXELS
    )
        return 0;
    budget.pixels += pixels;
    return pixels;
}

const expand = (b: Bounds, margin: number): Bounds => b.add(-margin, -margin, margin * 2, margin * 2);
const union = (a: Bounds, b: Bounds): Bounds =>
    new Bounds(
        Math.min(a.left, b.left),
        Math.min(a.top, b.top),
        Math.max(a.left + a.width, b.left + b.width) - Math.min(a.left, b.left),
        Math.max(a.top + a.height, b.top + b.height) - Math.min(a.top, b.top)
    );

// Conservative paint bounds for the untransformed subtree supported by this path.
// Include overflow descendants, text ink padding, box/text shadows and nested filters.
export function surfaceBounds(container: ElementContainer): Bounds {
    const styles = container.styles;
    let bounds = container.bounds;
    for (const shadow of styles.boxShadow) {
        if (!shadow.inset) {
            const spread = Math.max(0, shadow.spread.number) + 3 * shadow.blur.number;
            bounds = union(
                bounds,
                expand(container.bounds.add(shadow.offsetX.number, shadow.offsetY.number, 0, 0), spread)
            );
        }
    }
    for (const text of container.textNodes) {
        for (const part of text.textBounds) {
            const ink = expand(
                part.bounds,
                2 * getAbsoluteValue(styles.fontSize, container.bounds.height) + styles.webkitTextStrokeWidth
            );
            bounds = union(bounds, ink);
            for (const shadow of styles.textShadow) {
                bounds = union(
                    bounds,
                    expand(ink.add(shadow.offsetX.number, shadow.offsetY.number, 0, 0), 3 * shadow.blur.number)
                );
            }
        }
    }
    for (const child of container.elements) {
        if (child.styles.isVisible()) bounds = union(bounds, surfaceBounds(child));
    }
    const filter = parseSimpleFilter(styles.filter);
    return expand(bounds, filter ? filterOutset(filter) : 0);
}

export function cropSurface(bounds: Bounds, viewport: Bounds, margin: number, scale: number): Bounds {
    // Pixels just outside the destination still contribute through blur/shadow.
    const area = expand(viewport, margin);
    const left = Math.floor(Math.max(bounds.left, area.left) * scale) / scale;
    const top = Math.floor(Math.max(bounds.top, area.top) * scale) / scale;
    const right = Math.ceil(Math.min(bounds.left + bounds.width, area.left + area.width) * scale) / scale;
    const bottom = Math.ceil(Math.min(bounds.top + bounds.height, area.top + area.height) * scale) / scale;
    return new Bounds(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}
