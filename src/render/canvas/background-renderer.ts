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
import { ElementContainer } from '../../dom/element-container';
import { Path } from '../path';
import {
    CSSImageType,
    CSSLinearGradientImage,
    CSSRadialGradientImage,
    CSSURLImage,
    isLinearGradient,
    isRadialGradient,
    isRepeatingLinearGradient
} from '../../css/types/image';
import { calculateBackgroundRendering } from '../background';
import { calculateGradientDirection, calculateRadius, processColorStops } from '../../css/types/functions/gradient';
import { FIFTY_PERCENT, getAbsoluteValue } from '../../css/types/length-percentage';
import { asString } from '../../css/types/color-utilities';
import { IMAGE_RENDERING } from '../../css/property-descriptors/image-rendering';
import { createCanvasPath } from './canvas-path';

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
     *
     * Also reused for linear-gradient and repeating-linear-gradient
     * pattern canvases to avoid redundant offscreen canvas allocation.
     */
    private readonly patternCache = new Map<string, CanvasPattern>();
    private static readonly PATTERN_CACHE_MAX = 50;

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
        }

        if (image) {
            const imageWidth = isNaN(image.width) || image.width === 0 ? 1 : image.width;
            const imageHeight = isNaN(image.height) || image.height === 0 ? 1 : image.height;
            const [path, x, y, width, height] = calculateBackgroundRendering(container, index, [
                imageWidth,
                imageHeight,
                imageWidth / imageHeight
            ]);

            // Cache key: URL + resized dimensions + imageRendering (pattern is dependent on all three)
            const cacheKey = `${url}|${Math.round(width)}x${Math.round(height)}|${container.styles.imageRendering}`;
            let pattern = this.lruGet(this.patternCache, cacheKey);

            if (!pattern) {
                const resized = this.resizeImage(
                    image as HTMLImageElement,
                    width,
                    height,
                    container.styles.imageRendering
                );
                pattern = this.ctx.createPattern(resized, 'repeat') as CanvasPattern;

                // LRU eviction
                if (this.patternCache.size >= BackgroundRenderer.PATTERN_CACHE_MAX) {
                    const oldestKey = this.patternCache.keys().next().value;
                    this.patternCache.delete(oldestKey);
                }
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
        const [lineLength, x0, x1, y0, y1] = calculateGradientDirection(backgroundImage.angle, width, height);

        // Determine the repeating pattern length from color stops
        const processedStops = processColorStops(backgroundImage.stops, lineLength || 1);
        const lastStop = processedStops[processedStops.length - 1];
        const firstStop = processedStops[0];
        const patternLength = lastStop.stop - firstStop.stop;

        if (patternLength <= 0) {
            // Fallback: render as normal linear gradient
            this.renderLinearGradient(container, backgroundImage, index);
            return;
        }

        // Scale direction vectors to match the pattern length
        const dirX = x1 - x0;
        const dirY = y1 - y0;
        const totalLength = Math.sqrt(dirX * dirX + dirY * dirY);
        const scale = patternLength / (totalLength || 1);
        const pX0 = x0;
        const pY0 = y0;
        const pX1 = x0 + dirX * scale;
        const pY1 = y0 + dirY * scale;

        const ownerDocument = this.canvas.ownerDocument ?? document;

        // Cache key for this repeating gradient pattern
        const cacheKey = `rlg|${backgroundImage.angle}|${Math.round(patternLength)}|${JSON.stringify(backgroundImage.stops)}`;

        let pattern = this.lruGet(this.patternCache, cacheKey);
        if (!pattern) {
            const canvas = ownerDocument.createElement('canvas');
            // Create a canvas large enough to hold one full repeating unit
            const canvasSize = Math.max(1, Math.ceil(patternLength));
            canvas.width = canvasSize;
            canvas.height = canvasSize;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return;
            }

            const gradient = ctx.createLinearGradient(pX0 - x, pY0 - y, pX1 - x, pY1 - y);

            // Normalize stops to [0, 1] range for one repeating unit
            processedStops.forEach((colorStop) => {
                gradient.addColorStop((colorStop.stop - firstStop.stop) / patternLength, asString(colorStop.color));
            });

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasSize, canvasSize);

            if (canvasSize > 0) {
                pattern = this.ctx.createPattern(canvas, 'repeat') as CanvasPattern;
                this.lruSet(this.patternCache, cacheKey, pattern);
            }
        }

        if (pattern) {
            this.renderRepeat(path, pattern, x, y);
        }
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

        let pattern = this.lruGet(this.patternCache, cacheKey);
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
                this.lruSet(this.patternCache, cacheKey, pattern);
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
        const x = getAbsoluteValue(position[0], width);
        const y = getAbsoluteValue(position[position.length - 1], height);

        let [rx, ry] = calculateRadius(backgroundImage, x, y, width, height);
        // Handle edge case where radial gradient size is 0
        // Use a minimum value of 0.01 to ensure gradient is still rendered
        if (rx === 0 || ry === 0) {
            rx = Math.max(rx, 0.01);
            ry = Math.max(ry, 0.01);
        }
        if (rx > 0 && ry > 0) {
            const radialGradient = this.ctx.createRadialGradient(left + x, top + y, 0, left + x, top + y, rx);

            processColorStops(backgroundImage.stops, rx * 2).forEach((colorStop) =>
                radialGradient.addColorStop(colorStop.stop, asString(colorStop.color))
            );

            this.path(path);
            this.ctx.fillStyle = radialGradient;
            if (rx !== ry) {
                // transforms for elliptical radial gradient
                const midX = container.bounds.left + 0.5 * container.bounds.width;
                const midY = container.bounds.top + 0.5 * container.bounds.height;
                const f = ry / rx;
                const invF = 1 / f;

                this.ctx.save();
                this.ctx.translate(midX, midY);
                this.ctx.transform(1, 0, 0, f, 0, 0);
                this.ctx.translate(-midX, -midY);

                this.ctx.fillRect(left, invF * (top - midY) + midY, width, height * invF);
                this.ctx.restore();
            } else {
                this.ctx.fill();
            }
        }
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
        // https://github.com/niklasvh/html2canvas/pull/2911
        // if (image.width === width && image.height === height) {
        //     return image;
        // }

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

    /**
     * LRU-aware get: returns value and promotes the entry to end of Map.
     */
    private lruGet(cache: Map<string, CanvasPattern>, key: string): CanvasPattern | undefined {
        const value = cache.get(key);
        if (value !== undefined) {
            cache.delete(key);
            cache.set(key, value);
        }
        return value;
    }

    /** LRU-aware set for CanvasPattern caches. Evicts oldest entry on overflow. */
    private lruSet(cache: Map<string, CanvasPattern>, key: string, value: CanvasPattern): void {
        if (cache.size >= BackgroundRenderer.PATTERN_CACHE_MAX) {
            const oldestKey = cache.keys().next().value;
            cache.delete(oldestKey);
        }
        cache.set(key, value);
    }
}
