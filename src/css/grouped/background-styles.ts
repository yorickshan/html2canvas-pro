import type { CSSParsedDeclaration } from '../index';

/**
 * Read-only grouped accessor for background-related CSS properties.
 */
export class BackgroundStyles {
    constructor(private readonly styles: CSSParsedDeclaration) {}

    get color() {
        return this.styles.backgroundColor;
    }
    get image() {
        return this.styles.backgroundImage;
    }
    get clip() {
        return this.styles.backgroundClip;
    }
    get origin() {
        return this.styles.backgroundOrigin;
    }
    get position() {
        return this.styles.backgroundPosition;
    }
    get repeat() {
        return this.styles.backgroundRepeat;
    }
    get size() {
        return this.styles.backgroundSize;
    }
    get blendMode() {
        return this.styles.backgroundBlendMode;
    }
}
