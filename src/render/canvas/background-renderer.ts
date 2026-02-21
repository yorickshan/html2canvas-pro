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
import { CSSImageType, CSSURLImage, isLinearGradient, isRadialGradient } from '../../css/types/image';
import { calculateBackgroundRendering } from '../background';
import { calculateGradientDirection, calculateRadius, processColorStops } from '../../css/types/functions/gradient';
import { FIFTY_PERCENT, getAbsoluteValue } from '../../css/types/length-percentage';
import { asString } from '../../css/types/color-utilities';
import { isBezierCurve } from '../bezier-curve';
import { Vector } from '../vector';

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

    constructor(deps: BackgroundRendererDependencies) {
        this.ctx = deps.ctx;
        this.context = deps.context;
        this.canvas = deps.canvas;
        // Options stored in deps but not needed as instance property
    }

    /**
     * Render background images for a container
     * Supports URL images, linear gradients, and radial gradients
     *
     * @param container - Element container with background styles
     */
    async renderBackgroundImage(container: ElementContainer): Promise<void> {
        let index = container.styles.backgroundImage.length - 1;
        for (const backgroundImage of container.styles.backgroundImage.slice(0).reverse()) {
            if (backgroundImage.type === CSSImageType.URL) {
                await this.renderBackgroundURLImage(container, backgroundImage as CSSURLImage, index);
            } else if (isLinearGradient(backgroundImage)) {
                this.renderLinearGradient(container, backgroundImage, index);
            } else if (isRadialGradient(backgroundImage)) {
                this.renderRadialGradient(container, backgroundImage, index);
            }
            index--;
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
            const pattern = this.ctx.createPattern(this.resizeImage(image, width, height), 'repeat') as CanvasPattern;
            this.renderRepeat(path, pattern, x, y);
        }
    }

    /**
     * Render a linear gradient background
     */
    private renderLinearGradient(container: ElementContainer, backgroundImage: any, index: number): void {
        const [path, x, y, width, height] = calculateBackgroundRendering(container, index, [null, null, null]);
        const [lineLength, x0, x1, y0, y1] = calculateGradientDirection(backgroundImage.angle, width, height);

        const ownerDocument = this.canvas.ownerDocument ?? document;
        const canvas = ownerDocument.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        const gradient = ctx.createLinearGradient(x0, y0, x1, y1);

        processColorStops(backgroundImage.stops, lineLength || 1).forEach((colorStop) =>
            gradient.addColorStop(colorStop.stop, asString(colorStop.color))
        );

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        if (width > 0 && height > 0) {
            const pattern = this.ctx.createPattern(canvas, 'repeat') as CanvasPattern;
            this.renderRepeat(path, pattern, x, y);
        }
    }

    /**
     * Render a radial gradient background
     */
    private renderRadialGradient(container: ElementContainer, backgroundImage: any, index: number): void {
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
     * @returns Resized canvas or original image
     */
    private resizeImage(image: HTMLImageElement, width: number, height: number): HTMLCanvasElement | HTMLImageElement {
        // https://github.com/niklasvh/html2canvas/pull/2911
        // if (image.width === width && image.height === height) {
        //     return image;
        // }

        const ownerDocument = this.canvas.ownerDocument ?? document;
        const canvas = ownerDocument.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height);
        return canvas;
    }

    /**
     * Create a canvas path from path array
     *
     * @param paths - Array of path points
     */
    private path(paths: Path[]): void {
        this.ctx.beginPath();
        this.formatPath(paths);
        this.ctx.closePath();
    }

    /**
     * Format path points into canvas path
     *
     * @param paths - Array of path points
     */
    private formatPath(paths: Path[]): void {
        paths.forEach((point, index) => {
            const start: Vector = isBezierCurve(point) ? point.start : point;
            if (index === 0) {
                this.ctx.moveTo(start.x, start.y);
            } else {
                this.ctx.lineTo(start.x, start.y);
            }

            if (isBezierCurve(point)) {
                this.ctx.bezierCurveTo(
                    point.startControl.x,
                    point.startControl.y,
                    point.endControl.x,
                    point.endControl.y,
                    point.end.x,
                    point.end.y
                );
            }
        });
    }
}
