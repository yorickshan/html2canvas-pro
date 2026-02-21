import { CSSParsedDeclaration } from '../css/index';
import { TextContainer } from './text-container';
import { Bounds, parseBounds } from '../css/layout/bounds';
import { isHTMLElementNode } from './node-type-guards';
import { Context } from '../core/context';
import { DebuggerType, isDebugging } from '../core/debugger';
import { DOMNormalizer, OriginalStyles } from './dom-normalizer';

export const enum FLAGS {
    CREATES_STACKING_CONTEXT = 1 << 1,
    CREATES_REAL_STACKING_CONTEXT = 1 << 2,
    IS_LIST_OWNER = 1 << 3,
    DEBUG_RENDER = 1 << 4
}

export interface ElementContainerOptions {
    /**
     * Whether to normalize DOM (disable animations, reset transforms)
     * Default: true for backward compatibility
     */
    normalizeDom?: boolean;
}

export class ElementContainer {
    readonly styles: CSSParsedDeclaration;
    readonly textNodes: TextContainer[] = [];
    readonly elements: ElementContainer[] = [];
    bounds: Bounds;
    flags = 0;
    private originalStyles?: OriginalStyles;
    private originalElement?: Element;

    constructor(
        protected readonly context: Context,
        element: Element,
        options: ElementContainerOptions = {}
    ) {
        if (isDebugging(element, DebuggerType.PARSE)) {
            debugger;
        }

        this.styles = new CSSParsedDeclaration(context, window.getComputedStyle(element, null));

        // Side effects moved to DOMNormalizer (can be disabled via options)
        const shouldNormalize = options.normalizeDom !== false; // Default: true
        if (shouldNormalize && isHTMLElementNode(element)) {
            this.originalStyles = DOMNormalizer.normalizeElement(element, this.styles);
            this.originalElement = element; // Save reference for restoration
        }

        this.bounds = parseBounds(this.context, element);

        if (isDebugging(element, DebuggerType.RENDER)) {
            this.flags |= FLAGS.DEBUG_RENDER;
        }
    }

    /**
     * Restore original element styles (if normalized)
     * Call this after rendering is complete to clean up DOM state
     */
    restore(): void {
        if (this.originalStyles && this.originalElement) {
            DOMNormalizer.restoreElement(this.originalElement, this.originalStyles);
            // Clear references to prevent memory leaks
            this.originalStyles = undefined;
            this.originalElement = undefined;
        }
    }

    /**
     * Recursively restore all elements in the tree
     * Call this on the root container after rendering is complete
     */
    restoreTree(): void {
        this.restore();
        // Recursively restore all child elements
        for (const child of this.elements) {
            child.restoreTree();
        }
    }
}
