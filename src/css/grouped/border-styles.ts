import type { CSSParsedDeclaration } from '../index';

/**
 * Read-only grouped accessor for border-related CSS properties.
 *
 * Provides structured access: `styles.border.topColor` as an alternative
 * to the flat `styles.borderTopColor`. Both forms remain valid.
 */
export class BorderStyles {
    constructor(private readonly styles: CSSParsedDeclaration) {}

    get topColor() {
        return this.styles.borderTopColor;
    }
    get rightColor() {
        return this.styles.borderRightColor;
    }
    get bottomColor() {
        return this.styles.borderBottomColor;
    }
    get leftColor() {
        return this.styles.borderLeftColor;
    }

    get topStyle() {
        return this.styles.borderTopStyle;
    }
    get rightStyle() {
        return this.styles.borderRightStyle;
    }
    get bottomStyle() {
        return this.styles.borderBottomStyle;
    }
    get leftStyle() {
        return this.styles.borderLeftStyle;
    }

    get topWidth() {
        return this.styles.borderTopWidth;
    }
    get rightWidth() {
        return this.styles.borderRightWidth;
    }
    get bottomWidth() {
        return this.styles.borderBottomWidth;
    }
    get leftWidth() {
        return this.styles.borderLeftWidth;
    }

    get topLeftRadius() {
        return this.styles.borderTopLeftRadius;
    }
    get topRightRadius() {
        return this.styles.borderTopRightRadius;
    }
    get bottomRightRadius() {
        return this.styles.borderBottomRightRadius;
    }
    get bottomLeftRadius() {
        return this.styles.borderBottomLeftRadius;
    }

    get imageSource() {
        return this.styles.borderImageSource;
    }
    get imageSlice() {
        return this.styles.borderImageSlice;
    }
    get imageRepeat() {
        return this.styles.borderImageRepeat;
    }

    get boxShadow() {
        return this.styles.boxShadow;
    }
}
