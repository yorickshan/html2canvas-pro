import type { CSSParsedDeclaration } from '../index';

/**
 * Read-only grouped accessor for layout/display/positioning CSS properties.
 */
export class LayoutStyles {
    constructor(private readonly styles: CSSParsedDeclaration) {}

    get display() {
        return this.styles.display;
    }
    get position() {
        return this.styles.position;
    }
    get float() {
        return this.styles.float;
    }
    // Explicit return type avoids name clash with z-index descriptor export.
    get zIndex(): CSSParsedDeclaration['zIndex'] {
        return this.styles.zIndex;
    }

    get marginTop() {
        return this.styles.marginTop;
    }
    get marginRight() {
        return this.styles.marginRight;
    }
    get marginBottom() {
        return this.styles.marginBottom;
    }
    get marginLeft() {
        return this.styles.marginLeft;
    }

    get paddingTop() {
        return this.styles.paddingTop;
    }
    get paddingRight() {
        return this.styles.paddingRight;
    }
    get paddingBottom() {
        return this.styles.paddingBottom;
    }
    get paddingLeft() {
        return this.styles.paddingLeft;
    }

    get overflowX() {
        return this.styles.overflowX;
    }
    get overflowY() {
        return this.styles.overflowY;
    }

    get opacity() {
        return this.styles.opacity;
    }
    get visibility() {
        return this.styles.visibility;
    }

    get transform() {
        return this.styles.transform;
    }
    get transformOrigin() {
        return this.styles.transformOrigin;
    }
    get rotate() {
        return this.styles.rotate;
    }
    get zoom() {
        return this.styles.zoom;
    }

    get clipPath() {
        return this.styles.clipPath;
    }
    get mixBlendMode() {
        return this.styles.mixBlendMode;
    }
    get filter() {
        return this.styles.filter;
    }
    get imageRendering() {
        return this.styles.imageRendering;
    }

    get objectFit() {
        return this.styles.objectFit;
    }
    get objectPosition() {
        return this.styles.objectPosition;
    }
    get boxDecorationBreak() {
        return this.styles.boxDecorationBreak;
    }

    get listStyleImage() {
        return this.styles.listStyleImage;
    }
    get listStylePosition() {
        return this.styles.listStylePosition;
    }
    get listStyleType() {
        return this.styles.listStyleType;
    }

    get animationDuration() {
        return this.styles.animationDuration;
    }

    isVisible() {
        return this.styles.isVisible();
    }
    isTransparent() {
        return this.styles.isTransparent();
    }
    isTransformed() {
        return this.styles.isTransformed();
    }
    isPositioned() {
        return this.styles.isPositioned();
    }
    isPositionedWithZIndex() {
        return this.styles.isPositionedWithZIndex();
    }
    isFloating() {
        return this.styles.isFloating();
    }
    isInlineLevel() {
        return this.styles.isInlineLevel();
    }
}
