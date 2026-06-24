/**
 * Text Renderer
 *
 * Handles rendering of text content including:
 * - Text with letter spacing
 * - Text decorations (underline, overline, line-through)
 * - Text shadows
 * - Webkit line clamp
 * - Text overflow ellipsis
 * - Paint order (fill/stroke)
 * - Font styles
 */

import { Context } from '../../core/context';
import { TextContainer } from '../../dom/text-container';
import { CSSParsedDeclaration } from '../../css';
import { Bounds } from '../../css/layout/bounds';
import { TextBounds, segmentGraphemes } from '../../css/layout/text';
import { asString } from '../../css/types/color-utilities';
import { PAINT_ORDER_LAYER } from '../../css/property-descriptors/paint-order';
import { DIRECTION } from '../../css/property-descriptors/direction';
import { DISPLAY } from '../../css/property-descriptors/display';
import { TEXT_OVERFLOW } from '../../css/property-descriptors/text-overflow';
import { OVERFLOW } from '../../css/property-descriptors/overflow';
import { isDimensionToken } from '../../css/syntax/parser';
import { TextShadow } from '../../css/property-descriptors/text-shadow';
import {
    isSidewaysWritingMode,
    isVerticalWritingMode,
    WRITING_MODE
} from '../../css/property-descriptors/writing-mode';
import { TextDecorationRenderer } from './text/text-decoration-renderer';

/**
 * Dependencies required for TextRenderer
 */
export interface TextRendererDependencies {
    ctx: CanvasRenderingContext2D;
    context: Context;
    options: {
        scale: number;
    };
}

// iOS font fix - see https://github.com/niklasvh/html2canvas/pull/2645
const iOSBrokenFonts = ['-apple-system', 'system-ui'];

/**
 * Detect CJK (Chinese, Japanese, Korean) characters in a string.
 * CJK characters use the ideographic baseline in browsers, which differs
 * from the alphabetic baseline used for Latin script.
 *
 * Covers:
 *   U+2E80–U+2FFF  CJK Radicals Supplement, Kangxi Radicals
 *   U+3000–U+30FF  CJK Symbols & Punctuation (。、「」…), Hiragana, Katakana
 *   U+3400–U+4DBF  CJK Extension A
 *   U+4E00–U+9FFF  CJK Unified Ideographs (most common Chinese/Japanese/Korean)
 *   U+AC00–U+D7AF  Hangul Syllables
 *   U+F900–U+FAFF  CJK Compatibility Ideographs
 *   U+FF01–U+FFEF  Halfwidth and Fullwidth Forms (Ａ Ｂ １ ２ ！ ？ etc.)
 */
const CJK_CHAR_REGEX = /[\u2E80-\u2FFF\u3000-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF01-\uFFEF]/;

export const hasCJKCharacters = (text: string): boolean => CJK_CHAR_REGEX.test(text);

/**
 * Detect iOS version from user agent
 * Returns null if not iOS or version cannot be determined
 */
const getIOSVersion = (): number | null => {
    if (typeof navigator === 'undefined') {
        return null;
    }

    const userAgent = navigator.userAgent;

    // Check if it's iOS or iPadOS
    // iPadOS 13+ may identify as Macintosh, check for touch support
    const isIOS = /iPhone|iPad|iPod/.test(userAgent);
    const isIPadOS = /Macintosh/.test(userAgent) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1;

    if (!isIOS && !isIPadOS) {
        return null;
    }

    // Extract version number from various iOS user agent formats:
    // - "iPhone OS 15_0" or "iPhone OS 15_0_1"
    // - "CPU OS 15_0 like Mac OS X"
    // - "CPU iPhone OS 15_0 like Mac OS X"
    // - "Version/15.0" (for iPadOS)
    const patterns = [
        /(?:iPhone|CPU(?:\siPhone)?)\sOS\s(\d+)[\._](\d+)/, // iPhone OS, CPU OS, CPU iPhone OS
        /Version\/(\d+)\.(\d+)/ // Version/15.0 (iPadOS)
    ];

    for (const pattern of patterns) {
        const match = userAgent.match(pattern);
        if (match && match[1]) {
            return parseInt(match[1], 10);
        }
    }

    return null;
};

const fixIOSSystemFonts = (fontFamilies: string[]): string[] => {
    const iosVersion = getIOSVersion();

    // On iOS 15.0 and 15.1, system fonts have rendering issues
    // Fixed in iOS 17+
    if (iosVersion !== null && iosVersion >= 15 && iosVersion < 17) {
        return fontFamilies.map((fontFamily) =>
            iOSBrokenFonts.indexOf(fontFamily) !== -1
                ? `-apple-system, "Helvetica Neue", Arial, sans-serif`
                : fontFamily
        );
    }

    return fontFamilies;
};

const getTextStrokeLineJoin = (): CanvasLineJoin => {
    const currentWindow = typeof window !== 'undefined' ? (window as Window & { chrome?: unknown }) : undefined;
    return currentWindow?.chrome ? 'miter' : 'round';
};

/**
 * Text Renderer
 *
 * Specialized renderer for text content.
 * Extracted from CanvasRenderer to improve code organization and maintainability.
 */
export class TextRenderer {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly options: { scale: number };
    private readonly decorationRenderer: TextDecorationRenderer;

    constructor(deps: TextRendererDependencies) {
        this.ctx = deps.ctx;
        this.options = deps.options;
        this.decorationRenderer = new TextDecorationRenderer(deps.ctx);
    }

    /**
     * Iterate grapheme clusters one-by-one, applying correct letter-spacing and
     * per-script baseline for each character.
     *
     * Issue #73: When letter-spacing is non-zero, text must be rendered character by
     * character. This helper centralises two fixes applied during that iteration:
     *   1. Add `letterSpacing` to each character's advance width (was previously
     *      omitted, causing characters to render without any spacing).
     *   2. Switch to the ideographic baseline for CJK glyphs so their vertical
     *      position matches how browsers lay them out in the DOM.
     *
     * The `renderFn` callback receives (letter, x, y) and performs the actual draw
     * call (fillText or strokeText), allowing fill and stroke paths to share one
     * implementation.
     */
    private iterateLettersWithLetterSpacing(
        text: TextBounds,
        letterSpacing: number,
        baseline: number,
        writingMode: WRITING_MODE,
        renderFn: (letter: string, x: number, y: number) => void
    ): void {
        if (isVerticalWritingMode(writingMode)) {
            this.iterateVerticalGlyphs(text, letterSpacing, baseline, writingMode, renderFn);
            return;
        }

        const letters = segmentGraphemes(text.text);
        const y = text.bounds.top + baseline;
        let left = text.bounds.left;
        for (const letter of letters) {
            if (hasCJKCharacters(letter)) {
                const savedBaseline = this.ctx.textBaseline;
                this.ctx.textBaseline = 'ideographic';
                renderFn(letter, left, y);
                this.ctx.textBaseline = savedBaseline;
            } else {
                renderFn(letter, left, y);
            }
            left += this.ctx.measureText(letter).width + letterSpacing;
        }
    }

    private iterateVerticalGlyphs(
        text: TextBounds,
        letterSpacing: number,
        baseline: number,
        writingMode: WRITING_MODE,
        renderFn: (letter: string, x: number, y: number) => void
    ): void {
        const letters = segmentGraphemes(text.text);
        let top = text.bounds.top;

        for (const letter of letters) {
            if (isSidewaysWritingMode(writingMode) || (!hasCJKCharacters(letter) && letter.trim().length > 0)) {
                this.ctx.save();
                this.ctx.translate(text.bounds.left + baseline, top);
                this.ctx.rotate(writingMode === WRITING_MODE.SIDEWAYS_LR ? -Math.PI / 2 : Math.PI / 2);
                renderFn(letter, 0, 0);
                this.ctx.restore();
            } else {
                const savedBaseline = this.ctx.textBaseline;
                if (hasCJKCharacters(letter)) {
                    this.ctx.textBaseline = 'ideographic';
                }
                renderFn(letter, text.bounds.left, top + baseline);
                this.ctx.textBaseline = savedBaseline;
            }
            top += this.ctx.measureText(letter).width + letterSpacing;
        }
    }

    /**
     * Render text with letter-spacing applied (fill pass).
     * When letterSpacing is 0 the whole string is drawn in one call; otherwise each
     * grapheme is drawn individually so spacing and CJK baseline are applied correctly.
     */
    renderTextWithLetterSpacing(
        text: TextBounds,
        letterSpacing: number,
        baseline: number,
        writingMode: WRITING_MODE = WRITING_MODE.HORIZONTAL_TB
    ): void {
        this.renderFillText(text, letterSpacing, baseline, writingMode);
    }

    private canRenderWholeText(letterSpacing: number, writingMode: WRITING_MODE): boolean {
        return letterSpacing === 0 && !isVerticalWritingMode(writingMode);
    }

    private renderFillText(text: TextBounds, letterSpacing: number, baseline: number, writingMode: WRITING_MODE): void {
        if (this.canRenderWholeText(letterSpacing, writingMode)) {
            this.ctx.fillText(text.text, text.bounds.left, text.bounds.top + baseline);
        } else {
            this.iterateLettersWithLetterSpacing(text, letterSpacing, baseline, writingMode, (letter, x, y) => {
                this.ctx.fillText(letter, x, y);
            });
        }
    }

    private renderStrokeText(
        text: TextBounds,
        letterSpacing: number,
        baseline: number,
        writingMode: WRITING_MODE
    ): void {
        if (this.canRenderWholeText(letterSpacing, writingMode)) {
            this.ctx.strokeText(text.text, text.bounds.left, text.bounds.top + baseline);
        } else {
            this.iterateLettersWithLetterSpacing(text, letterSpacing, baseline, writingMode, (letter, x, y) => {
                this.ctx.strokeText(letter, x, y);
            });
        }
    }

    private renderTextStrokeWithStyle(text: TextBounds, styles: CSSParsedDeclaration): void {
        if (!styles.webkitTextStrokeWidth || !text.text.trim().length) {
            return;
        }

        this.ctx.strokeStyle = asString(styles.webkitTextStrokeColor);
        this.ctx.lineWidth = styles.webkitTextStrokeWidth;
        this.ctx.lineJoin = getTextStrokeLineJoin();
        this.renderStrokeText(text, styles.letterSpacing, styles.fontSize.number, styles.writingMode);
        this.ctx.strokeStyle = '';
        this.ctx.lineWidth = 0;
        this.ctx.lineJoin = 'miter';
    }

    private renderTextFillWithShadows(text: TextBounds, styles: CSSParsedDeclaration): void {
        this.ctx.fillStyle = asString(styles.color);
        this.renderTextWithLetterSpacing(text, styles.letterSpacing, styles.fontSize.number, styles.writingMode);

        const textShadows: TextShadow = styles.textShadow;
        if (textShadows.length && text.text.trim().length) {
            textShadows
                .slice(0)
                .reverse()
                .forEach((textShadow) => {
                    this.ctx.shadowColor = asString(textShadow.color);
                    this.ctx.shadowOffsetX = textShadow.offsetX.number * this.options.scale;
                    this.ctx.shadowOffsetY = textShadow.offsetY.number * this.options.scale;
                    this.ctx.shadowBlur = textShadow.blur.number;

                    this.renderTextWithLetterSpacing(
                        text,
                        styles.letterSpacing,
                        styles.fontSize.number,
                        styles.writingMode
                    );
                });

            this.ctx.shadowColor = '';
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
            this.ctx.shadowBlur = 0;
        }
    }

    /**
     * Helper method to render text with paint order support
     * Reduces code duplication in line-clamp and normal rendering
     */
    private renderTextBoundWithPaintOrder(
        textBound: TextBounds,
        styles: CSSParsedDeclaration,
        paintOrderLayers: number[]
    ): void {
        paintOrderLayers.forEach((paintOrderLayer: number) => {
            switch (paintOrderLayer) {
                case PAINT_ORDER_LAYER.FILL:
                    this.ctx.fillStyle = asString(styles.color);
                    this.renderTextWithLetterSpacing(
                        textBound,
                        styles.letterSpacing,
                        styles.fontSize.number,
                        styles.writingMode
                    );
                    break;
                case PAINT_ORDER_LAYER.STROKE:
                    this.renderTextStrokeWithStyle(textBound, styles);
                    break;
            }
        });
    }

    private renderTextDecoration(bounds: Bounds, styles: CSSParsedDeclaration): void {
        this.decorationRenderer.render(bounds, styles);
    }

    // Helper method to truncate text and add ellipsis if needed
    private truncateTextWithEllipsis(text: string, maxWidth: number, letterSpacing: number): string {
        // Use the Unicode ellipsis character (U+2026) whose width the browser measures
        // as a single glyph, matching native text-overflow behaviour more closely.
        const ellipsis = '\u2026';
        const ellipsisWidth = this.ctx.measureText(ellipsis).width;
        // Segment into grapheme clusters so multi-byte characters (emoji, composed
        // sequences) are never split mid-character.
        const graphemes = segmentGraphemes(text);

        if (letterSpacing === 0) {
            // Measure the whole candidate string for accuracy: the browser applies
            // kerning and ligatures when rendering multiple glyphs together, so
            // measuring them as one string is more precise than summing individual widths.
            // Binary search reduces measurements from O(n) to O(log n).
            const fits = (n: number) =>
                this.ctx.measureText(graphemes.slice(0, n).join('')).width + ellipsisWidth <= maxWidth;
            let lo = 0;
            let hi = graphemes.length;
            while (lo < hi) {
                const mid = (lo + hi + 1) >> 1;
                if (fits(mid)) {
                    lo = mid;
                } else {
                    hi = mid - 1;
                }
            }
            return graphemes.slice(0, lo).join('') + ellipsis;
        } else {
            let width = ellipsisWidth;
            const result: string[] = [];

            for (const letter of graphemes) {
                const glyphWidth = this.ctx.measureText(letter).width;
                // Check against glyph width only (no trailing spacing): letter-spacing
                // is applied *between* characters, not after the final glyph. Using
                // `glyphWidth + letterSpacing` would incorrectly discard letters that
                // fit as the last character before the ellipsis.
                if (width + glyphWidth > maxWidth) {
                    break;
                }
                result.push(letter);
                // Accumulate glyph + inter-character spacing for the *next* iteration.
                width += glyphWidth + letterSpacing;
            }

            return result.join('') + ellipsis;
        }
    }

    /**
     * Create font style array
     * Public method used by list rendering
     */
    createFontStyle(styles: CSSParsedDeclaration): string[] {
        const fontVariant = styles.fontVariant
            .filter((variant) => variant === 'normal' || variant === 'small-caps')
            .join('');
        const fontFamily = fixIOSSystemFonts(styles.fontFamily).join(', ');
        const fontSize = isDimensionToken(styles.fontSize)
            ? `${styles.fontSize.number}${styles.fontSize.unit}`
            : `${styles.fontSize.number}px`;

        return [
            [styles.fontStyle, fontVariant, styles.fontWeight, fontSize, fontFamily].join(' '),
            fontFamily,
            fontSize
        ];
    }

    /**
     * Render text with -webkit-line-clamp truncation.
     * Groups text bounds by their Y position into visual lines, then renders
     * only the first N-1 complete lines followed by an ellipsis on the Nth line.
     */
    private renderLineClampedText(
        text: TextContainer,
        styles: CSSParsedDeclaration,
        paintOrder: number[],
        containerBounds?: Bounds
    ): boolean {
        const lineHeight = styles.fontSize.number * 1.5;
        const lines: TextBounds[][] = [];
        let currentLine: TextBounds[] = [];
        let currentLineTop = text.textBounds[0].bounds.top;

        text.textBounds.forEach((tb) => {
            if (Math.abs(tb.bounds.top - currentLineTop) >= lineHeight * 0.5) {
                if (currentLine.length > 0) lines.push(currentLine);
                currentLine = [tb];
                currentLineTop = tb.bounds.top;
            } else {
                currentLine.push(tb);
            }
        });
        if (currentLine.length > 0) lines.push(currentLine);

        const maxLines = styles.webkitLineClamp;
        if (lines.length <= maxLines) return false; // fall through to normal rendering

        // Render full lines (0..N-2)
        for (let i = 0; i < maxLines - 1; i++) {
            lines[i].forEach((tb) => this.renderTextBoundWithPaintOrder(tb, styles, paintOrder));
        }

        // Nth line: truncated with ellipsis
        const lastLine = lines[maxLines - 1];
        if (lastLine?.length && containerBounds) {
            const textStr = lastLine.map((tb) => tb.text).join('');
            const first = lastLine[0];
            const avail = containerBounds.width - (first.bounds.left - containerBounds.left);
            const truncated = this.truncateTextWithEllipsis(textStr, avail, styles.letterSpacing);
            const bounds = new TextBounds(truncated, first.bounds);
            for (const layer of paintOrder) {
                if (layer === PAINT_ORDER_LAYER.FILL) {
                    this.ctx.fillStyle = asString(styles.color);
                    this.renderTextWithLetterSpacing(
                        bounds,
                        styles.letterSpacing,
                        styles.fontSize.number,
                        styles.writingMode
                    );
                } else if (layer === PAINT_ORDER_LAYER.STROKE) {
                    this.renderTextStrokeWithStyle(bounds, styles);
                }
            }
        }
        return true;
    }

    /**
     * Render single-line text with text-overflow: ellipsis.
     * Returns true if ellipsis was applied (caller should skip normal rendering).
     */
    private renderEllipsisText(
        text: TextContainer,
        styles: CSSParsedDeclaration,
        paintOrder: number[],
        containerBounds: Bounds
    ): boolean {
        const lineHeight = styles.fontSize.number * 1.5;
        const firstTop = text.textBounds[0].bounds.top;
        const isSingleLine = text.textBounds.every((tb) => Math.abs(tb.bounds.top - firstTop) < lineHeight * 0.5);
        if (!isSingleLine) return false;

        let fullText = text.textBounds
            .map((tb) => tb.text)
            .join('')
            .replace(/\s+/g, ' ')
            .trim();
        const fullWidth = this.ctx.measureText(fullText).width;
        if (fullWidth <= containerBounds.width) return false;

        const truncated = this.truncateTextWithEllipsis(fullText, containerBounds.width, styles.letterSpacing);
        const bounds = new TextBounds(truncated, text.textBounds[0].bounds);
        for (const layer of paintOrder) {
            if (layer === PAINT_ORDER_LAYER.FILL) this.renderTextFillWithShadows(bounds, styles);
            else if (layer === PAINT_ORDER_LAYER.STROKE) this.renderTextStrokeWithStyle(bounds, styles);
        }
        return true;
    }

    async renderTextNode(text: TextContainer, styles: CSSParsedDeclaration, containerBounds?: Bounds): Promise<void> {
        this.ctx.font = this.createFontStyle(styles)[0];
        this.ctx.direction = styles.direction === DIRECTION.RTL ? 'rtl' : 'ltr';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
        const paintOrder = styles.paintOrder;

        // -webkit-line-clamp
        const clamp =
            styles.webkitLineClamp > 0 &&
            (styles.display & DISPLAY.BLOCK) !== 0 &&
            styles.overflowY === OVERFLOW.HIDDEN &&
            text.textBounds.length > 0;
        if (clamp) {
            if (this.renderLineClampedText(text, styles, paintOrder, containerBounds)) return;
        }

        // text-overflow: ellipsis (single-line only)
        const ellipsis =
            styles.textOverflow === TEXT_OVERFLOW.ELLIPSIS &&
            containerBounds &&
            styles.overflowX === OVERFLOW.HIDDEN &&
            text.textBounds.length > 0;
        if (ellipsis && this.renderEllipsisText(text, styles, paintOrder, containerBounds)) return;

        // Normal rendering: fill + stroke + decorations per text bound
        text.textBounds.forEach((tb) => {
            paintOrder.forEach((layer) => {
                if (layer === PAINT_ORDER_LAYER.FILL) {
                    this.renderTextFillWithShadows(tb, styles);
                    if (styles.textDecorationLine.length) this.renderTextDecoration(tb.bounds, styles);
                } else if (layer === PAINT_ORDER_LAYER.STROKE) {
                    this.renderTextStrokeWithStyle(tb, styles);
                }
            });
        });
    }
}
