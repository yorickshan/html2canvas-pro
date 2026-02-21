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
import { TEXT_DECORATION_LINE } from '../../css/property-descriptors/text-decoration-line';
import { TEXT_DECORATION_STYLE } from '../../css/property-descriptors/text-decoration-style';
import { PAINT_ORDER_LAYER } from '../../css/property-descriptors/paint-order';
import { DIRECTION } from '../../css/property-descriptors/direction';
import { DISPLAY } from '../../css/property-descriptors/display';
import { TEXT_OVERFLOW } from '../../css/property-descriptors/text-overflow';
import { OVERFLOW } from '../../css/property-descriptors/overflow';
import { isDimensionToken } from '../../css/syntax/parser';
import { TextShadow } from '../../css/property-descriptors/text-shadow';

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

/**
 * Text Renderer
 *
 * Specialized renderer for text content.
 * Extracted from CanvasRenderer to improve code organization and maintainability.
 */
export class TextRenderer {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly options: { scale: number };

    constructor(deps: TextRendererDependencies) {
        this.ctx = deps.ctx;
        // context stored but not used directly in this renderer
        this.options = deps.options;
    }

    /**
     * Render text with letter spacing
     * Public method used by list rendering
     */
    renderTextWithLetterSpacing(text: TextBounds, letterSpacing: number, baseline: number): void {
        if (letterSpacing === 0) {
            // Use alphabetic baseline for consistent text positioning across browsers
            // Issue #129: text.bounds.top + text.bounds.height causes text to render too low
            this.ctx.fillText(text.text, text.bounds.left, text.bounds.top + baseline);
        } else {
            const letters = segmentGraphemes(text.text);
            letters.reduce((left, letter) => {
                this.ctx.fillText(letter, left, text.bounds.top + baseline);

                return left + this.ctx.measureText(letter).width;
            }, text.bounds.left);
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
                    this.renderTextWithLetterSpacing(textBound, styles.letterSpacing, styles.fontSize.number);
                    break;
                case PAINT_ORDER_LAYER.STROKE:
                    if (styles.webkitTextStrokeWidth && textBound.text.trim().length) {
                        this.ctx.strokeStyle = asString(styles.webkitTextStrokeColor);
                        this.ctx.lineWidth = styles.webkitTextStrokeWidth;
                        this.ctx.lineJoin = !!(window as any).chrome ? 'miter' : 'round';
                        this.renderTextWithLetterSpacing(textBound, styles.letterSpacing, styles.fontSize.number);
                    }
                    break;
            }
        });
    }

    private renderTextDecoration(bounds: Bounds, styles: CSSParsedDeclaration): void {
        this.ctx.fillStyle = asString(styles.textDecorationColor || styles.color);

        // Calculate decoration line thickness
        let thickness = 1; // default
        if (typeof styles.textDecorationThickness === 'number') {
            thickness = styles.textDecorationThickness;
        } else if (styles.textDecorationThickness === 'from-font') {
            // Use a reasonable default based on font size
            thickness = Math.max(1, Math.floor(styles.fontSize.number * 0.05));
        }
        // 'auto' uses default thickness of 1

        // Calculate underline offset
        let underlineOffset = 0;
        if (typeof styles.textUnderlineOffset === 'number') {
            // It's a pixel value
            underlineOffset = styles.textUnderlineOffset;
        }
        // 'auto' uses default offset of 0

        const decorationStyle = styles.textDecorationStyle;

        styles.textDecorationLine.forEach((textDecorationLine) => {
            let y = 0;

            switch (textDecorationLine) {
                case TEXT_DECORATION_LINE.UNDERLINE:
                    y = bounds.top + bounds.height - thickness + underlineOffset;
                    break;
                case TEXT_DECORATION_LINE.OVERLINE:
                    y = bounds.top;
                    break;
                case TEXT_DECORATION_LINE.LINE_THROUGH:
                    y = bounds.top + (bounds.height / 2 - thickness / 2);
                    break;
                default:
                    return;
            }

            this.drawDecorationLine(bounds.left, y, bounds.width, thickness, decorationStyle);
        });
    }

    private drawDecorationLine(x: number, y: number, width: number, thickness: number, style: number): void {
        switch (style) {
            case TEXT_DECORATION_STYLE.SOLID:
                // Solid line (default)
                this.ctx.fillRect(x, y, width, thickness);
                break;

            case TEXT_DECORATION_STYLE.DOUBLE:
                // Double line
                const gap = Math.max(1, thickness);
                this.ctx.fillRect(x, y, width, thickness);
                this.ctx.fillRect(x, y + thickness + gap, width, thickness);
                break;

            case TEXT_DECORATION_STYLE.DOTTED:
                // Dotted line
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.setLineDash([thickness, thickness * 2]);
                this.ctx.lineWidth = thickness;
                this.ctx.strokeStyle = this.ctx.fillStyle;
                this.ctx.moveTo(x, y + thickness / 2);
                this.ctx.lineTo(x + width, y + thickness / 2);
                this.ctx.stroke();
                this.ctx.restore();
                break;

            case TEXT_DECORATION_STYLE.DASHED:
                // Dashed line
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.setLineDash([thickness * 3, thickness * 2]);
                this.ctx.lineWidth = thickness;
                this.ctx.strokeStyle = this.ctx.fillStyle;
                this.ctx.moveTo(x, y + thickness / 2);
                this.ctx.lineTo(x + width, y + thickness / 2);
                this.ctx.stroke();
                this.ctx.restore();
                break;

            case TEXT_DECORATION_STYLE.WAVY:
                // Wavy line (approximation using quadratic curves)
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.lineWidth = thickness;
                this.ctx.strokeStyle = this.ctx.fillStyle;

                const amplitude = thickness * 2;
                const wavelength = thickness * 4;
                let currentX = x;

                this.ctx.moveTo(currentX, y + thickness / 2);

                while (currentX < x + width) {
                    const nextX = Math.min(currentX + wavelength / 2, x + width);
                    this.ctx.quadraticCurveTo(
                        currentX + wavelength / 4,
                        y + thickness / 2 - amplitude,
                        nextX,
                        y + thickness / 2
                    );
                    currentX = nextX;

                    if (currentX < x + width) {
                        const nextX2 = Math.min(currentX + wavelength / 2, x + width);
                        this.ctx.quadraticCurveTo(
                            currentX + wavelength / 4,
                            y + thickness / 2 + amplitude,
                            nextX2,
                            y + thickness / 2
                        );
                        currentX = nextX2;
                    }
                }

                this.ctx.stroke();
                this.ctx.restore();
                break;

            default:
                // Fallback to solid
                this.ctx.fillRect(x, y, width, thickness);
        }
    }

    // Helper method to truncate text and add ellipsis if needed
    private truncateTextWithEllipsis(text: string, maxWidth: number, letterSpacing: number): string {
        const ellipsis = '...';
        const ellipsisWidth = this.ctx.measureText(ellipsis).width;

        if (letterSpacing === 0) {
            let truncated = text;
            while (this.ctx.measureText(truncated).width + ellipsisWidth > maxWidth && truncated.length > 0) {
                truncated = truncated.slice(0, -1);
            }
            return truncated + ellipsis;
        } else {
            const letters = segmentGraphemes(text);
            let width = ellipsisWidth;
            let result: string[] = [];

            for (const letter of letters) {
                const letterWidth = this.ctx.measureText(letter).width + letterSpacing;
                if (width + letterWidth > maxWidth) {
                    break;
                }
                result.push(letter);
                width += letterWidth;
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

    async renderTextNode(text: TextContainer, styles: CSSParsedDeclaration, containerBounds?: Bounds): Promise<void> {
        const [font] = this.createFontStyle(styles);

        this.ctx.font = font;

        this.ctx.direction = styles.direction === DIRECTION.RTL ? 'rtl' : 'ltr';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
        const paintOrder = styles.paintOrder;

        // Calculate line height for text layout detection (used by both line-clamp and ellipsis)
        const lineHeight = styles.fontSize.number * 1.5;

        // Check if we need to apply -webkit-line-clamp
        // This limits text to a specific number of lines with ellipsis
        const shouldApplyLineClamp =
            styles.webkitLineClamp > 0 &&
            (styles.display & DISPLAY.BLOCK) !== 0 &&
            styles.overflowY === OVERFLOW.HIDDEN &&
            text.textBounds.length > 0;

        if (shouldApplyLineClamp) {
            // Group text bounds by lines based on their Y position
            const lines: TextBounds[][] = [];
            let currentLine: TextBounds[] = [];
            let currentLineTop = text.textBounds[0].bounds.top;

            text.textBounds.forEach((tb) => {
                // If this text bound is on a different line, start a new line
                if (Math.abs(tb.bounds.top - currentLineTop) >= lineHeight * 0.5) {
                    if (currentLine.length > 0) {
                        lines.push(currentLine);
                    }
                    currentLine = [tb];
                    currentLineTop = tb.bounds.top;
                } else {
                    currentLine.push(tb);
                }
            });

            // Don't forget the last line
            if (currentLine.length > 0) {
                lines.push(currentLine);
            }

            // Only render up to webkitLineClamp lines
            const maxLines = styles.webkitLineClamp;
            if (lines.length > maxLines) {
                // Render only the first (maxLines - 1) complete lines
                for (let i = 0; i < maxLines - 1; i++) {
                    lines[i].forEach((textBound) => {
                        this.renderTextBoundWithPaintOrder(textBound, styles, paintOrder);
                    });
                }

                // For the last line, truncate with ellipsis
                const lastLine = lines[maxLines - 1];
                if (lastLine && lastLine.length > 0 && containerBounds) {
                    const lastLineText = lastLine.map((tb) => tb.text).join('');
                    const firstBound = lastLine[0];
                    const availableWidth = containerBounds.width - (firstBound.bounds.left - containerBounds.left);
                    const truncatedText = this.truncateTextWithEllipsis(
                        lastLineText,
                        availableWidth,
                        styles.letterSpacing
                    );

                    paintOrder.forEach((paintOrderLayer) => {
                        switch (paintOrderLayer) {
                            case PAINT_ORDER_LAYER.FILL:
                                this.ctx.fillStyle = asString(styles.color);
                                if (styles.letterSpacing === 0) {
                                    this.ctx.fillText(
                                        truncatedText,
                                        firstBound.bounds.left,
                                        firstBound.bounds.top + styles.fontSize.number
                                    );
                                } else {
                                    const letters = segmentGraphemes(truncatedText);
                                    letters.reduce((left, letter) => {
                                        this.ctx.fillText(letter, left, firstBound.bounds.top + styles.fontSize.number);
                                        return left + this.ctx.measureText(letter).width + styles.letterSpacing;
                                    }, firstBound.bounds.left);
                                }
                                break;
                            case PAINT_ORDER_LAYER.STROKE:
                                if (styles.webkitTextStrokeWidth && truncatedText.trim().length) {
                                    this.ctx.strokeStyle = asString(styles.webkitTextStrokeColor);
                                    this.ctx.lineWidth = styles.webkitTextStrokeWidth;
                                    this.ctx.lineJoin = !!(window as any).chrome ? 'miter' : 'round';
                                    if (styles.letterSpacing === 0) {
                                        this.ctx.strokeText(
                                            truncatedText,
                                            firstBound.bounds.left,
                                            firstBound.bounds.top + styles.fontSize.number
                                        );
                                    } else {
                                        const letters = segmentGraphemes(truncatedText);
                                        letters.reduce((left, letter) => {
                                            this.ctx.strokeText(
                                                letter,
                                                left,
                                                firstBound.bounds.top + styles.fontSize.number
                                            );
                                            return left + this.ctx.measureText(letter).width + styles.letterSpacing;
                                        }, firstBound.bounds.left);
                                    }
                                }
                                break;
                        }
                    });
                }
                return; // Don't render anything else
            }
            // If lines.length <= maxLines, fall through to normal rendering
        }

        // Check if we need to apply text-overflow: ellipsis
        // Issue #203: Only apply ellipsis for single-line text overflow
        // Multi-line text truncation (like -webkit-line-clamp) should not be affected
        const shouldApplyEllipsis =
            styles.textOverflow === TEXT_OVERFLOW.ELLIPSIS &&
            containerBounds &&
            styles.overflowX === OVERFLOW.HIDDEN &&
            text.textBounds.length > 0;

        // Calculate total text width if ellipsis might be needed
        let needsEllipsis = false;
        let truncatedText = '';
        if (shouldApplyEllipsis) {
            // Check if all text bounds are on approximately the same line (single-line scenario)
            // For multi-line text (like -webkit-line-clamp), textBounds will have different Y positions
            const firstTop = text.textBounds[0].bounds.top;
            const isSingleLine = text.textBounds.every((tb) => Math.abs(tb.bounds.top - firstTop) < lineHeight * 0.5);

            if (isSingleLine) {
                // Measure the full text content
                // Note: text.textBounds may contain whitespace characters from HTML formatting
                // We need to collapse them like the browser does for white-space: nowrap
                let fullText = text.textBounds.map((tb) => tb.text).join('');

                // Collapse whitespace: replace sequences of whitespace (including newlines) with single spaces
                // and trim leading/trailing whitespace
                fullText = fullText.replace(/\s+/g, ' ').trim();

                const fullTextWidth = this.ctx.measureText(fullText).width;
                const availableWidth = containerBounds.width;

                if (fullTextWidth > availableWidth) {
                    needsEllipsis = true;
                    truncatedText = this.truncateTextWithEllipsis(fullText, availableWidth, styles.letterSpacing);
                }
            }
        }

        // If ellipsis is needed, render the truncated text once
        if (needsEllipsis) {
            const firstBound = text.textBounds[0];
            paintOrder.forEach((paintOrderLayer) => {
                switch (paintOrderLayer) {
                    case PAINT_ORDER_LAYER.FILL:
                        this.ctx.fillStyle = asString(styles.color);

                        if (styles.letterSpacing === 0) {
                            this.ctx.fillText(
                                truncatedText,
                                firstBound.bounds.left,
                                firstBound.bounds.top + styles.fontSize.number
                            );
                        } else {
                            const letters = segmentGraphemes(truncatedText);
                            letters.reduce((left, letter) => {
                                this.ctx.fillText(letter, left, firstBound.bounds.top + styles.fontSize.number);
                                return left + this.ctx.measureText(letter).width + styles.letterSpacing;
                            }, firstBound.bounds.left);
                        }

                        const textShadows: TextShadow = styles.textShadow;
                        if (textShadows.length && truncatedText.trim().length) {
                            textShadows
                                .slice(0)
                                .reverse()
                                .forEach((textShadow) => {
                                    this.ctx.shadowColor = asString(textShadow.color);
                                    this.ctx.shadowOffsetX = textShadow.offsetX.number * this.options.scale;
                                    this.ctx.shadowOffsetY = textShadow.offsetY.number * this.options.scale;
                                    this.ctx.shadowBlur = textShadow.blur.number;

                                    if (styles.letterSpacing === 0) {
                                        this.ctx.fillText(
                                            truncatedText,
                                            firstBound.bounds.left,
                                            firstBound.bounds.top + styles.fontSize.number
                                        );
                                    } else {
                                        const letters = segmentGraphemes(truncatedText);
                                        letters.reduce((left, letter) => {
                                            this.ctx.fillText(
                                                letter,
                                                left,
                                                firstBound.bounds.top + styles.fontSize.number
                                            );
                                            return left + this.ctx.measureText(letter).width + styles.letterSpacing;
                                        }, firstBound.bounds.left);
                                    }
                                });

                            this.ctx.shadowColor = '';
                            this.ctx.shadowOffsetX = 0;
                            this.ctx.shadowOffsetY = 0;
                            this.ctx.shadowBlur = 0;
                        }
                        break;
                    case PAINT_ORDER_LAYER.STROKE:
                        if (styles.webkitTextStrokeWidth && truncatedText.trim().length) {
                            this.ctx.strokeStyle = asString(styles.webkitTextStrokeColor);
                            this.ctx.lineWidth = styles.webkitTextStrokeWidth;
                            this.ctx.lineJoin = !!(window as any).chrome ? 'miter' : 'round';

                            if (styles.letterSpacing === 0) {
                                this.ctx.strokeText(
                                    truncatedText,
                                    firstBound.bounds.left,
                                    firstBound.bounds.top + styles.fontSize.number
                                );
                            } else {
                                const letters = segmentGraphemes(truncatedText);
                                letters.reduce((left, letter) => {
                                    this.ctx.strokeText(letter, left, firstBound.bounds.top + styles.fontSize.number);
                                    return left + this.ctx.measureText(letter).width + styles.letterSpacing;
                                }, firstBound.bounds.left);
                            }
                        }
                        break;
                }
            });
            return;
        }

        // Normal rendering (no ellipsis needed)
        text.textBounds.forEach((text) => {
            paintOrder.forEach((paintOrderLayer) => {
                switch (paintOrderLayer) {
                    case PAINT_ORDER_LAYER.FILL:
                        this.ctx.fillStyle = asString(styles.color);
                        this.renderTextWithLetterSpacing(text, styles.letterSpacing, styles.fontSize.number);
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
                                        styles.fontSize.number
                                    );
                                });

                            this.ctx.shadowColor = '';
                            this.ctx.shadowOffsetX = 0;
                            this.ctx.shadowOffsetY = 0;
                            this.ctx.shadowBlur = 0;
                        }

                        if (styles.textDecorationLine.length) {
                            this.renderTextDecoration(text.bounds, styles);
                        }
                        break;
                    case PAINT_ORDER_LAYER.STROKE:
                        if (styles.webkitTextStrokeWidth && text.text.trim().length) {
                            this.ctx.strokeStyle = asString(styles.webkitTextStrokeColor);
                            this.ctx.lineWidth = styles.webkitTextStrokeWidth;

                            this.ctx.lineJoin = !!(window as any).chrome ? 'miter' : 'round';
                            // Issue #110: Use baseline (fontSize) for consistent positioning with fill
                            // Previously used text.bounds.height which caused stroke to render too low
                            const baseline = styles.fontSize.number;
                            if (styles.letterSpacing === 0) {
                                this.ctx.strokeText(text.text, text.bounds.left, text.bounds.top + baseline);
                            } else {
                                const letters = segmentGraphemes(text.text);
                                letters.reduce((left, letter) => {
                                    this.ctx.strokeText(letter, left, text.bounds.top + baseline);
                                    return left + this.ctx.measureText(letter).width;
                                }, text.bounds.left);
                            }
                        }
                        this.ctx.strokeStyle = '';
                        this.ctx.lineWidth = 0;
                        this.ctx.lineJoin = 'miter';
                        break;
                }
            });
        });
    }
}
