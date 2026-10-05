import { ElementPaint, parseStackingContexts, StackingContext } from '../stacking-context';
import { Color } from '../../css/types/color';
import { asString, isTransparent } from '../../css/types/color-utilities';
import { ElementContainer } from '../../dom/element-container';
import { BoxShadow } from '../../css/property-descriptors/box-shadow';
import { BORDER_STYLE } from '../../css/property-descriptors/border-style';
import { Path, transformPath } from '../path';
import { BACKGROUND_CLIP } from '../../css/property-descriptors/background-clip';
import { BoundCurves, calculateBorderBoxPath, calculateContentBoxPath, calculatePaddingBoxPath } from '../bound-curves';
import {
    CSSImageType,
    CSSURLImage,
    CSSLinearGradientImage,
    CSSRadialGradientImage,
    CSSConicGradientImage,
    ICSSImage
} from '../../css/types/image';
import { calculateGradientDirection, calculateRadius, processColorStops } from '../../css/types/functions/gradient';
import { getAbsoluteValue, FIFTY_PERCENT } from '../../css/types/length-percentage';
import { rasterizeRadialGradient, stackRepeatingStops, toCanvasStops } from './gradient-rasterizer';
import { at } from '../../core/util';
import { getBackgroundValueForIndex } from '../background';
import { contentBox } from '../box-sizing';
import { ReplacedElementContainer } from '../../dom/replaced-elements';
import { EffectTarget, isBlendEffect, isClipEffect, isFilterEffect, isOpacityEffect } from '../effects';
import { CLIP_PATH_TYPE } from '../../css/property-descriptors/clip-path';
import { MIX_BLEND_MODE } from '../../css/property-descriptors/mix-blend-mode';
import {
    FilterSurfaceError,
    filterOutset,
    parseSimpleFilter,
    releaseSurface,
    renderFilterSurface,
    SimpleFilter
} from './filter-surface';
import { cropSurface, reserveSurface, surfaceBounds, SurfaceBudget } from './surface-bounds';
import { Bounds } from '../../css/layout/bounds';
import { DISPLAY } from '../../css/property-descriptors/display';
import { contains } from '../../core/bitwise';
import { TextRenderer } from './text-renderer';
import { Context } from '../../core/context';
import { BackgroundRenderer } from './background-renderer';
import { BorderRenderer } from './border-renderer';
import { BorderImageRenderer, resolveBorderImageOutset, resolveBorderImageWidths } from './border-image-renderer';
import { EffectsRenderer } from './effects-renderer';
import { createCanvasPath, formatCanvasPath } from './canvas-path';
import { OUTLINE_STYLE } from '../../css/property-descriptors/outline';
import { paintMaskLayers } from './mask-renderer';
import { BoxReflect } from '../../css/property-descriptors/webkit-box-reflect';
import { calculateObjectFitRendering } from '../object-fit';
import { renderReplacedElements, renderFormElements, renderListMarker } from './content-renderer';
import { paintBoxShadow } from './box-shadow-painter';
import { TextClipRenderer } from './text-clip-renderer';
import { CSSParsedDeclaration } from '../../css/index';

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

export class CanvasRenderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    private readonly context: Context;
    private readonly options: RenderConfigurations;
    private readonly backgroundRenderer: BackgroundRenderer;
    private readonly borderRenderer: BorderRenderer;
    private readonly borderImageRenderer: BorderImageRenderer;
    private readonly effectsRenderer: EffectsRenderer;
    private readonly textRenderer: TextRenderer;
    private readonly textClipRenderer: TextClipRenderer;
    private legacySubtree = false;

    constructor(
        context: Context,
        options: RenderConfigurations,
        private readonly surfaceRoot?: ElementPaint,
        private readonly surfaceBudget: SurfaceBudget = { pixels: 0 }
    ) {
        this.context = context;
        this.options = options;
        this.canvas = options.canvas ? options.canvas : context.resourceDocument.createElement('canvas');
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            if (!options.canvas) releaseSurface(this.canvas);
            if (surfaceRoot) throw new FilterSurfaceError('Filter surface canvas is unavailable');
            throw new Error('Failed to get 2D rendering context from canvas');
        }
        this.ctx = ctx;
        if (!options.canvas) {
            this.canvas.width = Math.floor(options.width * options.scale);
            this.canvas.height = Math.floor(options.height * options.scale);
            this.canvas.style.width = `${options.width}px`;
            this.canvas.style.height = `${options.height}px`;
        }
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

        this.effectsRenderer = new EffectsRenderer(
            { ctx: this.ctx, scale: options.scale },
            { path: (paths) => this.path(paths) }
        );

        this.textRenderer = new TextRenderer({
            ctx: this.ctx,
            options: { scale: options.scale }
        });

        this.textClipRenderer = new TextClipRenderer({
            ctx: this.ctx,
            context: this.context,
            scale: options.scale,
            createFontStyle: (styles) => this.textRenderer.createFontStyle(styles)
        });

        this.context.logger.debug(
            `Canvas renderer initialized (${options.width}x${options.height}) with scale ${options.scale}`
        );
    }

    async renderStack(stack: StackingContext): Promise<void> {
        const styles = stack.element.container.styles;
        if (styles.isVisible()) {
            const filter = parseSimpleFilter(styles.filter);
            const hasMask = styles.maskImage.length > 0;
            const reflect = styles.webkitBoxReflect;
            // mix-blend-mode blends the element (background + content) as one
            // isolated group with the backdrop, so it also requires the
            // composited surface path — setting globalCompositeOperation on
            // the main canvas would blend each paint call separately and,
            // for light-coloured content (white text over multiply), erase it.
            const hasBlend = styles.mixBlendMode !== MIX_BLEND_MODE.NORMAL;
            if (
                stack.element !== this.surfaceRoot &&
                !this.legacySubtree &&
                (hasMask || reflect || hasBlend || (filter && (styles.filter || styles.opacity < 1))) &&
                this.canComposite(stack.element)
            ) {
                if (!(await this.renderCompositedStack(stack, filter, hasMask, reflect, hasBlend))) {
                    // A rejected optional surface must preserve the previous subtree path.
                    this.legacySubtree = true;
                    try {
                        await this.renderStackContent(stack);
                    } finally {
                        this.legacySubtree = false;
                    }
                }
                return;
            }
            await this.renderStackContent(stack);
        }
    }

    // Draft scope: transformed and clip-path subtrees keep the old path.
    // The surface root owns its filter/opacity; ancestors are applied at composition.
    private canComposite(paint: ElementPaint): boolean {
        const supported = (container: ElementContainer): boolean => {
            const styles = container.styles;
            return (
                !styles.isTransformed() &&
                styles.zoom === 1 &&
                styles.clipPath.type === CLIP_PATH_TYPE.NONE &&
                !contains(styles.display, DISPLAY.LIST_ITEM) &&
                parseSimpleFilter(styles.filter) !== null
            );
        };
        const subtree = (container: ElementContainer): boolean =>
            supported(container) && container.elements.every(subtree);
        let ancestor = paint.parent;
        while (ancestor && ancestor !== this.surfaceRoot) {
            if (!supported(ancestor.container)) return false;
            ancestor = ancestor.parent;
        }
        return subtree(paint.container);
    }

    private async renderCompositedStack(
        stack: StackingContext,
        filter: SimpleFilter | null,
        hasMask: boolean,
        reflect: BoxReflect | null,
        hasBlend = false
    ): Promise<boolean> {
        const signal = this.options.signal;
        if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
        const bounds = cropSurface(
            surfaceBounds(stack.element.container),
            new Bounds(this.options.x, this.options.y, this.options.width, this.options.height),
            filter ? filterOutset(filter) : 0,
            this.options.scale
        );
        if (!bounds.width || !bounds.height) return true;
        const reserved = reserveSurface(
            this.surfaceBudget,
            Math.ceil(bounds.width * this.options.scale),
            Math.ceil(bounds.height * this.options.scale)
        );
        if (!reserved) {
            this.context.logger.info('Filter surface budget exceeded; using the existing renderer');
            return false;
        }
        const options = {
            ...this.options,
            canvas: undefined,
            backgroundColor: null,
            x: bounds.left,
            y: bounds.top,
            width: bounds.width,
            height: bounds.height
        };
        let source: CanvasRenderer | undefined;
        let filtered: HTMLCanvasElement | undefined;
        try {
            source = new CanvasRenderer(this.context, options, stack.element, this.surfaceBudget);
            await source.renderStackContent(stack);
            source.effectsRenderer.applyEffects([]);
            if (filter) {
                filtered = await renderFilterSurface(
                    source.canvas,
                    filter,
                    stack.element.container.styles.opacity,
                    options.scale,
                    signal
                );
            }
            const composited = filtered ?? source.canvas;
            if (hasMask) {
                await this.applyMask(composited, stack.element.container.styles, bounds);
            }
            if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
            const own = stack.element.effects;
            const effects = stack.element
                .getEffects(EffectTarget.CONTENT, this.surfaceRoot)
                .filter(
                    (effect) =>
                        !own.includes(effect) ||
                        (!isFilterEffect(effect) &&
                            !isOpacityEffect(effect) &&
                            !isBlendEffect(effect) &&
                            !isClipEffect(effect))
                );
            this.effectsRenderer.applyEffects(effects);
            if (hasBlend) {
                // The isolated surface already contains the element's full
                // paint (background + content), including its opacity —
                // renderFilterSurface bakes it even for empty filter chains.
                // Blend it with the backdrop as one group via the element's
                // mix-blend-mode. save/restore keeps the composite operation
                // from leaking into later paints.
                this.ctx.save();
                this.ctx.globalCompositeOperation = stack.element.container.styles
                    .mixBlendMode as GlobalCompositeOperation;
                this.ctx.drawImage(
                    composited,
                    options.x,
                    options.y,
                    composited.width / options.scale,
                    composited.height / options.scale
                );
                this.ctx.restore();
            } else {
                this.ctx.drawImage(
                    composited,
                    options.x,
                    options.y,
                    composited.width / options.scale,
                    composited.height / options.scale
                );
            }
            if (reflect) {
                await this.drawReflection(composited, stack.element.container.bounds, bounds, reflect);
            }
            return true;
        } catch (error) {
            if (!(error instanceof FilterSurfaceError)) throw error;
            this.context.logger.info(`${error.message}; using the existing renderer`);
            return false;
        } finally {
            if (source) releaseSurface(source.canvas);
            if (filtered) releaseSurface(filtered);
            this.surfaceBudget.pixels -= reserved;
        }
    }

    /**
     * Composite an alpha mask onto a finished element surface: all mask
     * layers are painted additively into a mask surface, then kept pixels are
     * selected with destination-in.
     */
    private async applyMask(surface: HTMLCanvasElement, styles: CSSParsedDeclaration, bounds: Bounds): Promise<void> {
        const ctx = surface.getContext('2d');
        if (!ctx) {
            return;
        }
        const maskCanvas = this.context.resourceDocument.createElement('canvas');
        maskCanvas.width = surface.width;
        maskCanvas.height = surface.height;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) {
            return;
        }
        // The surface's device-pixel origin corresponds to the element bounds
        // origin, while mask layers paint in page coordinates — align them.
        maskCtx.scale(this.options.scale, this.options.scale);
        maskCtx.translate(-bounds.left, -bounds.top);
        try {
            await paintMaskLayers(
                maskCtx,
                styles.maskImage,
                styles,
                { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
                async (url) => await this.context.cache.match(url)
            );
        } catch (error) {
            this.context.logger.error(`Error rendering mask-image: ${error instanceof Error ? error.message : error}`);
            return;
        }
        ctx.save();
        try {
            ctx.setTransform(1, 0, 0, 1, 0, 0); // device pixels for the composite
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(maskCanvas, 0, 0);
        } finally {
            ctx.restore();
        }
    }

    /**
     * Mirror the element surface in the given direction and offset, optionally
     * masked (the -webkit-box-reflect mask applies in element space, so it is
     * composited in the mirrored space where the reflection was drawn).
     */
    private async drawReflection(
        composited: HTMLCanvasElement,
        elementBounds: Bounds,
        surfaceBoundsObj: Bounds,
        reflect: BoxReflect
    ): Promise<void> {
        const scale = this.options.scale;
        const w = Math.ceil(elementBounds.width * scale);
        const h = Math.ceil(elementBounds.height * scale);
        if (w <= 0 || h <= 0) {
            return;
        }
        const reserved = reserveSurface(this.surfaceBudget, w, h);
        if (!reserved) {
            return;
        }
        let refCanvas: HTMLCanvasElement | undefined;
        let maskCanvas: HTMLCanvasElement | undefined;
        try {
            refCanvas = this.context.resourceDocument.createElement('canvas');
            refCanvas.width = w;
            refCanvas.height = h;
            const ctx = refCanvas.getContext('2d');
            if (!ctx) {
                return;
            }
            const offX = Math.round((elementBounds.left - surfaceBoundsObj.left) * scale);
            const offY = Math.round((elementBounds.top - surfaceBoundsObj.top) * scale);
            const horizontal = reflect.direction === 'left' || reflect.direction === 'right';
            ctx.save();
            try {
                if (horizontal) {
                    ctx.translate(w, 0);
                    ctx.scale(-1, 1);
                } else {
                    ctx.translate(0, h);
                    ctx.scale(1, -1);
                }
                ctx.drawImage(composited, -offX, -offY);
            } finally {
                ctx.restore();
            }

            if (reflect.mask) {
                // The mask surface must match the reflection's device-pixel
                // size (w×h here is already device scale). Painting it at CSS
                // dimensions would only cover the top-left fraction of the
                // reflection, and destination-in would erase the rest.
                maskCanvas = this.context.resourceDocument.createElement('canvas');
                maskCanvas.width = w;
                maskCanvas.height = h;
                const mctx = maskCanvas.getContext('2d');
                if (mctx) {
                    mctx.scale(scale, scale);
                    await paintMaskLayers(
                        mctx,
                        [reflect.mask],
                        {
                            maskPosition: [],
                            maskRepeat: [],
                            maskSize: []
                        },
                        { left: 0, top: 0, width: elementBounds.width, height: elementBounds.height },
                        async (url) => await this.context.cache.match(url)
                    );
                    ctx.save();
                    try {
                        if (horizontal) {
                            ctx.translate(w, 0);
                            ctx.scale(-1, 1);
                        } else {
                            ctx.translate(0, h);
                            ctx.scale(1, -1);
                        }
                        ctx.globalCompositeOperation = 'destination-in';
                        ctx.drawImage(maskCanvas, 0, 0, w, h);
                    } finally {
                        ctx.restore();
                    }
                }
            }

            const offset = reflect.offset;
            let x = elementBounds.left;
            let y = elementBounds.top;
            if (reflect.direction === 'below') y = elementBounds.top + elementBounds.height + offset;
            else if (reflect.direction === 'above') y = elementBounds.top - elementBounds.height - offset;
            else if (reflect.direction === 'right') x = elementBounds.left + elementBounds.width + offset;
            else x = elementBounds.left - elementBounds.width - offset;

            this.ctx.save();
            try {
                this.ctx.filter = 'none';
                this.ctx.drawImage(refCanvas, x, y, elementBounds.width, elementBounds.height);
            } finally {
                this.ctx.restore();
            }
        } finally {
            if (refCanvas) releaseSurface(refCanvas);
            if (maskCanvas) releaseSurface(maskCanvas);
            this.surfaceBudget.pixels -= reserved;
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
        this.effectsRenderer.applyEffects(paint.getEffects(EffectTarget.CONTENT, this.surfaceRoot));
        const container = paint.container;
        const curves = paint.curves;
        const styles = container.styles;
        // Use content box for text overflow calculation (excludes padding and border)
        const textBounds = contentBox(container);
        for (const child of container.textNodes) {
            await this.textRenderer.renderTextNode(child, styles, textBounds);
        }

        await renderReplacedElements(
            this.ctx,
            this.context,
            {
                scale: this.options.scale,
                backgroundColor: this.options.backgroundColor,
                x: this.options.x,
                y: this.options.y,
                width: this.options.width,
                height: this.options.height
            },
            (ctx, opts) => new CanvasRenderer(ctx, opts),
            container,
            curves,
            styles,
            (c, cv, img) => this.renderReplacedElement(c, cv, img)
        );

        renderFormElements(this.ctx, this.textRenderer, this.path.bind(this), container, styles);

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

    path(paths: Path[]): void {
        createCanvasPath(this.ctx, paths);
    }

    formatPath(paths: Path[]): void {
        formatCanvasPath(this.ctx, paths);
    }

    private async renderSurfaceBoxShadow(paint: ElementPaint, shadow: BoxShadow[number]): Promise<void> {
        // Rasterize a visible silhouette, then blur it. Linux WebKit can drop the
        // interior of Canvas shadows whose solid mask is outside a cropped canvas.
        const spread = shadow.spread.number;
        const blur = shadow.blur.number / 2;
        const margin = Math.ceil(3 * blur) + 1;
        const box = paint.container.bounds.add(-spread, -spread, 2 * spread, 2 * spread);
        if (box.width <= 0 || box.height <= 0) return;
        const scale = this.options.scale;
        const bounds = cropSurface(
            box.add(-margin, -margin, 2 * margin, 2 * margin),
            new Bounds(
                this.options.x - shadow.offsetX.number,
                this.options.y - shadow.offsetY.number,
                this.options.width,
                this.options.height
            ),
            margin,
            scale
        );
        if (!bounds.width || !bounds.height) return;
        const width = Math.ceil(bounds.width * scale),
            height = Math.ceil(bounds.height * scale);
        const reserved = reserveSurface(this.surfaceBudget, width, height);
        if (!reserved) throw new FilterSurfaceError('Box shadow surface budget exceeded');
        let source: HTMLCanvasElement | undefined;
        let filtered: HTMLCanvasElement | undefined;
        try {
            source = this.context.resourceDocument.createElement('canvas');
            source.width = width;
            source.height = height;
            const ctx = source.getContext('2d');
            if (!ctx) throw new FilterSurfaceError('Box shadow surface canvas is unavailable');
            ctx.scale(scale, scale);
            ctx.translate(-bounds.left, -bounds.top);
            createCanvasPath(
                ctx,
                transformPath(calculateBorderBoxPath(paint.curves), -spread, -spread, 2 * spread, 2 * spread)
            );
            ctx.fillStyle = asString(shadow.color);
            ctx.fill();
            filtered = await renderFilterSurface(source, { blur }, 1, scale, this.options.signal);
            this.ctx.save();
            try {
                this.ctx.beginPath();
                this.ctx.rect(this.options.x, this.options.y, this.options.width, this.options.height);
                formatCanvasPath(this.ctx, calculateBorderBoxPath(paint.curves));
                this.ctx.closePath();
                this.ctx.clip('evenodd');
                this.ctx.drawImage(
                    filtered,
                    bounds.left + shadow.offsetX.number,
                    bounds.top + shadow.offsetY.number,
                    filtered.width / scale,
                    filtered.height / scale
                );
            } finally {
                this.ctx.restore();
            }
        } finally {
            if (source) releaseSurface(source);
            if (filtered) releaseSurface(filtered);
            this.surfaceBudget.pixels -= reserved;
        }
    }

    async renderNodeBackgroundAndBorders(paint: ElementPaint): Promise<void> {
        this.effectsRenderer.applyEffects(paint.getEffects(EffectTarget.BACKGROUND_BORDERS, this.surfaceRoot));
        // backdrop-filter filters whatever has already been painted beneath the
        // element. Capture that region from the main canvas first — anything
        // painted later (the element itself, higher siblings) is not part of
        // the backdrop.
        if (!this.surfaceRoot && paint.container.styles.backdropFilter) {
            await this.renderBackdropFilter(paint);
        }
        const styles = paint.container.styles;
        const hasBackground = !isTransparent(styles.backgroundColor) || styles.backgroundImage.length;
        const hasTextClip = hasTextBackgroundClip(styles);

        const borders = [
            { style: styles.borderTopStyle, color: styles.borderTopColor, width: styles.borderTopWidth },
            { style: styles.borderRightStyle, color: styles.borderRightColor, width: styles.borderRightWidth },
            { style: styles.borderBottomStyle, color: styles.borderBottomColor, width: styles.borderBottomWidth },
            { style: styles.borderLeftStyle, color: styles.borderLeftColor, width: styles.borderLeftWidth }
        ];

        const backgroundClipValue = getBackgroundValueForIndex(styles.backgroundClip, 0);
        const backgroundPaintingArea = calculateBackgroundCurvedPaintingArea(backgroundClipValue, paint.curves);

        if (hasBackground || styles.boxShadow.length) {
            // Handle background-clip: text
            if (hasTextClip && paint.container.textNodes.length > 0) {
                await this.textClipRenderer.render(paint);
            } else {
                this.ctx.save();
                this.path(backgroundPaintingArea);
                this.ctx.clip();

                if (!isTransparent(styles.backgroundColor)) {
                    this.ctx.fillStyle = asString(styles.backgroundColor);
                    this.ctx.fill();
                }

                await this.backgroundRenderer.renderBackgroundImage(paint.container);

                this.ctx.restore();
            }

            for (const shadow of styles.boxShadow.slice(0).reverse()) {
                if (this.surfaceRoot && !shadow.inset) {
                    await this.renderSurfaceBoxShadow(paint, shadow);
                    continue;
                }
                await paintBoxShadow(this.ctx, paint, shadow, this.options, this.surfaceBudget);
            }
        }

        // Render border-image if present (replaces traditional borders per CSS spec)
        if (styles.borderImageSource) {
            const source = styles.borderImageSource;
            const bounds = paint.container.bounds;
            const borderWidths: [number, number, number, number] = [
                Math.max(0, styles.borderTopWidth),
                Math.max(0, styles.borderRightWidth),
                Math.max(0, styles.borderBottomWidth),
                Math.max(0, styles.borderLeftWidth)
            ];
            let image: HTMLImageElement | HTMLCanvasElement | null = null;
            if (source.type === CSSImageType.URL) {
                const url = (source as CSSURLImage).url;
                try {
                    image = (await this.context.cache.match(url)) ?? null;
                } catch (e) {
                    this.context.logger.error(`Error loading border-image ${url}`);
                }
            } else {
                // Gradient sources: rasterise the gradient across the border
                // image area, then run the same 9-slice pipeline as for images.
                image = this.rasterizeGradientSource(source, bounds);
            }
            if (image) {
                const outset = resolveBorderImageOutset(styles.borderImageOutset, borderWidths);
                const area = bounds.add(
                    -outset.left,
                    -outset.top,
                    outset.left + outset.right,
                    outset.top + outset.bottom
                );
                const widths = resolveBorderImageWidths(styles.borderImageWidth, borderWidths, area);
                this.borderImageRenderer.renderBorderImage(
                    bounds,
                    image as HTMLImageElement,
                    styles.borderImageSlice,
                    styles.borderImageRepeat,
                    widths[0],
                    widths[1],
                    widths[2],
                    widths[3],
                    outset
                );
            }
            // When border-image is present, skip regular border rendering
            return;
        }

        let side = 0;
        for (const border of borders) {
            if (border.style !== BORDER_STYLE.NONE && !isTransparent(border.color) && border.width > 0) {
                const renderBorderSide = async (): Promise<void> => {
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
                };

                // Browsers break a <fieldset>'s top border where its <legend>
                // sits, instead of drawing the border through the legend (issue
                // #227). Render the top border in two clipped segments around
                // the legend's horizontal span.
                const legend = paint.container.legendBounds;
                if (side === 0 && legend) {
                    const bounds = paint.container.bounds;
                    const legendLeft = legend.left - bounds.left;
                    const legendRight = legend.left + legend.width - bounds.left;
                    if (legendLeft > 0) {
                        this.ctx.save();
                        this.ctx.beginPath();
                        this.ctx.rect(bounds.left, bounds.top, legendLeft, bounds.height);
                        this.ctx.clip();
                        await renderBorderSide();
                        this.ctx.restore();
                    }
                    const rightStart = bounds.left + legendRight;
                    const rightWidth = bounds.width - legendRight;
                    if (rightWidth > 0) {
                        this.ctx.save();
                        this.ctx.beginPath();
                        this.ctx.rect(rightStart, bounds.top, rightWidth, bounds.height);
                        this.ctx.clip();
                        await renderBorderSide();
                        this.ctx.restore();
                    }
                } else {
                    await renderBorderSide();
                }
            }
            side++;
        }

        this.renderOutline(paint);
    }

    /**
     * Draw the element outline: a single closed stroke around the border box,
     * offset outwards. Outlines paint atop content and do not affect layout.
     */
    private renderOutline(paint: ElementPaint): void {
        const styles = paint.container.styles;
        if (styles.outlineStyle === OUTLINE_STYLE.NONE || styles.outlineStyle === OUTLINE_STYLE.AUTO) {
            return;
        }
        const width = Math.max(0, styles.outlineWidth);
        if (width <= 0) {
            return;
        }
        const color = styles.outlineColor ?? styles.color;
        if (isTransparent(color)) {
            return;
        }
        const spread = Math.max(0, styles.outlineOffset) + width / 2;
        const outlinePath = transformPath(
            calculateBorderBoxPath(paint.curves),
            -spread,
            -spread,
            2 * spread,
            2 * spread
        );

        this.ctx.save();
        try {
            this.ctx.strokeStyle = asString(color);
            this.ctx.lineWidth = width;
            if (styles.outlineStyle === OUTLINE_STYLE.DASHED) {
                this.ctx.setLineDash([width * 3, width * 3]);
            } else if (styles.outlineStyle === OUTLINE_STYLE.DOTTED) {
                this.ctx.setLineDash([width, width * 2]);
            }
            this.path(outlinePath);
            this.ctx.stroke();
        } finally {
            this.ctx.restore();
        }
    }

    /**
     * Rasterise a gradient border-image-source across the border image area.
     * CSS allows any <image> as the border-image source; gradients are painted
     * over the whole border-image box and then sliced by the regular 9-slice
     * pipeline, matching browser behaviour for `border-image: linear-gradient()`.
     * Returns null when the gradient could not be painted.
     */
    private rasterizeGradientSource(source: ICSSImage, bounds: Bounds): HTMLCanvasElement | null {
        const width = Math.max(1, Math.ceil(bounds.width));
        const height = Math.max(1, Math.ceil(bounds.height));
        const ownerDocument = this.ctx.canvas.ownerDocument ?? document;
        const canvas = ownerDocument.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return null;
        }

        if (source.type === CSSImageType.LINEAR_GRADIENT || source.type === CSSImageType.REPEATING_LINEAR_GRADIENT) {
            const gradientImage = source as CSSLinearGradientImage;
            const [lineLength, x0, y0, x1, y1] = calculateGradientDirection(gradientImage.angle, width, height);
            const processed = processColorStops(gradientImage.stops, lineLength || width);
            const repeating = source.type === CSSImageType.REPEATING_LINEAR_GRADIENT;
            // Repeating gradients stack the one-cycle stop list periodically.
            const stacked = repeating ? stackRepeatingStops(processed) : null;
            const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
            if (stacked) {
                stacked.forEach((colorStop) => {
                    gradient.addColorStop(Math.min(1, Math.max(0, colorStop.stop)), colorStop.color);
                });
            } else if (repeating) {
                // Degenerate period repeats nothing — last colour across the box.
                const lastColor = asString(at(processed, processed.length - 1).color);
                gradient.addColorStop(0, lastColor);
                gradient.addColorStop(1, lastColor);
            } else {
                toCanvasStops(processed).forEach((colorStop) => {
                    gradient.addColorStop(colorStop.stop, colorStop.color);
                });
            }
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            return canvas;
        }
        if (source.type === CSSImageType.RADIAL_GRADIENT || source.type === CSSImageType.REPEATING_RADIAL_GRADIENT) {
            const gradientImage = source as CSSRadialGradientImage;
            const position = gradientImage.position.length === 0 ? [FIFTY_PERCENT] : gradientImage.position;
            const cx = getAbsoluteValue(at(position, 0), width);
            const cy = getAbsoluteValue(at(position, position.length - 1), height);
            const [rx, ry] = calculateRadius(gradientImage, cx, cy, width, height);
            if (rx <= 0 || ry <= 0) {
                return null;
            }
            const ownerDocument = this.ctx.canvas.ownerDocument ?? document;
            const rasterized = rasterizeRadialGradient(
                ownerDocument,
                rx,
                ry,
                gradientImage.stops,
                source.type === CSSImageType.REPEATING_RADIAL_GRADIENT
            );
            if (!rasterized) {
                return null;
            }
            // Outside the ending shape the gradient continues with its last
            // colour, so cover the whole border-image box before drawing the
            // ellipse (drawn at its 2rx × 2ry device box around the centre).
            ctx.fillStyle = rasterized.lastColor;
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(rasterized.canvas, cx - rx, cy - ry, rx * 2, ry * 2);
            return canvas;
        }
        if (source.type === CSSImageType.CONIC_GRADIENT || source.type === CSSImageType.REPEATING_CONIC_GRADIENT) {
            const gradientImage = source as CSSConicGradientImage;
            // Canvas conic gradients measure angles from the positive x-axis
            // clockwise; CSS conic gradients start at the 12 o'clock position.
            const cx = getAbsoluteValue(at(gradientImage.position, 0), width);
            const cy = getAbsoluteValue(at(gradientImage.position, 1), height);
            const gradient = ctx.createConicGradient(gradientImage.angle - Math.PI / 2, cx, cy);
            let stops: Array<{ stop: number; color: string }>;
            if (source.type === CSSImageType.REPEATING_CONIC_GRADIENT) {
                // Stack the one-cycle stop list periodically across the full
                // sweep; the band covering the end extends flat to 1.
                const processed = processColorStops(gradientImage.stops, 1);
                const first = at(processed, 0);
                const last = at(processed, processed.length - 1);
                const period = Math.max(last.stop - first.stop, 0.01);
                stops = [];
                const cycles = Math.ceil(1 / period);
                for (let k = 0; k < cycles; k++) {
                    for (const s of processed) {
                        const stop = k * period + (s.stop - first.stop);
                        if (stop > 1) break;
                        stops.push({ stop, color: asString(s.color) });
                    }
                }
                const lastIncluded = at(stops, stops.length - 1);
                if (lastIncluded && lastIncluded.stop < 1) {
                    stops.push({ stop: 1, color: lastIncluded.color });
                }
            } else {
                stops = processColorStops(gradientImage.stops, Math.max(width, height)).map((colorStop) => ({
                    stop: colorStop.stop,
                    color: asString(colorStop.color)
                }));
            }
            stops.forEach((s) => {
                gradient.addColorStop(Math.min(1, Math.max(0, s.stop)), s.color);
            });
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            return canvas;
        }
        this.context.logger.warn('Unsupported border-image source; only URL and gradient images are supported');
        return null;
    }

    /**
     * Filter the already-painted content beneath the element's border box and
     * paint the result back, approximating CSS backdrop-filter for the
     * blur/drop-shadow subset supported by parseSimpleFilter.
     */
    private async renderBackdropFilter(paint: ElementPaint): Promise<void> {
        const filter = parseSimpleFilter(paint.container.styles.backdropFilter);
        if (!filter || (!filter.blur && !filter.shadow)) {
            return; // unsupported or empty chain
        }
        const bounds = paint.container.bounds;
        if (bounds.width <= 0 || bounds.height <= 0) {
            return;
        }
        const scale = this.options.scale;
        const width = Math.ceil(bounds.width * scale);
        const height = Math.ceil(bounds.height * scale);
        if (width <= 0 || height <= 0) {
            return;
        }
        const reserved = reserveSurface(this.surfaceBudget, width, height);
        if (!reserved) {
            return; // budget exhausted: render without the backdrop effect
        }
        let source: HTMLCanvasElement | undefined;
        let filtered: HTMLCanvasElement | undefined;
        try {
            source = this.context.resourceDocument.createElement('canvas');
            source.width = width;
            source.height = height;
            const srcCtx = source.getContext('2d');
            if (!srcCtx) {
                return;
            }
            // Canvas device pixel (0,0) corresponds to CSS (options.x, options.y).
            const sx = Math.round((bounds.left - this.options.x) * scale);
            const sy = Math.round((bounds.top - this.options.y) * scale);
            srcCtx.drawImage(this.canvas, sx, sy, width, height, 0, 0, width, height);
            filtered = await renderFilterSurface(source, filter, 1, scale, this.options.signal);
            if (this.options.signal?.aborted) {
                throw new DOMException('The operation was aborted.', 'AbortError');
            }
            this.ctx.save();
            try {
                // An enclosing filter effect must not re-filter the compositing.
                this.ctx.filter = 'none';
                this.ctx.drawImage(filtered, bounds.left, bounds.top, bounds.width, bounds.height);
            } finally {
                this.ctx.restore();
            }
        } finally {
            if (source) releaseSurface(source);
            if (filtered) releaseSurface(filtered);
            this.surfaceBudget.pixels -= reserved;
        }
    }

    async render(element: ElementContainer): Promise<HTMLCanvasElement> {
        try {
            if (this.options.backgroundColor) {
                this.ctx.fillStyle = asString(this.options.backgroundColor);
                this.ctx.fillRect(this.options.x, this.options.y, this.options.width, this.options.height);
            }

            const stack = parseStackingContexts(element);

            await this.renderStack(stack);
            this.effectsRenderer.applyEffects([]);
            return this.canvas;
        } catch (error) {
            // Failed captures have no returned canvas. Release only our backing
            // store; a canvas supplied by the caller remains caller-owned.
            if (!this.options.canvas) releaseSurface(this.canvas);
            throw error;
        }
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

/**
 * Check if any background layer uses background-clip: text
 */
const hasTextBackgroundClip = (styles: CSSParsedDeclaration): boolean => {
    return styles.backgroundClip.some((clip) => clip === BACKGROUND_CLIP.TEXT);
};
