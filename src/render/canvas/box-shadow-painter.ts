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
import { shadowSpace, ShadowSpace } from './box-shadow-transform';

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

const insetHole = (paint: ElementPaint, shadow: BoxShadow[number]): Path[] => {
    const spread = shadow.spread.number;
    const box = paddingBox(paint.container);
    if (box.width - 2 * spread <= 0 || box.height - 2 * spread <= 0) return [];
    return spreadShadowPath(calculatePaddingBoxPath(paint.curves), -spread);
};

// Rasterize in local coordinates, blur once, and then let the destination CTM
// transform the complete shadow. This also preserves anisotropic/sheared blur.
const paintShadowSurface = async (
    ctx: CanvasRenderingContext2D,
    paint: ElementPaint,
    shadow: BoxShadow[number],
    options: ShadowOptions,
    budget: SurfaceBudget,
    space: ShadowSpace
): Promise<boolean> => {
    const padding = paddingBox(paint.container);
    const blur = shadow.blur.number / 2;
    const margin = Math.ceil(3 * blur) + 2;
    const spread = shadow.spread.number;
    const area = shadow.inset
        ? padding
        : paint.container.bounds.add(
              shadow.offsetX.number - spread,
              shadow.offsetY.number - spread,
              2 * spread,
              2 * spread
          );
    const bounds = cropSurface(area.add(-margin, -margin, 2 * margin, 2 * margin), space.viewport, margin, space.scale);
    if (!bounds.width || !bounds.height) return true;
    const width = Math.ceil(bounds.width * space.scale);
    const height = Math.ceil(bounds.height * space.scale);
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
        sourceCtx.scale(space.scale, space.scale);
        sourceCtx.translate(-bounds.left, -bounds.top);
        const silhouette = shadow.inset
            ? insetHole(paint, shadow)
            : spreadShadowPath(calculateBorderBoxPath(paint.curves), spread);
        const path = transformPath(silhouette, shadow.offsetX.number, shadow.offsetY.number, 0, 0);
        if (shadow.inset) complement(sourceCtx, bounds, path);
        else createCanvasPath(sourceCtx, path);
        sourceCtx.fillStyle = asString(shadow.color);
        sourceCtx.fill(shadow.inset ? 'evenodd' : 'nonzero');
        filtered = await renderFilterSurface(source, { blur }, 1, space.scale, options.signal);
        ctx.save();
        try {
            if (shadow.inset) {
                createCanvasPath(ctx, calculatePaddingBoxPath(paint.curves));
                ctx.clip();
            } else {
                complement(ctx, space.viewport, calculateBorderBoxPath(paint.curves));
                ctx.clip('evenodd');
            }
            ctx.drawImage(
                filtered,
                bounds.left,
                bounds.top,
                filtered.width / space.scale,
                filtered.height / space.scale
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
    const spread = shadow.spread.number;
    if (
        !shadow.inset &&
        (paint.container.bounds.width + 2 * spread <= 0 || paint.container.bounds.height + 2 * spread <= 0)
    )
        return;
    // getTransform includes capture scale, CSS transforms and their origins.
    // Without it the CTM is unknown: approximate it with the capture transform
    // and only ever move the mask relative to the real CTM (see below).
    const knownTransform = typeof ctx.getTransform === 'function';
    const matrix = knownTransform
        ? ctx.getTransform()
        : {
              a: options.scale,
              b: 0,
              c: 0,
              d: options.scale,
              e: -options.x * options.scale,
              f: -options.y * options.scale
          };
    const space = shadowSpace(matrix, ctx.canvas.width, ctx.canvas.height);
    // Singular transforms have zero painted area; never attempt to invert them.
    if (!space) return;
    const { viewport } = space;
    if (
        shadow.blur.number > 0 &&
        (shadow.inset || !space.uniform) &&
        (await paintShadowSurface(ctx, paint, shadow, options, budget, space))
    )
        return;
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
        // Displace in OUTPUT pixels, not along a CSS axis. A rotated or reflected
        // local x axis need not point off the left edge of the output bitmap.
        const sourceBounds = shadow.inset
            ? padding.add(-margin, -margin, 2 * margin, 2 * margin)
            : paint.container.bounds.add(-spread, -spread, 2 * spread, 2 * spread);
        const { a, b, c, d, e, f } = matrix;
        const right = sourceBounds.left + sourceBounds.width;
        const bottom = sourceBounds.top + sourceBounds.height;
        const maxX = Math.max(
            a * sourceBounds.left + c * sourceBounds.top + e,
            a * right + c * sourceBounds.top + e,
            a * right + c * bottom + e,
            a * sourceBounds.left + c * bottom + e
        );
        const displacement = Math.max(SHADOW_MASK_OFFSET, maxX + margin * space.scale + 2);
        if (shadow.inset) {
            createCanvasPath(ctx, calculatePaddingBoxPath(paint.curves));
            ctx.clip();
        } else {
            complement(ctx, viewport, calculateBorderBoxPath(paint.curves));
            ctx.clip('evenodd');
        }
        // Current paths retain their device coordinates across transform changes.
        // setTransform with an approximate matrix would discard CSS transforms
        // on the real CTM, so the legacy path translates relative to it instead.
        if (knownTransform) ctx.setTransform(a, b, c, d, e - displacement, f);
        else ctx.translate(-displacement / a, 0);
        if (shadow.inset) complement(ctx, sourceBounds, insetHole(paint, shadow));
        else createCanvasPath(ctx, spreadShadowPath(calculateBorderBoxPath(paint.curves), spread));
        if (knownTransform) ctx.setTransform(a, b, c, d, e, f);
        else ctx.translate(displacement / a, 0);
        ctx.shadowOffsetX = displacement + a * shadow.offsetX.number + c * shadow.offsetY.number;
        ctx.shadowOffsetY = b * shadow.offsetX.number + d * shadow.offsetY.number;
        // Allocation/filter-failure fallback remains bounded-memory. Its blur is
        // isotropic under nonuniform transforms, but positioning stays correct.
        ctx.shadowBlur = shadow.blur.number * space.scale;
        ctx.shadowColor = asString(shadow.color);
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fill(shadow.inset ? 'evenodd' : 'nonzero');
    } finally {
        ctx.restore();
    }
};
