import type { CSSParsedDeclaration } from '../index';

/**
 * Read-only grouped accessor for font/text-related CSS properties.
 */
export class FontStyles {
    constructor(private readonly styles: CSSParsedDeclaration) {}

    get family() {
        return this.styles.fontFamily;
    }
    get size() {
        return this.styles.fontSize;
    }
    get style() {
        return this.styles.fontStyle;
    }
    get variant() {
        return this.styles.fontVariant;
    }
    get weight() {
        return this.styles.fontWeight;
    }
    get ligatures() {
        return this.styles.fontVariantLigatures;
    }

    get color() {
        return this.styles.color;
    }
    get letterSpacing() {
        return this.styles.letterSpacing;
    }
    get lineHeight() {
        return this.styles.lineHeight;
    }
    get textAlign() {
        return this.styles.textAlign;
    }
    get textTransform() {
        return this.styles.textTransform;
    }
    get textOverflow() {
        return this.styles.textOverflow;
    }
    get textShadow() {
        return this.styles.textShadow;
    }
    get textDecorationColor() {
        return this.styles.textDecorationColor;
    }
    get textDecorationLine() {
        return this.styles.textDecorationLine;
    }
    get textDecorationStyle() {
        return this.styles.textDecorationStyle;
    }
    get textDecorationThickness() {
        return this.styles.textDecorationThickness;
    }
    get textUnderlineOffset() {
        return this.styles.textUnderlineOffset;
    }
    get wordBreak() {
        return this.styles.wordBreak;
    }
    get lineBreak() {
        return this.styles.lineBreak;
    }
    get overflowWrap() {
        return this.styles.overflowWrap;
    }
    get writingMode() {
        return this.styles.writingMode;
    }
    get direction() {
        return this.styles.direction;
    }

    get webkitTextStrokeColor() {
        return this.styles.webkitTextStrokeColor;
    }
    get webkitTextStrokeWidth() {
        return this.styles.webkitTextStrokeWidth;
    }
    get webkitLineClamp() {
        return this.styles.webkitLineClamp;
    }

    get paintOrder() {
        return this.styles.paintOrder;
    }
}
