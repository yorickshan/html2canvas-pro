/**
 * Mask Renderer
 *
 * Paints CSS mask-image layers into a mask surface (alpha mask) which the
 * caller composites onto the element surface via `destination-in`.
 *
 * Value grammars are shared with background-image (position/size/repeat), so
 * the layer maths mirrors the background renderer but works in the local
 * coordinate space of the mask positioning area (default: border box) and
 * always fills the whole area — a mask surface is about alpha coverage, not
 * about what is visible underneath.
 *
 * Gradient layers share the rasterisation primitives of the background
 * renderer (gradient-rasterizer.ts): repeating gradients stack their stop
 * cycles, and the area beyond a radial gradient's ending shape keeps the
 * last stop's colour. Limitations (v1): mask-mode is alpha-only; layers
 * composite with source-over (≈ the spec-default `add`).
 */

import {
    CSSConicGradientImage,
    CSSImageType,
    CSSLinearGradientImage,
    CSSRadialGradientImage,
    CSSURLImage,
    ICSSImage,
    isRadialGradient,
    isRepeatingRadialGradient
} from '../../css/types/image';
import { calculateGradientDirection, calculateRadius, processColorStops } from '../../css/types/functions/gradient';
import {
    FIFTY_PERCENT,
    getAbsoluteValue,
    isLengthPercentage,
    LengthPercentage
} from '../../css/types/length-percentage';
import { isIdentToken } from '../../css/syntax/parser';
import { BACKGROUND_REPEAT } from '../../css/property-descriptors/background-repeat';
import { BACKGROUND_SIZE, BackgroundSizeInfo } from '../../css/property-descriptors/background-size';
import { asString } from '../../css/types/color-utilities';
import { at } from '../../core/util';
import { rasterizeRadialGradient, stackRepeatingStops, toCanvasStops } from './gradient-rasterizer';

/**
 * CSS layer lists cycle: a single mask-size applies to every mask-image
 * layer, so index access must wrap instead of throwing.
 */
const valueForIndex = <T>(values: T[], index: number): T | undefined =>
    values.length === 0 ? undefined : (values[index % values.length] ?? values[0]);

export interface MaskLayerStyles {
    maskPosition: LengthPercentage[][];
    maskRepeat: BACKGROUND_REPEAT[];
    maskSize: BackgroundSizeInfo[][];
}

export interface MaskArea {
    left: number;
    top: number;
    width: number;
    height: number;
}

export type MaskImageSource = HTMLImageElement | HTMLCanvasElement;

/**
 * Resolve one mask-size declaration to concrete pixel width/height.
 * `auto` keeps the image's intrinsic ratio; gradients default to 100%.
 */
const resolveLayerSize = (
    size: BackgroundSizeInfo[] | undefined,
    area: MaskArea,
    naturalWidth: number,
    naturalHeight: number
): { width: number; height: number } => {
    const first = size ? size[0] : undefined;
    const second = size && size.length > 1 ? at(size, 1) : undefined;

    const keyword = (value: BackgroundSizeInfo | undefined): string | null =>
        value !== undefined && isIdentToken(value) ? value.value : null;

    const resolve = (value: BackgroundSizeInfo | undefined, extent: number, natural: number): number | null => {
        if (value === undefined || isIdentToken(value)) return null; // auto keywords keep the ratio
        if (isLengthPercentage(value)) return getAbsoluteValue(value, extent);
        return natural;
    };

    const firstKeyword = keyword(first);
    if (firstKeyword === BACKGROUND_SIZE.CONTAIN || firstKeyword === BACKGROUND_SIZE.COVER) {
        const scale =
            firstKeyword === BACKGROUND_SIZE.CONTAIN
                ? Math.min(area.width / naturalWidth, area.height / naturalHeight)
                : Math.max(area.width / naturalWidth, area.height / naturalHeight);
        return { width: naturalWidth * scale, height: naturalHeight * scale };
    }

    let width = resolve(first, area.width, naturalWidth);
    let height = resolve(second, area.height, naturalHeight);
    if (width === null && height === null) {
        // auto auto (or no declaration): the image's intrinsic size.
        width = naturalWidth;
        height = naturalHeight;
    } else if (width === null) {
        width = (naturalWidth / naturalHeight) * (height as number);
    } else if (height === null) {
        height = (naturalHeight / naturalWidth) * width;
    }
    return { width: width as number, height: height as number };
};

/** Draw one URL layer with mask-repeat tiling. */
const paintUrlLayer = (
    ctx: CanvasRenderingContext2D,
    image: MaskImageSource,
    styles: MaskLayerStyles,
    index: number,
    area: MaskArea
): void => {
    const naturalWidth = (image as HTMLImageElement).naturalWidth || image.width || area.width;
    const naturalHeight = (image as HTMLImageElement).naturalHeight || image.height || area.height;
    const { width: drawWidth, height: drawHeight } = resolveLayerSize(
        valueForIndex(styles.maskSize, index),
        area,
        naturalWidth,
        naturalHeight
    );

    // The first tile is placed by mask-position (percentages resolve against
    // the leftover space, matching background-position).
    const position = valueForIndex(styles.maskPosition, index) ?? [];
    const offsetX = area.left + getAbsoluteValue(at(position, 0), area.width - drawWidth);
    const offsetY = area.top + getAbsoluteValue(at(position, position.length - 1), area.height - drawHeight);

    const repeat = valueForIndex(styles.maskRepeat, index) ?? BACKGROUND_REPEAT.REPEAT;
    const repeatsX = repeat === BACKGROUND_REPEAT.REPEAT || repeat === BACKGROUND_REPEAT.REPEAT_X;
    const repeatsY = repeat === BACKGROUND_REPEAT.REPEAT || repeat === BACKGROUND_REPEAT.REPEAT_Y;
    const tilesBeforeX = repeatsX ? Math.ceil((offsetX - area.left) / drawWidth) : 0;
    const tilesBeforeY = repeatsY ? Math.ceil((offsetY - area.top) / drawHeight) : 0;
    const tilesAfterX = repeatsX ? Math.ceil((area.left + area.width - offsetX) / drawWidth) : 0;
    const tilesAfterY = repeatsY ? Math.ceil((area.top + area.height - offsetY) / drawHeight) : 0;

    for (let ty = -tilesBeforeY; ty <= tilesAfterY; ty++) {
        for (let tx = -tilesBeforeX; tx <= tilesAfterX; tx++) {
            ctx.drawImage(image, offsetX + tx * drawWidth, offsetY + ty * drawHeight, drawWidth, drawHeight);
        }
    }
};

/** Draw one radial-gradient layer (ellipse rasterised via the scaled-circle trick). */
const paintRadialLayer = (ctx: CanvasRenderingContext2D, layer: CSSRadialGradientImage, area: MaskArea): void => {
    const { width, height } = area;
    const position = layer.position.length === 0 ? [FIFTY_PERCENT] : layer.position;
    const cx = getAbsoluteValue(at(position, 0), width);
    const cy = getAbsoluteValue(at(position, position.length - 1), height);
    let [rx, ry] = calculateRadius(layer, cx, cy, width, height);
    rx = Math.max(rx, 0.01);
    ry = Math.max(ry, 0.01);

    const ownerDocument = ctx.canvas.ownerDocument ?? document;
    // Shared ellipse rasteriser keeps the stop line length (rx), the
    // pre-scale fill coverage and the repeating stop stacking in one place.
    const rasterized = rasterizeRadialGradient(ownerDocument, rx, ry, layer.stops, isRepeatingRadialGradient(layer));
    if (!rasterized) {
        return;
    }
    // Outside the ending shape the gradient continues with its last colour —
    // for a mask that means the whole positioning area keeps that alpha, not
    // just the ellipse's bounding box.
    ctx.fillStyle = rasterized.lastColor;
    ctx.fillRect(area.left, area.top, area.width, area.height);
    ctx.drawImage(rasterized.canvas, area.left + cx - rx, area.top + cy - ry, rx * 2, ry * 2);
};

/** Draw one gradient layer filling the whole mask area. */
const paintGradientLayer = (ctx: CanvasRenderingContext2D, layer: ICSSImage, area: MaskArea): void => {
    const { width, height } = area;
    if (width <= 0 || height <= 0) return;

    if (isRadialGradient(layer) || isRepeatingRadialGradient(layer)) {
        paintRadialLayer(ctx, layer as CSSRadialGradientImage, area);
        return;
    }

    let gradient: CanvasGradient | null = null;
    if (layer.type === CSSImageType.LINEAR_GRADIENT || layer.type === CSSImageType.REPEATING_LINEAR_GRADIENT) {
        const linear = layer as CSSLinearGradientImage;
        // calculateGradientDirection returns [lineLength, x0, x1, y0, y1] in
        // area-local coordinates; the gradient line must be offset into the
        // same page-coordinate space the fillRect below uses.
        const [lineLength, lx0, lx1, ly0, ly1] = calculateGradientDirection(linear.angle || 0, width, height);
        const processed = processColorStops(linear.stops, lineLength || 1);
        if (layer.type === CSSImageType.REPEATING_LINEAR_GRADIENT) {
            const stacked = stackRepeatingStops(processed);
            if (!stacked) {
                // Degenerate period: the last colour covers the whole area.
                ctx.fillStyle = asString(at(processed, processed.length - 1).color);
                ctx.fillRect(area.left, area.top, width, height);
                return;
            }
            gradient = ctx.createLinearGradient(area.left + lx0, area.top + ly0, area.left + lx1, area.top + ly1);
            stacked.forEach((s) => gradient!.addColorStop(Math.min(1, Math.max(0, s.stop)), s.color));
        } else {
            gradient = ctx.createLinearGradient(area.left + lx0, area.top + ly0, area.left + lx1, area.top + ly1);
            toCanvasStops(processed).forEach((s) => gradient!.addColorStop(s.stop, s.color));
        }
    } else if (layer.type === CSSImageType.CONIC_GRADIENT || layer.type === CSSImageType.REPEATING_CONIC_GRADIENT) {
        const conic = layer as CSSConicGradientImage;
        const processed = processColorStops(conic.stops, 1);
        const repeating = layer.type === CSSImageType.REPEATING_CONIC_GRADIENT;
        if (repeating && !stackRepeatingStops(processed)) {
            // Degenerate period: the last colour covers the whole area.
            ctx.fillStyle = asString(at(processed, processed.length - 1).color);
            ctx.fillRect(area.left, area.top, width, height);
            return;
        }
        // Canvas conic starts at 3 o'clock, CSS `from 0deg` at 12 o'clock.
        gradient = ctx.createConicGradient(conic.angle - Math.PI / 2, area.left + width / 2, area.top + height / 2);
        const stops = (repeating ? stackRepeatingStops(processed) : null) ?? toCanvasStops(processed);
        stops.forEach((s) => gradient!.addColorStop(Math.min(1, Math.max(0, s.stop)), s.color));
    }

    if (gradient) {
        ctx.fillStyle = gradient;
        ctx.fillRect(area.left, area.top, width, height);
    }
};

/**
 * Paint every mask layer into `ctx` (expected to already be scaled to device
 * pixels and translated so the page origin maps correctly).
 */
export const paintMaskLayers = async (
    ctx: CanvasRenderingContext2D,
    layers: ICSSImage[],
    styles: MaskLayerStyles,
    area: MaskArea,
    matchImage: (url: string) => Promise<MaskImageSource | undefined>
): Promise<void> => {
    // First layer is the topmost; paint order is irrelevant for an additive
    // alpha mask, but keep spec order (first = top).
    for (let i = 0; i < layers.length; i++) {
        const layer = at(layers, i);
        if (layer.type === CSSImageType.URL) {
            const image = await matchImage((layer as CSSURLImage).url);
            if (image) {
                paintUrlLayer(ctx, image, styles, i, area);
            }
        } else {
            paintGradientLayer(ctx, layer, area);
        }
    }
};
