import { Bounds } from '../../css/layout/bounds';
import { BoxShadow } from '../../css/property-descriptors/box-shadow';
import { asString, isTransparent } from '../../css/types/color-utilities';
import { SHADOW_MASK_OFFSET } from '../../core/constants';
import { ElementPaint } from '../stacking-context';
import { calculateBorderBoxPath, calculatePaddingBoxPath } from '../bound-curves';
import { paddingBox } from '../box-sizing';
import { Path, transformPath } from '../path';
import { createCanvasPath, formatCanvasPath } from './canvas-path';
import { FilterSurfaceError, releaseSurface, renderFilterSurface } from './filter-surface';
import { cropSurface, reserveSurface, SurfaceBudget } from './surface-bounds';
import { spreadShadowPath } from './box-shadow-geometry';

interface ShadowOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
    signal?: AbortSignal;
}

// Separate closed subpaths plus even-odd filling avoid reversing only the order
// of corner Beziers, which does not reverse the curves themselves.
const complement = (ctx: CanvasRenderingContext2D, rect: Bounds, hole: Path[]): void => {
    ctx.beginPath();
    ctx.rect(rect.left, rect.top, rect.width, rect.height);
    if (hole.length) {
        formatCanvasPath(ctx, hole);
        ctx.closePath();
    }
};

const insetHole = (paint: ElementPaint, shadow: BoxShadow[number], dx = 0): Path[] => {
    const spread = shadow.spread.number;
    const box = paddingBox(paint.container);
    if (box.width - 2 * spread <= 0 || box.height - 2 * spread <= 0) return [];
    return transformPath(spreadShadowPath(calculatePaddingBoxPath(paint.curves), -spread), dx, 0, 0, 0);
};

// An inset shadow is the blurred opaque exterior of a translated hole, clipped
// to the padding box. Rasterize the color once, rather than painting a colored
// source AND its colored Canvas shadow into the same semi-transparent edge.
const paintInsetSurface = async (
    ctx: CanvasRenderingContext2D,
    paint: ElementPaint,
    shadow: BoxShadow[number],
    options: ShadowOptions,
    budget: SurfaceBudget
): Promise<boolean> => {
    const padding = paddingBox(paint.container);
    const blur = shadow.blur.number / 2;
    const margin = Math.ceil(3 * blur) + 2;
    const bounds = cropSurface(
        padding.add(-margin, -margin, 2 * margin, 2 * margin),
        new Bounds(options.x, options.y, options.width, options.height),
        margin,
        options.scale
    );
    if (!bounds.width || !bounds.height) return true;
    const width = Math.ceil(bounds.width * options.scale);
    const height = Math.ceil(bounds.height * options.scale);
    const reserved = reserveSurface(budget, width, height);
    if (!reserved) return false;
    let source: HTMLCanvasElement | undefined;
    let filtered: HTMLCanvasElement | undefined;
    try {
        source = ctx.canvas.ownerDocument.createElement('canvas');
        source.width = width;
        source.height = height;
        const sourceCtx = source.getContext('2d');
        if (!sourceCtx) return false;
        sourceCtx.scale(options.scale, options.scale);
        sourceCtx.translate(-bounds.left, -bounds.top);
        const hole = transformPath(insetHole(paint, shadow), shadow.offsetX.number, shadow.offsetY.number, 0, 0);
        complement(sourceCtx, bounds, hole);
        sourceCtx.fillStyle = asString(shadow.color);
        sourceCtx.fill('evenodd');
        filtered = await renderFilterSurface(source, { blur }, 1, options.scale, options.signal);
        ctx.save();
        try {
            createCanvasPath(ctx, calculatePaddingBoxPath(paint.curves));
            ctx.clip();
            ctx.drawImage(
                filtered,
                bounds.left,
                bounds.top,
                filtered.width / options.scale,
                filtered.height / options.scale
            );
        } finally {
            ctx.restore();
        }
        return true;
    } catch (error) {
        if (!(error instanceof FilterSurfaceError)) throw error;
        return false;
    } finally {
        if (filtered && filtered !== source) releaseSurface(filtered);
        if (source) releaseSurface(source);
        budget.pixels -= reserved;
    }
};

export const paintBoxShadow = async (
    ctx: CanvasRenderingContext2D,
    paint: ElementPaint,
    shadow: BoxShadow[number],
    options: ShadowOptions,
    budget: SurfaceBudget
): Promise<void> => {
    if (options.signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
    if (isTransparent(shadow.color)) return;
    if (shadow.inset && shadow.blur.number > 0 && (await paintInsetSurface(ctx, paint, shadow, options, budget)))
        return;
    const spread = shadow.spread.number;
    if (
        !shadow.inset &&
        (paint.container.bounds.width + 2 * spread <= 0 || paint.container.bounds.height + 2 * spread <= 0)
    )
        return;
    const viewport = new Bounds(options.x, options.y, options.width, options.height);
    const padding = paddingBox(paint.container);
    ctx.save();
    try {
        if (shadow.inset && shadow.blur.number === 0) {
            createCanvasPath(ctx, calculatePaddingBoxPath(paint.curves));
            ctx.clip();
            complement(
                ctx,
                padding,
                transformPath(insetHole(paint, shadow), shadow.offsetX.number, shadow.offsetY.number, 0, 0)
            );
            ctx.fillStyle = asString(shadow.color);
            ctx.fill('evenodd');
            return;
        }
        const margin =
            Math.ceil(
                shadow.blur.number * 2 +
                    Math.abs(spread) +
                    Math.abs(shadow.offsetX.number) +
                    Math.abs(shadow.offsetY.number)
            ) + 2;
        const displacement = Math.max(SHADOW_MASK_OFFSET, options.width + margin * 2 + paint.container.bounds.width);
        if (shadow.inset) {
            // Allocation/CSP fallback: retain a bounded-memory native path. The
            // solid mask is offscreen; its alpha must not tint the visible edge.
            createCanvasPath(ctx, calculatePaddingBoxPath(paint.curves));
            ctx.clip();
            const sourceBounds = viewport.add(-displacement - margin, -margin, 2 * margin, 2 * margin);
            complement(ctx, sourceBounds, insetHole(paint, shadow, -displacement));
        } else {
            complement(ctx, viewport, calculateBorderBoxPath(paint.curves));
            ctx.clip('evenodd');
            const path = spreadShadowPath(calculateBorderBoxPath(paint.curves), spread);
            createCanvasPath(ctx, transformPath(path, -displacement, 0, 0, 0));
        }
        // Canvas shadow metrics are in output pixels, not transformed CSS pixels.
        // The displaced source must be moved back by the scaled displacement too.
        ctx.shadowOffsetX = (shadow.offsetX.number + displacement) * options.scale;
        ctx.shadowOffsetY = shadow.offsetY.number * options.scale;
        ctx.shadowBlur = shadow.blur.number * options.scale;
        ctx.shadowColor = asString(shadow.color);
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fill(shadow.inset ? 'evenodd' : 'nonzero');
    } finally {
        ctx.restore();
    }
};
