import { ElementPaint, parseStackingContexts, StackingContext } from '../stacking-context';
import { Color } from '../../css/types/color';
import { asString, isTransparent } from '../../css/types/color-utilities';
import { ElementContainer } from '../../dom/element-container';
import { BORDER_STYLE } from '../../css/property-descriptors/border-style';
import { Path, transformPath } from '../path';
import { BACKGROUND_CLIP } from '../../css/property-descriptors/background-clip';
import { BoundCurves, calculateBorderBoxPath, calculateContentBoxPath, calculatePaddingBoxPath } from '../bound-curves';
import { CSSImageType, CSSURLImage } from '../../css/types/image';
import { getBackgroundValueForIndex } from '../background';
import { contentBox } from '../box-sizing';
import { ReplacedElementContainer } from '../../dom/replaced-elements';
import { EffectTarget } from '../effects';
import { FontMetrics } from '../font-metrics';
import { TextRenderer } from './text-renderer';
import { Context } from '../../core/context';
import { BackgroundRenderer } from './background-renderer';
import { BorderRenderer } from './border-renderer';
import { BorderImageRenderer } from './border-image-renderer';
import { EffectsRenderer } from './effects-renderer';
import { createCanvasPath, formatCanvasPath } from './canvas-path';
import { calculateObjectFitRendering } from '../object-fit';
import { renderReplacedElements, renderFormElements, renderListMarker } from './content-renderer';

export type RenderConfigurations = RenderOptions & {
    backgroundColor: Color | null;
    signal?: AbortSignal;
    /**
     * Enable/disable image smoothing (anti-aliasing).
     * When disabled, images are rendered with pixel-perfect sharpness (no interpolation).
     * CSS `image-rendering` property on individual elements takes precedence.
     * @default browser default (usually true)
     */
    imageSmoothing?: boolean;
    /**
     * Image smoothing quality level when imageSmoothing is enabled.
     * Higher quality may be slower for large images.
     * Only supported in modern browsers (Chrome 54+, Firefox 94+, Safari 17+).
     * Falls back gracefully in older browsers.
     * @default browser default
     */
    imageSmoothingQuality?: 'low' | 'medium' | 'high';
};

export interface RenderOptions {
    scale: number;
    canvas?: HTMLCanvasElement;
    x: number;
    y: number;
    width: number;
    height: number;
}

const MASK_OFFSET = 10000;

export class CanvasRenderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    private readonly context: Context;
    private readonly options: RenderConfigurations;
    private readonly fontMetrics: FontMetrics;
    private readonly backgroundRenderer: BackgroundRenderer;
    private readonly borderRenderer: BorderRenderer;
    private readonly borderImageRenderer: BorderImageRenderer;
    private readonly effectsRenderer: EffectsRenderer;
    private readonly textRenderer: TextRenderer;

    constructor(context: Context, options: RenderConfigurations) {
        this.context = context;
        this.options = options;
        this.canvas = options.canvas ? options.canvas : document.createElement('canvas');
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D rendering context from canvas');
        }
        this.ctx = ctx;
        if (!options.canvas) {
            this.canvas.width = Math.floor(options.width * options.scale);
            this.canvas.height = Math.floor(options.height * options.scale);
            this.canvas.style.width = `${options.width}px`;
            this.canvas.style.height = `${options.height}px`;
        }
        this.fontMetrics = new FontMetrics(document);
        this.ctx.scale(this.options.scale, this.options.scale);
        this.ctx.translate(-options.x, -options.y);
        this.ctx.textBaseline = 'bottom';

        // Set image smoothing options
        if (options.imageSmoothing !== undefined) {
            this.ctx.imageSmoothingEnabled = options.imageSmoothing;
        }
        if (options.imageSmoothingQuality) {
            this.ctx.imageSmoothingQuality = options.imageSmoothingQuality;
        }

        // Initialize specialized renderers
        this.backgroundRenderer = new BackgroundRenderer({
            ctx: this.ctx,
            context: this.context,
            canvas: this.canvas,
            options: {
                width: options.width,
                height: options.height,
                scale: options.scale
            }
        });

        this.borderRenderer = new BorderRenderer(
            { ctx: this.ctx },
            {
                path: (paths) => this.path(paths),
                formatPath: (paths) => this.formatPath(paths)
            }
        );

        this.borderImageRenderer = new BorderImageRenderer(this.ctx);

        this.effectsRenderer = new EffectsRenderer({ ctx: this.ctx }, { path: (paths) => this.path(paths) });

        this.textRenderer = new TextRenderer({
            ctx: this.ctx,
            context: this.context,
            options: { scale: options.scale }
        });

        this.context.logger.debug(
            `Canvas renderer initialized (${options.width}x${options.height}) with scale ${options.scale}`
        );
    }

    async renderStack(stack: StackingContext): Promise<void> {
        const styles = stack.element.container.styles;
        if (styles.isVisible()) {
            await this.renderStackContent(stack);
        }
    }

    async renderNode(paint: ElementPaint): Promise<void> {
        if (paint.container.debugRender) {
            debugger;
        }

        if (paint.container.styles.isVisible()) {
            await this.renderNodeBackgroundAndBorders(paint);
            await this.renderNodeContent(paint);
        }
    }

    /**
     * Helper method to render text with paint order support
     * Reduces code duplication in line-clamp and normal rendering
     */

    // Helper method to truncate text and add ellipsis if needed

    renderReplacedElement(
        container: ReplacedElementContainer,
        curves: BoundCurves,
        image: HTMLImageElement | HTMLCanvasElement
    ): void {
        const intrinsicWidth = (image as HTMLImageElement).naturalWidth || container.intrinsicWidth;
        const intrinsicHeight = (image as HTMLImageElement).naturalHeight || container.intrinsicHeight;
        if (image && intrinsicWidth > 0 && intrinsicHeight > 0) {
            const box = contentBox(container);
            const path = calculatePaddingBoxPath(curves);
            this.path(path);
            this.ctx.save();
            this.ctx.clip();
            const { sx, sy, sw, sh, dx, dy, dw, dh } = calculateObjectFitRendering(
                intrinsicWidth,
                intrinsicHeight,
                box,
                container.styles.objectFit,
                container.styles.objectPosition
            );
            this.ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
            this.ctx.restore();
        }
    }

    async renderNodeContent(paint: ElementPaint): Promise<void> {
        this.effectsRenderer.applyEffects(paint.getEffects(EffectTarget.CONTENT));
        const container = paint.container;
        const curves = paint.curves;
        const styles = container.styles;
        // Use content box for text overflow calculation (excludes padding and border)
        const textBounds = contentBox(container);
        for (const child of container.textNodes) {
            await this.textRenderer.renderTextNode(child, styles, textBounds);
        }

        await renderReplacedElements(this.ctx, this.context, this.options, container, curves, styles, (c, cv, img) =>
            this.renderReplacedElement(c, cv, img)
        );

        renderFormElements(this.ctx, this.fontMetrics, this.textRenderer, this.path.bind(this), container, styles);

        await renderListMarker(this.ctx, this.context, this.textRenderer, paint, container, styles);
    }

    async renderStackContent(stack: StackingContext): Promise<void> {
        if (stack.element.container.debugRender) {
            debugger;
        }
        const signal = this.options.signal;
        // https://www.w3.org/TR/css-position-3/#painting-order
        // 1. the background and borders of the element forming the stacking context.
        await this.renderNodeBackgroundAndBorders(stack.element);
        // 2. the child stacking contexts with negative stack levels (most negative first).
        for (const child of stack.negativeZIndex) {
            if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
            await this.renderStack(child);
        }
        // 3. For all its in-flow, non-positioned, block-level descendants in tree order:
        if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
        await this.renderNodeContent(stack.element);

        for (const child of stack.nonInlineLevel) {
            await this.renderNode(child);
        }
        // 4. All non-positioned floating descendants, in tree order. For each one of these,
        // treat the element as if it created a new stacking context, but any positioned descendants and descendants
        // which actually create a new stacking context should be considered part of the parent stacking context,
        // not this new one.
        for (const child of stack.nonPositionedFloats) {
            if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
            await this.renderStack(child);
        }
        // 5. the in-flow, inline-level, non-positioned descendants, including inline tables and inline blocks.
        for (const child of stack.nonPositionedInlineLevel) {
            if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
            await this.renderStack(child);
        }
        for (const child of stack.inlineLevel) {
            await this.renderNode(child);
        }
        // 6. All positioned, opacity or transform descendants, in tree order that fall into the following categories:
        //  All positioned descendants with 'z-index: auto' or 'z-index: 0', in tree order.
        //  For those with 'z-index: auto', treat the element as if it created a new stacking context,
        //  but any positioned descendants and descendants which actually create a new stacking context should be
        //  considered part of the parent stacking context, not this new one. For those with 'z-index: 0',
        //  treat the stacking context generated atomically.
        //
        //  All opacity descendants with opacity less than 1
        //
        //  All transform descendants with transform other than none
        for (const child of stack.zeroOrAutoZIndexOrTransformedOrOpacity) {
            if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
            await this.renderStack(child);
        }
        // 7. Stacking contexts formed by positioned descendants with z-indices greater than or equal to 1 in z-index
        // order (smallest first) then tree order.
        for (const child of stack.positiveZIndex) {
            if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
            await this.renderStack(child);
        }
    }

    mask(paths: Path[]): void {
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        // Use logical dimensions (options.width/height) instead of canvas pixel dimensions
        // because context has already been scaled by this.options.scale
        // Fix for Issue #126: Using canvas pixel dimensions causes broken output
        this.ctx.lineTo(this.options.width, 0);
        this.ctx.lineTo(this.options.width, this.options.height);
        this.ctx.lineTo(0, this.options.height);
        this.ctx.lineTo(0, 0);
        this.formatPath(paths.slice(0).reverse());
        this.ctx.closePath();
    }

    path(paths: Path[]): void {
        createCanvasPath(this.ctx, paths);
    }

    formatPath(paths: Path[]): void {
        formatCanvasPath(this.ctx, paths);
    }

    async renderNodeBackgroundAndBorders(paint: ElementPaint): Promise<void> {
        this.effectsRenderer.applyEffects(paint.getEffects(EffectTarget.BACKGROUND_BORDERS));
        const styles = paint.container.styles;
        const hasBackground = !isTransparent(styles.backgroundColor) || styles.backgroundImage.length;

        const borders = [
            { style: styles.borderTopStyle, color: styles.borderTopColor, width: styles.borderTopWidth },
            { style: styles.borderRightStyle, color: styles.borderRightColor, width: styles.borderRightWidth },
            { style: styles.borderBottomStyle, color: styles.borderBottomColor, width: styles.borderBottomWidth },
            { style: styles.borderLeftStyle, color: styles.borderLeftColor, width: styles.borderLeftWidth }
        ];

        const backgroundPaintingArea = calculateBackgroundCurvedPaintingArea(
            getBackgroundValueForIndex(styles.backgroundClip, 0),
            paint.curves
        );

        if (hasBackground || styles.boxShadow.length) {
            this.ctx.save();
            this.path(backgroundPaintingArea);
            this.ctx.clip();

            if (!isTransparent(styles.backgroundColor)) {
                this.ctx.fillStyle = asString(styles.backgroundColor);
                this.ctx.fill();
            }

            await this.backgroundRenderer.renderBackgroundImage(paint.container);

            this.ctx.restore();

            styles.boxShadow
                .slice(0)
                .reverse()
                .forEach((shadow) => {
                    this.ctx.save();
                    const borderBoxArea = calculateBorderBoxPath(paint.curves);
                    const maskOffset = shadow.inset ? 0 : MASK_OFFSET;
                    const shadowPaintingArea = transformPath(
                        borderBoxArea,
                        -maskOffset + (shadow.inset ? 1 : -1) * shadow.spread.number,
                        (shadow.inset ? 1 : -1) * shadow.spread.number,
                        shadow.spread.number * (shadow.inset ? -2 : 2),
                        shadow.spread.number * (shadow.inset ? -2 : 2)
                    );

                    if (shadow.inset) {
                        this.path(borderBoxArea);
                        this.ctx.clip();
                        this.mask(shadowPaintingArea);
                    } else {
                        this.mask(borderBoxArea);
                        this.ctx.clip();
                        this.path(shadowPaintingArea);
                    }

                    this.ctx.shadowOffsetX = shadow.offsetX.number + maskOffset;
                    this.ctx.shadowOffsetY = shadow.offsetY.number;
                    this.ctx.shadowColor = asString(shadow.color);
                    this.ctx.shadowBlur = shadow.blur.number;
                    this.ctx.fillStyle = shadow.inset ? asString(shadow.color) : 'rgba(0,0,0,1)';

                    this.ctx.fill();
                    this.ctx.restore();
                });
        }

        // Render border-image if present (replaces traditional borders per CSS spec)
        if (styles.borderImageSource) {
            const source = styles.borderImageSource;
            if (source.type === CSSImageType.URL) {
                const url = (source as CSSURLImage).url;
                try {
                    const image = await this.context.cache.match(url);
                    if (image) {
                        const bounds = paint.container.bounds;
                        this.borderImageRenderer.renderBorderImage(
                            bounds,
                            image as HTMLImageElement,
                            styles.borderImageSlice,
                            styles.borderImageRepeat,
                            Math.max(0, styles.borderTopWidth),
                            Math.max(0, styles.borderRightWidth),
                            Math.max(0, styles.borderBottomWidth),
                            Math.max(0, styles.borderLeftWidth)
                        );
                    }
                } catch (e) {
                    this.context.logger.error(`Error loading border-image ${url}`);
                }
            }
            // When border-image is present, skip regular border rendering
            return;
        }

        let side = 0;
        for (const border of borders) {
            if (border.style !== BORDER_STYLE.NONE && !isTransparent(border.color) && border.width > 0) {
                if (border.style === BORDER_STYLE.DASHED) {
                    await this.borderRenderer.renderDashedDottedBorder(
                        border.color,
                        border.width,
                        side,
                        paint.curves,
                        BORDER_STYLE.DASHED
                    );
                } else if (border.style === BORDER_STYLE.DOTTED) {
                    await this.borderRenderer.renderDashedDottedBorder(
                        border.color,
                        border.width,
                        side,
                        paint.curves,
                        BORDER_STYLE.DOTTED
                    );
                } else if (border.style === BORDER_STYLE.DOUBLE) {
                    await this.borderRenderer.renderDoubleBorder(border.color, border.width, side, paint.curves);
                } else {
                    await this.borderRenderer.renderSolidBorder(border.color, side, paint.curves);
                }
            }
            side++;
        }
    }

    async render(element: ElementContainer): Promise<HTMLCanvasElement> {
        if (this.options.backgroundColor) {
            this.ctx.fillStyle = asString(this.options.backgroundColor);
            this.ctx.fillRect(this.options.x, this.options.y, this.options.width, this.options.height);
        }

        const stack = parseStackingContexts(element);

        await this.renderStack(stack);
        this.effectsRenderer.applyEffects([]);
        return this.canvas;
    }
}

const calculateBackgroundCurvedPaintingArea = (clip: BACKGROUND_CLIP, curves: BoundCurves): Path[] => {
    switch (clip) {
        case BACKGROUND_CLIP.BORDER_BOX:
            return calculateBorderBoxPath(curves);
        case BACKGROUND_CLIP.CONTENT_BOX:
            return calculateContentBoxPath(curves);
        case BACKGROUND_CLIP.PADDING_BOX:
        default:
            return calculatePaddingBoxPath(curves);
    }
};
