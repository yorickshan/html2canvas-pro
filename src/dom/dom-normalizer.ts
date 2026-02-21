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
 * This includes disabling animations and resetting transforms
 */
export class DOMNormalizer {
    /**
     * Normalize a single element and return original styles
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

        // Reset transform for accurate bounds calculation
        // getBoundingClientRect takes transforms into account
        if (styles.transform !== null) {
            originalStyles.transform = element.style.transform;
            element.style.transform = 'none';
        }

        // Reset rotate property similarly to transform
        if (styles.rotate !== null) {
            originalStyles.rotate = element.style.rotate;
            element.style.rotate = 'none';
        }

        return originalStyles;
    }

    /**
     * Normalize element and its descendants recursively
     *
     * @param element - Element to normalize
     * @param styles - Parsed CSS styles
     * @returns Original styles map for restoration
     */
    static normalizeTree(element: Element, styles: CSSParsedDeclaration): OriginalStyles {
        return this.normalizeElement(element, styles);

        // Could add recursive normalization here if needed
        // For now, only normalize the element itself
    }

    /**
     * Restore element styles after rendering
     *
     * @param element - Element to restore
     * @param originalStyles - Original styles to restore
     */
    static restoreElement(element: Element, originalStyles: OriginalStyles): void {
        if (!isHTMLElementNode(element)) {
            return;
        }

        // Restore each property that was saved
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
