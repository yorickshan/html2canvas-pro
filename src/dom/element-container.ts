import { CSSParsedDeclaration } from '../css/index';
import { TextContainer } from './text-container';
import { Bounds, parseBounds } from '../css/layout/bounds';
import { isHTMLElementNode } from './node-type-guards';
import { Context } from '../core/context';
import { DebuggerType, isDebugging } from '../core/debugger';
import { DOMNormalizer, OriginalStyles } from './dom-normalizer';

export interface ElementContainerOptions {
    normalizeDom?: boolean;
}

export class ElementContainer {
    readonly styles: CSSParsedDeclaration;
    readonly textNodes: TextContainer[] = [];
    readonly elements: ElementContainer[] = [];
    bounds: Bounds;

    createsStackingContext = false;
    createsRealStackingContext = false;
    isListOwner = false;
    debugRender = false;

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

        this.styles = new CSSParsedDeclaration(context, context.config.window.getComputedStyle(element, null));

        const shouldNormalize = options.normalizeDom !== false;
        if (shouldNormalize && isHTMLElementNode(element)) {
            this.originalStyles = DOMNormalizer.normalizeElement(element, this.styles);
            this.originalElement = element;
        }

        this.bounds = parseBounds(this.context, element);

        if (isDebugging(element, DebuggerType.RENDER)) {
            this.debugRender = true;
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
