/**
 * Background Renderer
 *
 * Handles rendering of element backgrounds including:
 * - Background colors
 * - Background images (URL)
 * - Linear gradients
 * - Radial gradients
 * - Background patterns and repeats
 */

import { Context } from '../../core/context';
import { at } from '../../core/util';
import { ElementContainer } from '../../dom/element-container';
import { Path } from '../path';
import {
    CSSImageType,
    CSSConicGradientImage,
    CSSLinearGradientImage,
    CSSRadialGradientImage,
    CSSURLImage,
    isConicGradient,
    isLinearGradient,
    isRadialGradient,
    isRepeatingConicGradient,
    isRepeatingLinearGradient,
    isRepeatingRadialGradient
} from '../../css/types/image';
import { calculateBackgroundRendering, getBackgroundValueForIndex } from '../background';
import { calculateGradientDirection, calculateRadius, processColorStops } from '../../css/types/functions/gradient';
import { FIFTY_PERCENT, getAbsoluteValue } from '../../css/types/length-percentage';
import { asString } from '../../css/types/color-utilities';
import { IMAGE_RENDERING } from '../../css/property-descriptors/image-rendering';
import { BACKGROUND_REPEAT } from '../../css/property-descriptors/background-repeat';
import { createCanvasPath } from './canvas-path';
import { LRUMap } from '../../core/lru-map';

/**
 * Dependencies required for BackgroundRenderer
 */
export interface BackgroundRendererDependencies {
    ctx: CanvasRenderingContext2D;
    context: Context;
    canvas: HTMLCanvasElement;
    options: {
        width: number;
        height: number;
        scale: number;
    };
}

/**
 * Background Renderer
 *
 * Specialized renderer for element backgrounds.
 * Extracted from CanvasRenderer to improve code organization and maintainability.
 */
export class BackgroundRenderer {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly context: Context;
    private readonly canvas: HTMLCanvasElement;

    /**
     * Instance-level LRU cache for background-image patterns.
     * CanvasPatterns are tied to the rendering context and must not be
     * shared across different render passes. This cache lives for the
     * duration of one html2canvas() call.
     */
    private readonly patternCache = new LRUMap<string, CanvasPattern>(50);

    constructor(deps: BackgroundRendererDependencies) {
        this.ctx = deps.ctx;
        this.context = deps.context;
        this.canvas = deps.canvas;
    }

    /**
     * Render background images for a container
     * Supports URL images, linear gradients, and radial gradients
     *
     * @param container - Element container with background styles
     */
    async renderBackgroundImage(container: ElementContainer): Promise<void> {
        let index = container.styles.backgroundImage.length - 1;
        const blendModes = container.styles.backgroundBlendMode;
        let layerCount = 0;

        for (const backgroundImage of container.styles.backgroundImage.slice(0).reverse()) {
            // Save context and apply blend mode for non-first layers
            if (layerCount > 0) {
                const blendMode = blendModes[layerCount] ?? blendModes[0] ?? 'normal';
                if (blendMode !== 'normal') {
                    this.ctx.save();
                    this.ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
                }
            }

            if (backgroundImage.type === CSSImageType.URL) {
                await this.renderBackgroundURLImage(container, backgroundImage as CSSURLImage, index);
            } else if (isLinearGradient(backgroundImage)) {
                this.renderLinearGradient(container, backgroundImage, index);
            } else if (isRepeatingLinearGradient(backgroundImage)) {
                this.renderRepeatingLinearGradient(container, backgroundImage, index);
            } else if (isRadialGradient(backgroundImage)) {
                this.renderRadialGradient(container, backgroundImage, index);
            } else if (isRepeatingRadialGradient(backgroundImage)) {
                this.renderRepeatingRadialGradient(container, backgroundImage, index);
            } else if (isConicGradient(backgroundImage)) {
                this.renderConicGradient(container, backgroundImage, index);
            } else if (isRepeatingConicGradient(backgroundImage)) {
                this.renderRepeatingConicGradient(container, backgroundImage, index);
            }

            if (layerCount > 0) {
                const blendMode = blendModes[layerCount] ?? blendModes[0] ?? 'normal';
                if (blendMode !== 'normal') {
                    this.ctx.restore();
                }
            }

            index--;
            layerCount++;
        }
    }

    /**
     * Render a URL-based background image
     */
    private async renderBackgroundURLImage(
        container: ElementContainer,
        backgroundImage: CSSURLImage,
        index: number
    ): Promise<void> {
        let image;
        const url = backgroundImage.url;
        try {
            image = await this.context.cache.match(url);
        } catch (e) {
            this.context.logger.error(`Error loading background-image ${url}`);
            this.context.onError?.(e instanceof Error ? e : new Error(String(e)));
        }

        if (image) {
            const imageWidth = isNaN(image.width) || image.width === 0 ? 1 : image.width;
            const imageHeight = isNaN(image.height) || image.height === 0 ? 1 : image.height;
            const [path, x, y, width, height] = calculateBackgroundRendering(container, index, [
                imageWidth,
                imageHeight,
                imageWidth / imageHeight
            ]);

            // Determine repetition mode based on CSS background-repeat
            const repeat = getBackgroundValueForIndex(container.styles.backgroundRepeat, index);
            const repeatMode =
                repeat === BACKGROUND_REPEAT.NO_REPEAT
                    ? 'no-repeat'
                    : repeat === BACKGROUND_REPEAT.REPEAT_X
                      ? 'repeat-x'
                      : repeat === BACKGROUND_REPEAT.REPEAT_Y
                        ? 'repeat-y'
                        : 'repeat';

            // Cache key: URL + resized dimensions + imageRendering + repeat mode (pattern is dependent on all four)
            const cacheKey = `${url}|${Math.round(width)}x${Math.round(height)}|${container.styles.imageRendering}|${repeatMode}`;
            let pattern = this.patternCache.get(cacheKey);

            if (!pattern) {
                const resized = this.resizeImage(
                    image as HTMLImageElement,
                    width,
                    height,
                    container.styles.imageRendering
                );
                pattern = this.ctx.createPattern(resized, repeatMode) as CanvasPattern;

                this.patternCache.set(cacheKey, pattern);
            }

            this.renderRepeat(path, pattern, x, y);
        }
    }

    /**
     * Render a repeating linear gradient background.
     * Renders one cycle of the gradient to a pattern canvas, then fills
     * the background area using createPattern('repeat').
     */
    private renderRepeatingLinearGradient(
        container: ElementContainer,
        backgroundImage: CSSLinearGradientImage,
        index: number
    ): void {
        const [path, x, y, width, height] = calculateBackgroundRendering(container, index, [null, null, null]);
        const [lineLength, lx0, lx1, ly0, ly1] = calculateGradientDirection(backgroundImage.angle, width, height);
        // calculateGradientDirection returns endpoints in background-area
        // local coordinates; the fill happens on a context already translated
        // to page coordinates, so shift the gradient line by the area origin.
        const gx0 = x + lx0;
        const gx1 = x + lx1;
        const gy0 = y + ly0;
        const gy1 = y + ly1;

        // Draw the stripes directly on the gradient line: the one-cycle stop
        // list is stacked k·period + s for k = 0..cycles-1 (clamped to [0,1]
        // of the line), exactly like the repeating radial renderer. This
        // avoids pattern tiling, whose tile must be an integer translation
        // period of the stripe phase along both axes — impossible for most
        // angled gradients (a 45° stripe needs irrational tile sizes), which
        // made every tile seam drift and the stripes alias.
        const processedStops = processColorStops(backgroundImage.stops, lineLength || 1);
        const lastStop = at(processedStops, processedStops.length - 1);
        const firstStop = at(processedStops, 0);
        const period = Math.max(lastStop.stop - firstStop.stop, 0.01);

        // A degenerate period (all stops clamped to one point) repeats
        // nothing — CSS renders the last colour across the whole area.
        if (lastStop.stop - firstStop.stop < 1e-6) {
            const gradient = this.ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            gradient.addColorStop(0, asString(lastStop.color));
            gradient.addColorStop(1, asString(lastStop.color));
            this.path(path);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            return;
        }

        const stops: Array<{ stop: number; color: string }> = [];
        const cycles = Math.ceil(1 / period);
        for (let k = 0; k < cycles; k++) {
            for (const s of processedStops) {
                const stop = k * period + (s.stop - firstStop.stop);
                if (stop > 1) break;
                stops.push({ stop, color: asString(s.color) });
            }
        }
        // Continue with the last colour out to the ending shape.
        stops.push({ stop: 1, color: asString(lastStop.color) });

        const gradient = this.ctx.createLinearGradient(gx0, gy0, gx1, gy1);
        stops.forEach((s) => gradient.addColorStop(Math.min(1, Math.max(0, s.stop)), s.color));

        this.path(path);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    /**
     * Render a linear gradient background
     */
    private renderLinearGradient(
        container: ElementContainer,
        backgroundImage: CSSLinearGradientImage,
        index: number
    ): void {
        const [path, x, y, width, height] = calculateBackgroundRendering(container, index, [null, null, null]);
        const [lineLength, x0, x1, y0, y1] = calculateGradientDirection(backgroundImage.angle, width, height);

        // Cache key: angle + dimensions + serialised colour stops
        const cacheKey = `lg|${backgroundImage.angle}|${Math.round(width)}x${Math.round(height)}|${JSON.stringify(backgroundImage.stops)}`;

        let pattern = this.patternCache.get(cacheKey);
        if (!pattern) {
            const ownerDocument = this.canvas.ownerDocument ?? document;
            const canvas = ownerDocument.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return;
            }
            const gradient = ctx.createLinearGradient(x0, y0, x1, y1);

            processColorStops(backgroundImage.stops, lineLength || 1).forEach((colorStop) =>
                gradient.addColorStop(colorStop.stop, asString(colorStop.color))
            );

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            if (width > 0 && height > 0) {
                pattern = this.ctx.createPattern(canvas, 'repeat') as CanvasPattern;
                this.patternCache.set(cacheKey, pattern);
            }
        }

        if (pattern) {
            this.renderRepeat(path, pattern, x, y);
        }
    }

    /**
     * Render a radial gradient background
     */
    private renderRadialGradient(
        container: ElementContainer,
        backgroundImage: CSSRadialGradientImage,
        index: number
    ): void {
        const [path, left, top, width, height] = calculateBackgroundRendering(container, index, [null, null, null]);
        const position = backgroundImage.position.length === 0 ? [FIFTY_PERCENT] : backgroundImage.position;
        const x = getAbsoluteValue(at(position, 0), width);
        const y = getAbsoluteValue(at(position, position.length - 1), height);

        let [rx, ry] = calculateRadius(backgroundImage, x, y, width, height);
        // Handle edge case where radial gradient size is 0
        // Use a minimum value of 0.01 to ensure gradient is still rendered
        if (rx === 0 || ry === 0) {
            rx = Math.max(rx, 0.01);
            ry = Math.max(ry, 0.01);
        }
        if (rx > 0 && ry > 0) {
            // Cache key for radial gradient: position + radii + colour stops
            const cacheKey = `rg|${Math.round(x)}x${Math.round(y)}|${Math.round(rx)}x${Math.round(ry)}|${JSON.stringify(backgroundImage.stops)}`;

            // The ellipse is rasterised as a circle of radius rx that is scaled vertically by
            // ry / rx, so the offscreen canvas must be the ellipse's full bounding box
            // (2rx × 2ry). Sizing it as a max(rx, ry) square stretched the gradient past the
            // canvas edge whenever ry > rx, clipping the ellipse before its last stop and
            // leaving a hard horizontal seam on tall elements.
            // The stop line length is rx (the canvas gradient radius), NOT the
            // diameter: absolute-px stops like `#ff6b6b 0 14px` must land at
            // 14px from the centre. Normalising against the diameter halved
            // every absolute-px stop.
            const stops = processColorStops(backgroundImage.stops, rx);
            const lastStop = stops[stops.length - 1];

            let pattern = this.patternCache.get(cacheKey);
            if (!pattern) {
                const ownerDocument = this.canvas.ownerDocument ?? document;
                const offscreen = ownerDocument.createElement('canvas');
                offscreen.width = Math.ceil(rx * 2);
                offscreen.height = Math.ceil(ry * 2);
                const offCtx = offscreen.getContext('2d');
                if (offCtx) {
                    const gradient = offCtx.createRadialGradient(rx, rx, 0, rx, rx, rx);
                    stops.forEach((s) => gradient.addColorStop(s.stop, asString(s.color)));
                    offCtx.fillStyle = gradient;
                    if (rx !== ry) offCtx.scale(1, ry / rx);
                    offCtx.fillRect(0, 0, rx * 2, rx * 2);
                    pattern = this.ctx.createPattern(offscreen, 'no-repeat') as CanvasPattern;
                    this.patternCache.set(cacheKey, pattern);
                }
            }

            if (pattern) {
                this.path(path);
                this.ctx.save();
                this.ctx.clip();
                // Outside the ending shape a radial gradient continues with its last colour
                // stop, so paint that first and lay the ellipse pattern on top.
                if (lastStop) {
                    this.ctx.fillStyle = asString(lastStop.color);
                    this.ctx.fill();
                }
                this.ctx.translate(left + x - rx, top + y - ry);
                this.ctx.fillStyle = pattern;
                this.ctx.fillRect(0, 0, rx * 2, ry * 2);
                this.ctx.restore();
            }
        }
    }

    /**
     * Render a repeating radial gradient.
     *
     * Canvas radial gradients have no native repeat mode, so the stop list is
     * stacked: with period p (the last stop position) the stops are re-added
     * k*p + s for k = 0..ceil(radius / p) - 1, clipped to the [0, 1] gradient
     * range. The full repeating gradient is then rasterised with the same
     * ellipse pattern trick as the plain radial renderer.
     */
    private renderRepeatingRadialGradient(
        container: ElementContainer,
        backgroundImage: CSSRadialGradientImage,
        index: number
    ): void {
        const [path, left, top, width, height] = calculateBackgroundRendering(container, index, [null, null, null]);
        const position = backgroundImage.position.length === 0 ? [FIFTY_PERCENT] : backgroundImage.position;
        const x = getAbsoluteValue(at(position, 0), width);
        const y = getAbsoluteValue(at(position, position.length - 1), height);

        let [rx, ry] = calculateRadius(backgroundImage, x, y, width, height);
        if (rx === 0 || ry === 0) {
            rx = Math.max(rx, 0.01);
            ry = Math.max(ry, 0.01);
        }
        if (!(rx > 0 && ry > 0)) {
            return;
        }

        // processColorStops normalises against rx (the canvas gradient
        // radius), so a normalised stop maps 1:1 onto canvas gradient stops.
        const processed = processColorStops(backgroundImage.stops, rx);
        const firstStop = at(processed, 0);
        const lastStop = at(processed, processed.length - 1);
        const period = Math.max(lastStop.stop - firstStop.stop, 0.01);

        const stops: Array<{ stop: number; color: string }> = [];
        const rings = Math.ceil(1 / period);
        for (let k = 0; k < rings; k++) {
            for (const s of processed) {
                const stop = k * period + (s.stop - firstStop.stop);
                if (stop > 1) break;
                stops.push({ stop, color: asString(s.color) });
            }
        }
        // Continue with the last colour out to the ending shape.
        stops.push({ stop: 1, color: asString(lastStop.color) });

        const cacheKey = `rrg|${Math.round(x)}x${Math.round(y)}|${Math.round(rx)}x${Math.round(ry)}|${stops.length}|${JSON.stringify(backgroundImage.stops)}`;
        let pattern = this.patternCache.get(cacheKey);
        if (!pattern) {
            const ownerDocument = this.canvas.ownerDocument ?? document;
            const offscreen = ownerDocument.createElement('canvas');
            offscreen.width = Math.ceil(rx * 2);
            offscreen.height = Math.ceil(ry * 2);
            const offCtx = offscreen.getContext('2d');
            if (offCtx) {
                const gradient = offCtx.createRadialGradient(rx, rx, 0, rx, rx, rx);
                stops.forEach((s) => gradient.addColorStop(s.stop, s.color));
                offCtx.fillStyle = gradient;
                if (rx !== ry) offCtx.scale(1, ry / rx);
                offCtx.fillRect(0, 0, rx * 2, ry * 2);
                pattern = this.ctx.createPattern(offscreen, 'no-repeat') as CanvasPattern;
                this.patternCache.set(cacheKey, pattern);
            }
        }

        if (pattern) {
            this.path(path);
            this.ctx.save();
            this.ctx.clip();
            this.ctx.translate(left + x - rx, top + y - ry);
            this.ctx.fillStyle = pattern;
            this.ctx.fillRect(0, 0, rx * 2, ry * 2);
            this.ctx.restore();
        }
    }

    /**
     * Render a conic gradient.
     *
     * Color stops are angular: percentages of the full 360° sweep, normalised
     * by processing against a line length of 1. Canvas createConicGradient
     * measures its start angle in the same clockwise-from-12-o'clock space as
     * CSS `from <angle>`.
     */
    private renderConicGradient(
        container: ElementContainer,
        backgroundImage: CSSConicGradientImage,
        index: number
    ): void {
        const [path, left, top, width, height] = calculateBackgroundRendering(container, index, [null, null, null]);
        const position = backgroundImage.position.length === 0 ? [FIFTY_PERCENT] : backgroundImage.position;
        const cx = left + getAbsoluteValue(at(position, 0), width);
        const cy = top + getAbsoluteValue(at(position, position.length - 1), height);

        // Canvas conic gradients start at 3 o'clock; CSS `from 0deg` starts at
        // 12 o'clock (verified against Chrome), so shift by -90°.
        const gradient = this.ctx.createConicGradient(backgroundImage.angle - Math.PI / 2, cx, cy);
        // Stops arrive normalised to [0, 1]; regions beyond the last stop pad
        // with its colour, matching canvas gradient semantics.
        const stops = processColorStops(backgroundImage.stops, 1);
        stops.forEach((s) => {
            gradient.addColorStop(Math.min(1, Math.max(0, s.stop)), asString(s.color));
        });

        this.path(path);
        this.ctx.save();
        this.ctx.clip();
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        this.ctx.restore();
    }

    /**
     * Render a repeating conic gradient background.
     *
     * Canvas conic gradient stops span the full 2π sweep as [0, 1], so the
     * one-cycle stop list is stacked k·period + s for k = 0..cycles-1 over the
     * whole sweep — the same periodic-stop stacking the repeating linear and
     * radial renderers use along their gradient lines.
     */
    private renderRepeatingConicGradient(
        container: ElementContainer,
        backgroundImage: CSSConicGradientImage,
        index: number
    ): void {
        const [path, left, top, width, height] = calculateBackgroundRendering(container, index, [null, null, null]);
        const position = backgroundImage.position.length === 0 ? [FIFTY_PERCENT] : backgroundImage.position;
        const cx = left + getAbsoluteValue(at(position, 0), width);
        const cy = top + getAbsoluteValue(at(position, position.length - 1), height);

        const processedStops = processColorStops(backgroundImage.stops, 1);
        const firstStop = at(processedStops, 0);
        const lastStop = at(processedStops, processedStops.length - 1);
        const period = Math.max(lastStop.stop - firstStop.stop, 0.01);

        // A degenerate period (all stops clamped to one point) repeats
        // nothing — CSS renders the last colour across the whole area.
        if (lastStop.stop - firstStop.stop < 1e-6) {
            const gradient = this.ctx.createConicGradient(backgroundImage.angle - Math.PI / 2, cx, cy);
            gradient.addColorStop(0, asString(lastStop.color));
            gradient.addColorStop(1, asString(lastStop.color));
            this.path(path);
            this.ctx.save();
            this.ctx.clip();
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            this.ctx.restore();
            return;
        }

        const stops: Array<{ stop: number; color: string }> = [];
        const cycles = Math.ceil(1 / period);
        for (let k = 0; k < cycles; k++) {
            for (const s of processedStops) {
                const stop = k * period + (s.stop - firstStop.stop);
                if (stop > 1) break;
                stops.push({ stop, color: asString(s.color) });
            }
        }
        // The band covering the sweep end extends flat to 1 (its next stop is
        // beyond the sweep), so pad with that band's colour, matching CSS
        // repeating behaviour at the sweep boundary.
        const lastIncluded = at(stops, stops.length - 1);
        if (lastIncluded && lastIncluded.stop < 1) {
            stops.push({ stop: 1, color: lastIncluded.color });
        }

        // Canvas conic gradients start at 3 o'clock; CSS `from 0deg` starts at
        // 12 o'clock (verified against Chrome), so shift by -90°.
        const gradient = this.ctx.createConicGradient(backgroundImage.angle - Math.PI / 2, cx, cy);
        stops.forEach((s) => {
            gradient.addColorStop(Math.min(1, Math.max(0, s.stop)), s.color);
        });

        this.path(path);
        this.ctx.save();
        this.ctx.clip();
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        this.ctx.restore();
    }

    /**
     * Render a repeating pattern with offset
     *
     * @param path - Path to fill
     * @param pattern - Canvas pattern or gradient
     * @param offsetX - X offset for pattern
     * @param offsetY - Y offset for pattern
     */
    private renderRepeat(
        path: Path[],
        pattern: CanvasPattern | CanvasGradient,
        offsetX: number,
        offsetY: number
    ): void {
        this.path(path);
        this.ctx.fillStyle = pattern;
        this.ctx.translate(offsetX, offsetY);
        this.ctx.fill();
        this.ctx.translate(-offsetX, -offsetY);
    }

    /**
     * Resize an image to target dimensions
     *
     * @param image - Source image
     * @param width - Target width
     * @param height - Target height
     * @param imageRendering - CSS image-rendering property value
     * @returns Resized canvas or original image
     */
    private resizeImage(
        image: HTMLImageElement,
        width: number,
        height: number,
        imageRendering: IMAGE_RENDERING
    ): HTMLCanvasElement | HTMLImageElement {
        // NOTE: Early-return optimisation disabled per upstream investigation
        // (https://github.com/niklasvh/html2canvas/pull/2911).
        // Returning the original image when dimensions match caused subtle
        // rendering issues — a resized copy through a fresh offscreen canvas
        // is always safer, even when width/height are unchanged.

        const ownerDocument = this.canvas.ownerDocument ?? document;
        const canvas = ownerDocument.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return image;
        }

        // Apply image smoothing based on CSS image-rendering property
        if (imageRendering === IMAGE_RENDERING.PIXELATED || imageRendering === IMAGE_RENDERING.CRISP_EDGES) {
            this.context.logger.debug(`Disabling image smoothing for background image due to CSS image-rendering`);
            ctx.imageSmoothingEnabled = false;
        } else if (imageRendering === IMAGE_RENDERING.SMOOTH) {
            this.context.logger.debug(
                `Enabling image smoothing for background image due to CSS image-rendering: smooth`
            );
            ctx.imageSmoothingEnabled = true;
        } else {
            // AUTO: inherit from main renderer context
            ctx.imageSmoothingEnabled = this.ctx.imageSmoothingEnabled;
        }

        // Inherit quality setting
        if (this.ctx.imageSmoothingQuality) {
            ctx.imageSmoothingQuality = this.ctx.imageSmoothingQuality;
        }

        ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height);
        return canvas;
    }

    /**
     * Create a canvas path from path array
     *
     * @param paths - Array of path points
     */
    private path(paths: Path[]): void {
        createCanvasPath(this.ctx, paths);
    }
}
