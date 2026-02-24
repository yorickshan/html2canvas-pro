/**
 * DOM Normalizer
 * Handles DOM side effects that need to happen before rendering
 * Extracted from ElementContainer to follow SRP
 */

import { CSSParsedDeclaration } from '../css';
import { isHTMLElementNode } from './node-type-guards';

/**
 * Stored original styles for restoration
 */
export interface OriginalStyles {
    animationDuration?: string;
    transform?: string;
    rotate?: string;
}

/**
 * Normalize element styles for accurate rendering
 * This includes disabling animations and neutralizing transforms.
 */
export class DOMNormalizer {
    /**
     * Normalize a single element and return original styles.
     *
     * ## Why we replace transforms with an identity value instead of "none"
     *
     * `getBoundingClientRect()` returns visual (post-transform) coordinates, so we
     * must neutralize any active transform before measuring element bounds.
     *
     * The naive approach of setting `transform: none` (or `rotate: none`) has a
     * critical side-effect: per **CSS Transforms Level 2**, an element whose
     * `transform` is non-none automatically becomes the **containing block** for
     * all of its `position: absolute` *and* `position: fixed` descendants.
     * Setting it to `none` destroys that role, causing children to resolve their
     * percentage dimensions and offsets against an unintended ancestor — which
     * produces completely wrong bounds.
     *
     * Solution: instead of removing the transform, we replace it with a visually
     * inert identity value:
     *
     * - `transform: scale(0.5)` → `transform: translate(0, 0)`
     *   - `translate(0, 0)` is an identity transform (no visual change, no layout shift).
     *   - `getBoundingClientRect()` returns the same layout-space coordinates as
     *     if there were no transform at all.
     *   - Because the value is still non-none, the element **remains a containing
     *     block** for both `position: absolute` and `position: fixed` descendants.
     *
     * - `rotate: 45deg` → `rotate: 0deg`
     *   - `0deg` is the identity rotation; `0deg ≠ none`, so the same containing-
     *     block guarantee holds.
     *
     * @param element - Element to normalize
     * @param styles - Parsed CSS styles
     * @returns Original styles map for restoration
     */
    static normalizeElement(element: Element, styles: CSSParsedDeclaration): OriginalStyles {
        const originalStyles: OriginalStyles = {};

        if (!isHTMLElementNode(element)) {
            return originalStyles;
        }

        // Disable animations to capture static state
        if (styles.animationDuration.some((duration) => duration > 0)) {
            originalStyles.animationDuration = element.style.animationDuration;
            element.style.animationDuration = '0s';
        }

        // Replace the actual transform with an identity translate so that:
        //   1. getBoundingClientRect() returns layout-space (unscaled/unrotated) coords.
        //   2. The element still satisfies "transform != none" and therefore keeps
        //      its role as a containing block for position:absolute / position:fixed
        //      descendants (CSS Transforms Level 2 §2.3).
        if (styles.transform !== null) {
            originalStyles.transform = element.style.transform;
            element.style.transform = 'translate(0, 0)';
        }

        // Same rationale for the standalone `rotate` property.
        // `rotate: 0deg` is an identity rotation with no visual effect.
        //
        // However, individual transform properties (`rotate`, `translate`, `scale`)
        // are part of CSS Transforms Level 2 and their containing-block guarantee
        // is not uniformly implemented across all browsers. To be safe, if `rotate`
        // is the only transform-like property active on this element, we also set
        // `transform: translate(0, 0)` so that the containing-block role is reliably
        // preserved via the well-supported `transform` property.
        if (styles.rotate !== null) {
            originalStyles.rotate = element.style.rotate;
            element.style.rotate = '0deg';

            // Individual transform properties (`rotate`, `translate`, `scale`) are
            // CSS Transforms Level 2 and their containing-block guarantee is not
            // uniformly implemented in all browsers. If `transform` was not already
            // set to translate(0,0) in the block above (i.e. this element has
            // `rotate` but no `transform`), we set it now so the containing-block
            // role is reliably established via the widely-supported `transform`
            // property – independently of browser support for individual props.
            if (originalStyles.transform === undefined) {
                originalStyles.transform = element.style.transform;
                element.style.transform = 'translate(0, 0)';
            }
        }

        return originalStyles;
    }

    /**
     * Restore element styles after rendering.
     *
     * @param element - Element to restore
     * @param originalStyles - Original styles to restore
     */
    static restoreElement(element: Element, originalStyles: OriginalStyles): void {
        if (!isHTMLElementNode(element)) {
            return;
        }

        if (originalStyles.animationDuration !== undefined) {
            element.style.animationDuration = originalStyles.animationDuration;
        }

        if (originalStyles.transform !== undefined) {
            element.style.transform = originalStyles.transform;
        }

        if (originalStyles.rotate !== undefined) {
            element.style.rotate = originalStyles.rotate;
        }
    }
}
