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

    /**
     * Bounds of the <legend> child of a <fieldset>, when present. Browsers break
     * the fieldset's top border where the legend sits; the renderer uses these
     * bounds to leave a matching gap (issue #227).
     */
    readonly legendBounds?: Bounds;

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

        if (element.tagName === 'FIELDSET') {
            const legend = element.querySelector(':scope > legend');
            if (legend) {
                this.legendBounds = parseBounds(this.context, legend);
            }
        }

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
