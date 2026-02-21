import { ElementPaint, parseStackingContexts, StackingContext } from '../stacking-context';
import { Color } from '../../css/types/color';
import { asString, isTransparent } from '../../css/types/color-utilities';
import { ElementContainer, FLAGS } from '../../dom/element-container';
import { BORDER_STYLE } from '../../css/property-descriptors/border-style';
import { Path, transformPath } from '../path';
import { BACKGROUND_CLIP } from '../../css/property-descriptors/background-clip';
import { BoundCurves, calculateBorderBoxPath, calculateContentBoxPath, calculatePaddingBoxPath } from '../bound-curves';
import { isBezierCurve } from '../bezier-curve';
import { Vector } from '../vector';
import { CSSImageType, CSSURLImage } from '../../css/types/image';
import { getBackgroundValueForIndex } from '../background';
import { TextBounds } from '../../css/layout/text';
import { ImageElementContainer } from '../../dom/replaced-elements/image-element-container';
import { contentBox } from '../box-sizing';
import { CanvasElementContainer } from '../../dom/replaced-elements/canvas-element-container';
import { SVGElementContainer } from '../../dom/replaced-elements/svg-element-container';
import { ReplacedElementContainer } from '../../dom/replaced-elements';
import { EffectTarget } from '../effects';
import { contains } from '../../core/bitwise';
import { getAbsoluteValue } from '../../css/types/length-percentage';
import { FontMetrics } from '../font-metrics';
import { DISPLAY } from '../../css/property-descriptors/display';
import { Bounds } from '../../css/layout/bounds';
import { IMAGE_RENDERING } from '../../css/property-descriptors/image-rendering';
import { LIST_STYLE_TYPE } from '../../css/property-descriptors/list-style-type';
import { computeLineHeight } from '../../css/property-descriptors/line-height';
import {
    CHECKBOX,
    INPUT_COLOR,
    PLACEHOLDER_COLOR,
    InputElementContainer,
    RADIO
} from '../../dom/replaced-elements/input-element-container';
import { TEXT_ALIGN } from '../../css/property-descriptors/text-align';
import { TextareaElementContainer } from '../../dom/elements/textarea-element-container';
import { SelectElementContainer } from '../../dom/elements/select-element-container';
import { IFrameElementContainer } from '../../dom/replaced-elements/iframe-element-container';
import { Renderer } from '../renderer';
import { Context } from '../../core/context';
import { BackgroundRenderer } from './background-renderer';
import { BorderRenderer } from './border-renderer';
import { EffectsRenderer } from './effects-renderer';
import { TextRenderer } from './text-renderer';
import { OBJECT_FIT } from '../../css/property-descriptors/object-fit';

export type RenderConfigurations = RenderOptions & {
    backgroundColor: Color | null;
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

export class CanvasRenderer extends Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    private readonly fontMetrics: FontMetrics;
    private readonly backgroundRenderer: BackgroundRenderer;
    private readonly borderRenderer: BorderRenderer;
    private readonly effectsRenderer: EffectsRenderer;
    private readonly textRenderer: TextRenderer;

    constructor(context: Context, options: RenderConfigurations) {
        super(context, options);
        this.canvas = options.canvas ? options.canvas : document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
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
        if (contains(paint.container.flags, FLAGS.DEBUG_RENDER)) {
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
            let sx = 0,
                sy = 0,
                sw: number = intrinsicWidth,
                sh: number = intrinsicHeight,
                dx: number = box.left,
                dy: number = box.top,
                dw: number = box.width,
                dh: number = box.height;
            const { objectFit } = container.styles;
            const boxRatio = dw / dh;
            const imgRatio = sw / sh;
            if (objectFit === OBJECT_FIT.CONTAIN) {
                if (imgRatio > boxRatio) {
                    dh = dw / imgRatio;
                    dy += (box.height - dh) / 2;
                } else {
                    dw = dh * imgRatio;
                    dx += (box.width - dw) / 2;
                }
            } else if (objectFit === OBJECT_FIT.COVER) {
                if (imgRatio > boxRatio) {
                    sw = sh * boxRatio;
                    sx += (intrinsicWidth - sw) / 2;
                } else {
                    sh = sw / boxRatio;
                    sy += (intrinsicHeight - sh) / 2;
                }
            } else if (objectFit === OBJECT_FIT.NONE) {
                if (sw > dw) {
                    sx += (sw - dw) / 2;
                    sw = dw;
                } else {
                    dx += (dw - sw) / 2;
                    dw = sw;
                }
                if (sh > dh) {
                    sy += (sh - dh) / 2;
                    sh = dh;
                } else {
                    dy += (dh - sh) / 2;
                    dh = sh;
                }
            } else if (objectFit === OBJECT_FIT.SCALE_DOWN) {
                const containW = imgRatio > boxRatio ? dw : dh * imgRatio;
                const noneW = sw > dw ? sw : dw;
                if (containW < noneW) {
                    if (imgRatio > boxRatio) {
                        dh = dw / imgRatio;
                        dy += (box.height - dh) / 2;
                    } else {
                        dw = dh * imgRatio;
                        dx += (box.width - dw) / 2;
                    }
                } else {
                    if (sw > dw) {
                        sx += (sw - dw) / 2;
                        sw = dw;
                    } else {
                        dx += (dw - sw) / 2;
                        dw = sw;
                    }
                    if (sh > dh) {
                        sy += (sh - dh) / 2;
                        sh = dh;
                    } else {
                        dy += (dh - sh) / 2;
                        dh = sh;
                    }
                }
            }
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
        // This matches browser behavior where text-overflow uses the content width
        const textBounds = contentBox(container);
        for (const child of container.textNodes) {
            await this.textRenderer.renderTextNode(child, styles, textBounds);
        }

        if (container instanceof ImageElementContainer) {
            try {
                const image = await this.context.cache.match(container.src);

                // Apply image smoothing based on CSS image-rendering property and global options
                const prevSmoothing = this.ctx.imageSmoothingEnabled;

                // CSS image-rendering property overrides global settings
                if (
                    styles.imageRendering === IMAGE_RENDERING.PIXELATED ||
                    styles.imageRendering === IMAGE_RENDERING.CRISP_EDGES
                ) {
                    this.context.logger.debug(
                        `Disabling image smoothing for ${container.src} due to CSS image-rendering: ${styles.imageRendering === IMAGE_RENDERING.PIXELATED ? 'pixelated' : 'crisp-edges'}`
                    );
                    this.ctx.imageSmoothingEnabled = false;
                } else if (styles.imageRendering === IMAGE_RENDERING.SMOOTH) {
                    this.context.logger.debug(
                        `Enabling image smoothing for ${container.src} due to CSS image-rendering: smooth`
                    );
                    this.ctx.imageSmoothingEnabled = true;
                }
                // IMAGE_RENDERING.AUTO: keep current global setting

                this.renderReplacedElement(container, curves, image);

                // Restore previous smoothing state
                this.ctx.imageSmoothingEnabled = prevSmoothing;
            } catch (e) {
                this.context.logger.error(`Error loading image ${container.src}`);
            }
        }

        if (container instanceof CanvasElementContainer) {
            this.renderReplacedElement(container, curves, container.canvas);
        }

        if (container instanceof SVGElementContainer) {
            try {
                const image = await this.context.cache.match(container.svg);
                this.renderReplacedElement(container, curves, image);
            } catch (e) {
                this.context.logger.error(`Error loading svg ${container.svg.substring(0, 255)}`);
            }
        }

        if (container instanceof IFrameElementContainer && container.tree) {
            const iframeRenderer = new CanvasRenderer(this.context, {
                scale: this.options.scale,
                backgroundColor: container.backgroundColor,
                x: 0,
                y: 0,
                width: container.width,
                height: container.height
            });

            const canvas = await iframeRenderer.render(container.tree);
            if (container.width && container.height) {
                this.ctx.drawImage(
                    canvas,
                    0,
                    0,
                    container.width,
                    container.height,
                    container.bounds.left,
                    container.bounds.top,
                    container.bounds.width,
                    container.bounds.height
                );
            }
        }

        if (container instanceof InputElementContainer) {
            const size = Math.min(container.bounds.width, container.bounds.height);

            if (container.type === CHECKBOX) {
                if (container.checked) {
                    this.ctx.save();
                    this.path([
                        new Vector(container.bounds.left + size * 0.39363, container.bounds.top + size * 0.79),
                        new Vector(container.bounds.left + size * 0.16, container.bounds.top + size * 0.5549),
                        new Vector(container.bounds.left + size * 0.27347, container.bounds.top + size * 0.44071),
                        new Vector(container.bounds.left + size * 0.39694, container.bounds.top + size * 0.5649),
                        new Vector(container.bounds.left + size * 0.72983, container.bounds.top + size * 0.23),
                        new Vector(container.bounds.left + size * 0.84, container.bounds.top + size * 0.34085),
                        new Vector(container.bounds.left + size * 0.39363, container.bounds.top + size * 0.79)
                    ]);

                    this.ctx.fillStyle = asString(INPUT_COLOR);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            } else if (container.type === RADIO) {
                if (container.checked) {
                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.arc(
                        container.bounds.left + size / 2,
                        container.bounds.top + size / 2,
                        size / 4,
                        0,
                        Math.PI * 2,
                        true
                    );
                    this.ctx.fillStyle = asString(INPUT_COLOR);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }
        }

        if (isTextInputElement(container) && container.value.length) {
            const [font, fontFamily, fontSize] = this.textRenderer.createFontStyle(styles);
            const { baseline } = this.fontMetrics.getMetrics(fontFamily, fontSize);

            this.ctx.font = font;

            // Fix for Issue #92: Use placeholder color when rendering placeholder text
            const isPlaceholder = container instanceof InputElementContainer && container.isPlaceholder;
            this.ctx.fillStyle = isPlaceholder ? asString(PLACEHOLDER_COLOR) : asString(styles.color);

            this.ctx.textBaseline = 'alphabetic';
            this.ctx.textAlign = canvasTextAlign(container.styles.textAlign);

            const bounds = contentBox(container);

            let x = 0;

            switch (container.styles.textAlign) {
                case TEXT_ALIGN.CENTER:
                    x += bounds.width / 2;
                    break;
                case TEXT_ALIGN.RIGHT:
                    x += bounds.width;
                    break;
            }

            // Fix for Issue #92: Position text vertically centered in single-line input
            // Only apply vertical centering for InputElementContainer, not for textarea or select
            let verticalOffset = 0;
            if (container instanceof InputElementContainer) {
                const fontSizeValue = getAbsoluteValue(styles.fontSize, 0);
                verticalOffset = (bounds.height - fontSizeValue) / 2;
            }

            // Create text bounds with horizontal and vertical offsets
            // Height is not modified as it doesn't affect text rendering position
            const textBounds = bounds.add(x, verticalOffset, 0, 0);

            this.ctx.save();
            this.path([
                new Vector(bounds.left, bounds.top),
                new Vector(bounds.left + bounds.width, bounds.top),
                new Vector(bounds.left + bounds.width, bounds.top + bounds.height),
                new Vector(bounds.left, bounds.top + bounds.height)
            ]);

            this.ctx.clip();

            this.textRenderer.renderTextWithLetterSpacing(
                new TextBounds(container.value, textBounds),
                styles.letterSpacing,
                baseline
            );
            this.ctx.restore();
            this.ctx.textBaseline = 'alphabetic';
            this.ctx.textAlign = 'left';
        }

        if (contains(container.styles.display, DISPLAY.LIST_ITEM)) {
            if (container.styles.listStyleImage !== null) {
                const img = container.styles.listStyleImage;
                if (img.type === CSSImageType.URL) {
                    let image;
                    const url = (img as CSSURLImage).url;
                    try {
                        image = await this.context.cache.match(url);
                        this.ctx.drawImage(image, container.bounds.left - (image.width + 10), container.bounds.top);
                    } catch (e) {
                        this.context.logger.error(`Error loading list-style-image ${url}`);
                    }
                }
            } else if (paint.listValue && container.styles.listStyleType !== LIST_STYLE_TYPE.NONE) {
                const [font] = this.textRenderer.createFontStyle(styles);

                this.ctx.font = font;
                this.ctx.fillStyle = asString(styles.color);

                this.ctx.textBaseline = 'middle';
                this.ctx.textAlign = 'right';
                const bounds = new Bounds(
                    container.bounds.left,
                    container.bounds.top + getAbsoluteValue(container.styles.paddingTop, container.bounds.width),
                    container.bounds.width,
                    computeLineHeight(styles.lineHeight, styles.fontSize.number) / 2 + 1
                );

                this.textRenderer.renderTextWithLetterSpacing(
                    new TextBounds(paint.listValue, bounds),
                    styles.letterSpacing,
                    computeLineHeight(styles.lineHeight, styles.fontSize.number) / 2 + 2
                );
                this.ctx.textBaseline = 'bottom';
                this.ctx.textAlign = 'left';
            }
        }
    }

    async renderStackContent(stack: StackingContext): Promise<void> {
        if (contains(stack.element.container.flags, FLAGS.DEBUG_RENDER)) {
            debugger;
        }
        // https://www.w3.org/TR/css-position-3/#painting-order
        // 1. the background and borders of the element forming the stacking context.
        await this.renderNodeBackgroundAndBorders(stack.element);
        // 2. the child stacking contexts with negative stack levels (most negative first).
        for (const child of stack.negativeZIndex) {
            await this.renderStack(child);
        }
        // 3. For all its in-flow, non-positioned, block-level descendants in tree order:
        await this.renderNodeContent(stack.element);

        for (const child of stack.nonInlineLevel) {
            await this.renderNode(child);
        }
        // 4. All non-positioned floating descendants, in tree order. For each one of these,
        // treat the element as if it created a new stacking context, but any positioned descendants and descendants
        // which actually create a new stacking context should be considered part of the parent stacking context,
        // not this new one.
        for (const child of stack.nonPositionedFloats) {
            await this.renderStack(child);
        }
        // 5. the in-flow, inline-level, non-positioned descendants, including inline tables and inline blocks.
        for (const child of stack.nonPositionedInlineLevel) {
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
            await this.renderStack(child);
        }
        // 7. Stacking contexts formed by positioned descendants with z-indices greater than or equal to 1 in z-index
        // order (smallest first) then tree order.
        for (const child of stack.positiveZIndex) {
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
        this.ctx.beginPath();
        this.formatPath(paths);
        this.ctx.closePath();
    }

    formatPath(paths: Path[]): void {
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

const isTextInputElement = (
    container: ElementContainer
): container is InputElementContainer | TextareaElementContainer | SelectElementContainer => {
    if (container instanceof TextareaElementContainer) {
        return true;
    } else if (container instanceof SelectElementContainer) {
        return true;
    } else if (container instanceof InputElementContainer && container.type !== RADIO && container.type !== CHECKBOX) {
        return true;
    }
    return false;
};

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

const canvasTextAlign = (textAlign: TEXT_ALIGN): CanvasTextAlign => {
    switch (textAlign) {
        case TEXT_ALIGN.CENTER:
            return 'center';
        case TEXT_ALIGN.RIGHT:
            return 'right';
        case TEXT_ALIGN.LEFT:
        default:
            return 'left';
    }
};
