/**
 * Text Clip Renderer
 *
 * Implements `background-clip: text` — paints the element's background
 * (color + images) to an offscreen canvas and clips it to the text glyph
 * shapes with destination-in compositing, then composites the result back
 * onto the main canvas.
 *
 * Extracted from CanvasRenderer to keep paint orchestration separate from
 * this self-contained compositing algorithm.
 *
 * The offscreen and mask canvases are backed at device-pixel resolution
 * (bounds × scale) with their contexts scaled to CSS pixels, so the
 * composite back onto the main canvas maps 1:1 onto the backing store and
 * stays sharp at devicePixelRatio > 1.
 *
 * Matching browser paint order for clipped text:
 * - text shadows render *beneath* the clipped background (silhouettes in
 *   the shadow colour), they are not part of the clip region;
 * - -webkit-text-stroke is part of the clip region (fill ∪ stroke band).
 */

import { ElementPaint } from '../stacking-context';
import { CSSParsedDeclaration } from '../../css';
import { asString, isTransparent } from '../../css/types/color-utilities';
import { DIRECTION } from '../../css/property-descriptors/direction';
import { isVerticalWritingMode, WRITING_MODE } from '../../css/property-descriptors/writing-mode';
import { segmentGraphemes, TextBounds } from '../../css/layout/text';
import { Context } from '../../core/context';
import { Bounds } from '../../css/layout/bounds';
import { at } from '../../core/util';
import { BackgroundRenderer } from './background-renderer';
import { measureBaseline } from './font-utils';
import { TextShadow } from '../../css/property-descriptors/text-shadow';

export interface TextClipRendererDependencies {
    /** Main canvas context the clipped background is composited onto. */
    ctx: CanvasRenderingContext2D;
    context: Context;
    /** Device-pixel ratio shared with the main renderer. */
    scale: number;
    /** Font builder shared with the text renderer so both use identical fonts. */
    createFontStyle: (styles: CSSParsedDeclaration) => string[];
}

interface GlyphLayer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
}

interface GlyphDrawOptions {
    bounds: Bounds;
    baseline: number;
    letterSpacing: number;
    writingMode: WRITING_MODE;
}

type GlyphDraw = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number) => void;

export class TextClipRenderer {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly context: Context;
    private readonly scale: number;
    private readonly createFontStyle: (styles: CSSParsedDeclaration) => string[];

    constructor(deps: TextClipRendererDependencies) {
        this.ctx = deps.ctx;
        this.context = deps.context;
        this.scale = deps.scale;
        this.createFontStyle = deps.createFontStyle;
    }

    async render(paint: ElementPaint): Promise<void> {
        const container = paint.container;
        const styles = container.styles;
        const bounds = container.bounds;
        const scale = this.scale;

        if (bounds.width <= 0 || bounds.height <= 0) {
            return;
        }

        const ownerDocument = this.ctx.canvas.ownerDocument ?? document;
        const width = Math.ceil(bounds.width);
        const height = Math.ceil(bounds.height);
        const deviceWidth = Math.ceil(bounds.width * scale);
        const deviceHeight = Math.ceil(bounds.height * scale);

        // ── Draw background onto an offscreen canvas ──
        const offscreen = this.createLayer(ownerDocument, deviceWidth, deviceHeight);
        if (!offscreen) {
            return;
        }
        offscreen.ctx.scale(scale, scale);

        const [fontString] = this.createFontStyle(styles);
        offscreen.ctx.font = fontString ?? '';
        offscreen.ctx.textBaseline = 'alphabetic';
        offscreen.ctx.textAlign = 'left';
        offscreen.ctx.direction = styles.direction === DIRECTION.RTL ? 'rtl' : 'ltr';

        // Measure baseline from the actual rendered font
        const baseline = measureBaseline(offscreen.ctx, styles.fontSize.number);

        const bgRenderer = new BackgroundRenderer({
            ctx: offscreen.ctx,
            context: this.context,
            canvas: offscreen.canvas,
            // The context is pre-scaled to CSS pixels, so the background
            // renderer works in the same coordinate space as the main canvas.
            options: { width, height, scale: 1 }
        });

        if (!isTransparent(styles.backgroundColor)) {
            offscreen.ctx.fillStyle = asString(styles.backgroundColor);
            offscreen.ctx.fillRect(0, 0, width, height);
        }

        // Background images are positioned relative to the element bounds,
        // so we need the BackgroundRenderer to compute offsets in the same
        // coordinate space as the main renderer.  We do that by translating
        // the offscreen context so that the element origin (bounds.left, bounds.top)
        // falls at (0, 0).
        offscreen.ctx.save();
        offscreen.ctx.translate(-bounds.left, -bounds.top);
        await bgRenderer.renderBackgroundImage(container);
        offscreen.ctx.restore();

        const drawOptions: GlyphDrawOptions = {
            bounds,
            baseline,
            letterSpacing: styles.letterSpacing,
            writingMode: styles.writingMode
        };

        // ── Clip the background to the glyph shapes ──
        // Glyphs accumulate on a separate mask canvas with normal compositing:
        // a per-fragment destination-in pass keeps only pixels covered by the
        // current fragment, so fragments (graphemes with letter-spacing, words
        // around punctuation) would erase each other. One destination-in pass
        // against the combined mask keeps the background wherever any glyph
        // painted. -webkit-text-stroke widens the clip region to the stroke
        // band, matching how WebKit clips to stroked glyphs.
        const mask = this.createGlyphLayer(ownerDocument, deviceWidth, deviceHeight, offscreen.ctx);
        if (!mask) {
            return;
        }
        const hasStroke = !!styles.webkitTextStrokeWidth;
        if (hasStroke) {
            mask.ctx.strokeStyle = asString(styles.webkitTextStrokeColor);
            mask.ctx.lineWidth = styles.webkitTextStrokeWidth;
            mask.ctx.lineJoin = this.getTextStrokeLineJoin();
        }
        for (const textNode of container.textNodes) {
            for (const textBound of textNode.textBounds) {
                this.drawGlyphs(mask, textBound, drawOptions, (ctx, text, x, y) => {
                    ctx.fillText(text, x, y);
                    if (hasStroke) {
                        ctx.strokeText(text, x, y);
                    }
                });
            }
        }

        offscreen.ctx.globalCompositeOperation = 'destination-in';
        offscreen.ctx.drawImage(mask.canvas, 0, 0, deviceWidth, deviceHeight);

        // ── Composite to the main canvas ──
        // Text shadows paint beneath the clipped background in browsers, so
        // they are rendered on their own canvas and layered under it. The
        // main context is scaled to CSS pixels — drawImage at CSS size maps
        // the device-pixel surfaces onto the backing store 1:1.
        const shadowCanvas = this.renderShadowSilhouettes(
            paint,
            ownerDocument,
            deviceWidth,
            deviceHeight,
            offscreen.ctx,
            styles,
            drawOptions
        );

        if (shadowCanvas) {
            const composite = this.createLayer(ownerDocument, deviceWidth, deviceHeight);
            if (!composite) {
                return;
            }
            composite.ctx.drawImage(shadowCanvas, 0, 0);
            composite.ctx.drawImage(offscreen.canvas, 0, 0);
            this.ctx.drawImage(composite.canvas, bounds.left, bounds.top, bounds.width, bounds.height);
        } else {
            this.ctx.drawImage(offscreen.canvas, bounds.left, bounds.top, bounds.width, bounds.height);
        }
    }

    private createLayer(ownerDocument: Document, width: number, height: number): GlyphLayer | null {
        const canvas = ownerDocument.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return null;
        }
        return { canvas, ctx };
    }

    private createGlyphLayer(
        ownerDocument: Document,
        width: number,
        height: number,
        fontSource: CanvasRenderingContext2D
    ): GlyphLayer | null {
        const layer = this.createLayer(ownerDocument, width, height);
        if (!layer) {
            return null;
        }
        layer.ctx.scale(this.scale, this.scale);
        layer.ctx.font = fontSource.font;
        layer.ctx.textBaseline = fontSource.textBaseline;
        layer.ctx.textAlign = fontSource.textAlign;
        layer.ctx.direction = fontSource.direction;
        layer.ctx.fillStyle = '#000';
        return layer;
    }

    /**
     * Draw one text bound onto a glyph layer, splitting into per-glyph draws
     * when letter-spacing is in effect so the layout matches the main text
     * renderer. Vertical writing modes fall back to a single draw call.
     */
    private drawGlyphs(layer: GlyphLayer, textBound: TextBounds, drawOptions: GlyphDrawOptions, draw: GlyphDraw): void {
        // Offset from element bounds to canvas-local coordinates
        const x = textBound.bounds.left - drawOptions.bounds.left;
        const y = textBound.bounds.top - drawOptions.bounds.top + drawOptions.baseline;
        const { letterSpacing, writingMode } = drawOptions;

        if (letterSpacing <= 0) {
            draw(layer.ctx, textBound.text, x, y);
            return;
        }

        if (isVerticalWritingMode(writingMode)) {
            // Vertical writing mode: not yet supported for text-clip;
            // fall back to a single draw call.
            draw(layer.ctx, textBound.text, x, y);
            return;
        }

        let offset = x;
        for (const letter of segmentGraphemes(textBound.text)) {
            draw(layer.ctx, letter, offset, y);
            offset += layer.ctx.measureText(letter).width + letterSpacing;
        }
    }

    /**
     * Paint the text-shadow silhouettes for every glyph onto a dedicated
     * canvas, in browser order (the last shadow sits deepest). Returns null
     * when the element has no text shadows.
     */
    private renderShadowSilhouettes(
        paint: ElementPaint,
        ownerDocument: Document,
        deviceWidth: number,
        deviceHeight: number,
        fontSource: CanvasRenderingContext2D,
        styles: CSSParsedDeclaration,
        drawOptions: GlyphDrawOptions
    ): HTMLCanvasElement | null {
        const textShadows: TextShadow = styles.textShadow;
        if (!textShadows.length) {
            return null;
        }

        const layer = this.createGlyphLayer(ownerDocument, deviceWidth, deviceHeight, fontSource);
        if (!layer) {
            return null;
        }

        // The canvas shadow* properties cast the blurred silhouette in the
        // shadow colour; the source glyph is painted in the same colour and
        // ends up covered by the clipped background composited on top.
        // Shadow offsets are in device pixels (unaffected by the context
        // transform), matching the main text renderer.
        for (let i = textShadows.length - 1; i >= 0; i--) {
            const textShadow = at(textShadows, i);
            layer.ctx.shadowColor = asString(textShadow.color);
            layer.ctx.shadowOffsetX = textShadow.offsetX.number * this.scale;
            layer.ctx.shadowOffsetY = textShadow.offsetY.number * this.scale;
            layer.ctx.shadowBlur = textShadow.blur.number;
            layer.ctx.fillStyle = asString(textShadow.color);
            for (const textNode of paint.container.textNodes) {
                for (const textBound of textNode.textBounds) {
                    this.drawGlyphs(layer, textBound, drawOptions, (ctx, text, x, y) => {
                        ctx.fillText(text, x, y);
                    });
                }
            }
        }

        return layer.canvas;
    }

    private getTextStrokeLineJoin(): CanvasLineJoin {
        const currentWindow = typeof window !== 'undefined' ? (window as Window & { chrome?: unknown }) : undefined;
        return currentWindow?.chrome ? 'miter' : 'round';
    }
}
