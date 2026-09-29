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
 * The offscreen canvas uses CSS-pixel dimensions (not device-pixel) because the
 * background renderer handles scaling internally via BackgroundRenderer options.
 */

import { ElementPaint } from '../stacking-context';
import { CSSParsedDeclaration } from '../../css';
import { asString, isTransparent } from '../../css/types/color-utilities';
import { DIRECTION } from '../../css/property-descriptors/direction';
import { isVerticalWritingMode, WRITING_MODE } from '../../css/property-descriptors/writing-mode';
import { segmentGraphemes, TextBounds } from '../../css/layout/text';
import { Context } from '../../core/context';
import { BackgroundRenderer } from './background-renderer';
import { measureBaseline } from './font-utils';

export interface TextClipRendererDependencies {
    /** Main canvas context the clipped background is composited onto. */
    ctx: CanvasRenderingContext2D;
    context: Context;
    /** Font builder shared with the text renderer so both use identical fonts. */
    createFontStyle: (styles: CSSParsedDeclaration) => string[];
}

export class TextClipRenderer {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly context: Context;
    private readonly createFontStyle: (styles: CSSParsedDeclaration) => string[];

    constructor(deps: TextClipRendererDependencies) {
        this.ctx = deps.ctx;
        this.context = deps.context;
        this.createFontStyle = deps.createFontStyle;
    }

    async render(paint: ElementPaint): Promise<void> {
        const container = paint.container;
        const styles = container.styles;
        const bounds = container.bounds;

        if (bounds.width <= 0 || bounds.height <= 0) {
            return;
        }

        const ownerDocument = this.ctx.canvas.ownerDocument ?? document;
        const offscreen = ownerDocument.createElement('canvas');
        const width = Math.ceil(bounds.width);
        const height = Math.ceil(bounds.height);
        offscreen.width = width;
        offscreen.height = height;

        const offCtx = offscreen.getContext('2d');
        if (!offCtx) {
            return;
        }

        // ── Set up font matching the main context ──
        const [fontString] = this.createFontStyle(styles);
        offCtx.font = fontString ?? '';
        offCtx.textBaseline = 'alphabetic';
        offCtx.textAlign = 'left';
        offCtx.direction = styles.direction === DIRECTION.RTL ? 'rtl' : 'ltr';

        // Measure baseline from the actual rendered font
        const baseline = measureBaseline(offCtx, styles.fontSize.number);

        // ── Draw background onto offscreen canvas ──
        const bgRenderer = new BackgroundRenderer({
            ctx: offCtx,
            context: this.context,
            canvas: offscreen,
            options: { width, height, scale: 1 }
        });

        if (!isTransparent(styles.backgroundColor)) {
            offCtx.fillStyle = asString(styles.backgroundColor);
            offCtx.fillRect(0, 0, width, height);
        }

        // Background images are positioned relative to the element bounds,
        // so we need the BackgroundRenderer to compute offsets in the same
        // coordinate space as the main renderer.  We do that by translating
        // the offscreen context so that the element origin (bounds.left, bounds.top)
        // falls at (0, 0).
        offCtx.save();
        offCtx.translate(-bounds.left, -bounds.top);
        await bgRenderer.renderBackgroundImage(container);
        offCtx.restore();

        // ── Clip background to text glyphs ──
        // destination-in: keep background pixels only where the source (text) is non-transparent.
        offCtx.globalCompositeOperation = 'destination-in';
        offCtx.fillStyle = '#000';

        const writingMode = styles.writingMode;
        const letterSpacing = styles.letterSpacing;

        for (const textNode of container.textNodes) {
            for (const textBound of textNode.textBounds) {
                // Offset from element bounds to canvas-local coordinates
                const localLeft = textBound.bounds.left - bounds.left;
                const localTop = textBound.bounds.top - bounds.top + baseline;

                if (letterSpacing > 0) {
                    this.renderTextMaskWithLetterSpacing(
                        offCtx,
                        textBound,
                        letterSpacing,
                        localLeft,
                        localTop,
                        writingMode
                    );
                } else {
                    offCtx.fillText(textBound.text, localLeft, localTop);
                }
            }
        }

        // ── Composite back to main canvas ──
        this.ctx.drawImage(offscreen, bounds.left, bounds.top);
    }

    /**
     * Render text glyphs one-by-one as a mask, applying letter-spacing between characters.
     * This ensures the mask matches how the text renderer lays out the characters.
     */
    private renderTextMaskWithLetterSpacing(
        ctx: CanvasRenderingContext2D,
        text: TextBounds,
        letterSpacing: number,
        x: number,
        y: number,
        writingMode: WRITING_MODE
    ): void {
        const letters = segmentGraphemes(text.text);
        let offset = x;

        for (const letter of letters) {
            if (isVerticalWritingMode(writingMode)) {
                // Vertical writing mode: not yet supported for text-clip;
                // fall back to single fillText call.
                ctx.fillText(text.text, x, y);
                return;
            }

            ctx.fillText(letter, offset, y);
            offset += ctx.measureText(letter).width + letterSpacing;
        }
    }
}
