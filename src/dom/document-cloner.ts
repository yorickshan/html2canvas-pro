import { Bounds } from '../css/layout/bounds';
import {
    isBodyElement,
    isCanvasElement,
    isCustomElement,
    isElementNode,
    isHTMLElementNode,
    isIFrameElement,
    isImageElement,
    isSelectElement,
    isStyleElement,
    isSVGElementNode,
    isTextareaElement,
    isTextNode,
    isVideoElement,
    canHavePseudoElements
} from './node-type-guards';
import { CounterState } from '../css/types/functions/counter';
import { CSSParsedCounterDeclaration } from '../css/index';
import { Context } from '../core/context';
import { DebuggerType, isDebugging } from '../core/debugger';
import { SlotCloner } from './slot-cloner';
import { copyCSSStyles } from './copy-css-styles';
import { PseudoContentResolver, PseudoElementType, createPseudoHideStyles } from './pseudo-content';

import { mountCloneInIFrame } from './iframe-mount';

// Re-exported for backwards compatibility: existing consumers import these
// from the cloner module.
export { copyCSSStyles } from './copy-css-styles';
export { serializeDoctype } from './iframe-mount';

export interface CloneOptions {
    ignoreElements?: (element: Element) => boolean;
    onclone?: (document: Document, element: HTMLElement) => void;
    allowTaint?: boolean;
    iframeContainer?: HTMLElement | ShadowRoot;
}

export interface WindowOptions {
    scrollX: number;
    scrollY: number;
    windowWidth: number;
    windowHeight: number;
}

export type CloneConfigurations = CloneOptions & {
    inlineImages: boolean;
    copyStyles: boolean;
    cspNonce?: string;
};

/**
 * Find the parent ShadowRoot of an element, if any
 * @param element - The element to check
 * @returns The parent ShadowRoot or null
 */
const findParentShadowRoot = (element: Element): ShadowRoot | null => {
    let current: Node | null = element;
    while (current) {
        // Check if we've reached a shadow root boundary
        if (current.parentNode && (current.parentNode as ShadowRoot).host) {
            return current.parentNode as ShadowRoot;
        }
        // Use getRootNode to check if we're in a shadow root
        const root = current.getRootNode();
        if (root && root !== current.ownerDocument && (root as ShadowRoot).host) {
            return root as ShadowRoot;
        }
        current = current.parentNode;
    }
    return null;
};

export class DocumentCloner {
    private readonly scrolledElements: [Element, number, number][];
    private readonly referenceElement: HTMLElement;
    clonedReferenceElement?: HTMLElement;
    private readonly documentElement: HTMLElement;
    private readonly counters: CounterState;
    private readonly pseudoContents: PseudoContentResolver;
    private readonly slotCloner: SlotCloner;

    constructor(
        private readonly context: Context,
        element: HTMLElement,
        private readonly options: CloneConfigurations
    ) {
        this.scrolledElements = [];
        this.referenceElement = element;
        this.counters = new CounterState();
        this.pseudoContents = new PseudoContentResolver(context, this.counters);
        this.slotCloner = new SlotCloner(
            (node, copyStyles) => this.cloneNode(node, copyStyles),
            { ignoreElements: options.ignoreElements, copyStyles: options.copyStyles ?? true },
            context
        );
        if (!element.ownerDocument) {
            throw new Error('Cloned element does not have an owner document');
        }

        // Auto-detect Shadow Root if not explicitly provided
        if (!this.options.iframeContainer) {
            const shadowRoot = findParentShadowRoot(element);
            if (shadowRoot) {
                this.options.iframeContainer = shadowRoot;
            }
        }

        this.documentElement = this.cloneNode(element.ownerDocument.documentElement, false) as HTMLElement;
    }

    toIFrame(ownerDocument: Document, windowSize: Bounds): Promise<HTMLIFrameElement> {
        return mountCloneInIFrame(this.context, ownerDocument, windowSize, {
            documentElement: this.documentElement,
            clonedReferenceElement: this.clonedReferenceElement,
            referenceElementName: this.referenceElement.nodeName,
            scrolledElements: this.scrolledElements,
            onclone: this.options.onclone,
            container: this.options.iframeContainer
        });
    }

    createElementClone<T extends HTMLElement | SVGElement>(node: T): HTMLElement | SVGElement {
        if (isDebugging(node, DebuggerType.CLONE)) {
            debugger;
        }
        if (isCanvasElement(node)) {
            return this.createCanvasClone(node);
        }
        if (isVideoElement(node)) {
            return this.createVideoClone(node);
        }
        if (isStyleElement(node)) {
            return this.createStyleClone(node);
        }

        const clone = node.cloneNode(false) as T;
        if (isImageElement(clone)) {
            if (isImageElement(node) && node.currentSrc && node.currentSrc !== node.src) {
                clone.src = node.currentSrc;
                clone.srcset = '';
            }

            if (clone.loading === 'lazy') {
                clone.loading = 'eager';
            }
        }

        if (isCustomElement(clone) && !isSVGElementNode(clone)) {
            return this.createCustomElementClone(node as HTMLElement, clone as HTMLElement);
        }

        return clone;
    }

    createCustomElementClone(originalNode: HTMLElement, clonedNode: HTMLElement): HTMLElement {
        const clone = document.createElement('div');
        clone.className = clonedNode.className;
        copyCSSStyles(clonedNode.style, clone);

        // Copy all attributes onto the fresh <div> (except class/style which are
        // handled above). Without this, attributes such as `slot="suffix"` are
        // dropped and slotted custom elements lose their slot assignment in the
        // cloned shadow DOM, so their content is never rendered (issue #226).
        // Iterate by index: `NamedNodeMap` is not guaranteed to be iterable
        // across TypeScript DOM lib versions (TS2488 on older libs).
        const attributes = clonedNode.attributes;
        for (let i = 0; i < attributes.length; i++) {
            const attr = attributes.item(i);
            if (attr && attr.name !== 'class' && attr.name !== 'style') {
                clone.setAttribute(attr.name, attr.value);
            }
        }

        // Clone shadow DOM if it exists. The shadow root must be detected on the
        // ORIGINAL element: `clonedNode` comes from `cloneNode(false)`, which only
        // preserves the shadow root when it was created with `clonable: true` (or
        // by frameworks that set it). For other components (e.g. Shoelace / Web
        // Awesome) the clone has no shadow root, so without this check the clone
        // falls back to flattening the shadow content and the slotted light-DOM
        // label content is lost.
        // Fix for Issue #108: This is critical for Web Components with slots to work correctly
        if (originalNode.shadowRoot) {
            try {
                clone.attachShadow({ mode: 'open' });
                // The actual shadow DOM content will be cloned in cloneChildNodes
            } catch (e) {
                // Some elements cannot have shadow roots attached
                // This can happen if the element doesn't support shadow DOM
                this.context.logger.error('Failed to attach shadow root to custom element clone:', e);
            }
        }

        return clone;
    }

    createStyleClone(node: HTMLStyleElement): HTMLStyleElement {
        try {
            const sheet = node.sheet as CSSStyleSheet | undefined;
            if (sheet && sheet.cssRules) {
                const css: string = [].slice.call(sheet.cssRules, 0).reduce((css: string, rule: CSSRule) => {
                    if (rule && typeof rule.cssText === 'string') {
                        return css + rule.cssText;
                    }
                    return css;
                }, '');
                const style = node.cloneNode(false) as HTMLStyleElement;
                style.textContent = css;
                if (this.options.cspNonce) {
                    style.nonce = this.options.cspNonce;
                }
                return style;
            }
        } catch (e) {
            // accessing node.sheet.cssRules throws a DOMException
            this.context.logger.error('Unable to access cssRules property', e);
            if ((e as { name?: string }).name !== 'SecurityError') {
                throw e;
            }
        }
        const cloned = node.cloneNode(false) as HTMLStyleElement;
        if (this.options.cspNonce) {
            cloned.nonce = this.options.cspNonce;
        }
        return cloned;
    }

    createCanvasClone(canvas: HTMLCanvasElement): HTMLImageElement | HTMLCanvasElement {
        if (this.options.inlineImages && canvas.ownerDocument) {
            const img = canvas.ownerDocument.createElement('img');
            try {
                img.src = canvas.toDataURL();
                return img;
            } catch (e) {
                this.context.logger.info(`Unable to inline canvas contents, canvas is tainted`, canvas);
            }
        }

        const clonedCanvas = canvas.cloneNode(false) as HTMLCanvasElement;

        try {
            clonedCanvas.width = canvas.width;
            clonedCanvas.height = canvas.height;
            const ctx = canvas.getContext('2d');
            const clonedCtx = clonedCanvas.getContext('2d', { willReadFrequently: true });
            if (clonedCtx) {
                if (!this.options.allowTaint && ctx) {
                    clonedCtx.putImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), 0, 0);
                } else {
                    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
                    if (gl) {
                        const attribs = gl.getContextAttributes();
                        if (attribs?.preserveDrawingBuffer === false) {
                            this.context.logger.warn(
                                'Unable to clone WebGL context as it has preserveDrawingBuffer=false',
                                canvas
                            );
                        }
                    }

                    clonedCtx.drawImage(canvas, 0, 0);
                }
            }
            return clonedCanvas;
        } catch (e) {
            this.context.logger.info(`Unable to clone canvas as it is tainted`, canvas);
        }

        return clonedCanvas;
    }

    createVideoClone(video: HTMLVideoElement): HTMLCanvasElement {
        const canvas = video.ownerDocument.createElement('canvas');

        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;
        const ctx = canvas.getContext('2d');

        try {
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                if (!this.options.allowTaint) {
                    ctx.getImageData(0, 0, canvas.width, canvas.height);
                }
            }
            return canvas;
        } catch (e) {
            this.context.logger.info(`Unable to clone video as it is tainted`, video);
        }

        const blankCanvas = video.ownerDocument.createElement('canvas');

        blankCanvas.width = video.offsetWidth;
        blankCanvas.height = video.offsetHeight;
        return blankCanvas;
    }

    appendChildNode(clone: HTMLElement | SVGElement, child: Node, copyStyles: boolean): void {
        this.slotCloner.appendChildNode(clone, child, copyStyles);
    }

    /**
     * Clone child nodes from source element to clone element.
     * Delegates to SlotCloner which handles shadow DOM, slots, and light DOM.
     */
    cloneChildNodes(node: Element, clone: HTMLElement | SVGElement, copyStyles: boolean): void {
        this.slotCloner.cloneChildNodes(node, clone, copyStyles);
    }

    cloneNode(node: Node, copyStyles: boolean): Node {
        if (isTextNode(node)) {
            return document.createTextNode(node.data);
        }

        if (!node.ownerDocument) {
            return node.cloneNode(false);
        }

        const window = node.ownerDocument.defaultView;

        if (window && isElementNode(node) && (isHTMLElementNode(node) || isSVGElementNode(node))) {
            const clone = this.createElementClone(node);
            clone.style.transitionProperty = 'none';

            const style = window.getComputedStyle(node);

            // Per CSS spec, replaced elements, void elements, and SVG elements
            // cannot have ::before / ::after pseudo-elements — skip these queries.
            const checkPseudoElements = canHavePseudoElements(node);

            if (this.referenceElement === node && isHTMLElementNode(clone)) {
                this.clonedReferenceElement = clone;
            }
            if (isBodyElement(clone)) {
                createPseudoHideStyles(clone, this.options.cspNonce);
            }

            const counters = this.counters.parse(new CSSParsedCounterDeclaration(this.context, style));

            if (checkPseudoElements) {
                const styleBefore = window.getComputedStyle(node, ':before');
                const before = this.pseudoContents.resolvePseudoContent(
                    node,
                    clone,
                    styleBefore,
                    PseudoElementType.BEFORE
                );
                if (before) {
                    clone.insertBefore(before, clone.firstChild);
                }
            }

            if (isCustomElement(node)) {
                copyStyles = true;
            }

            if (!isVideoElement(node)) {
                this.cloneChildNodes(node, clone, copyStyles);
            }

            // ::after content must follow the element's children (CSS
            // generated-content order). Resolving it before the children were
            // cloned put it between ::before and the content, which also
            // desynchronised the shared open-quote/close-quote depth.
            if (checkPseudoElements) {
                const styleAfter = window.getComputedStyle(node, ':after');
                const after = this.pseudoContents.resolvePseudoContent(
                    node,
                    clone,
                    styleAfter,
                    PseudoElementType.AFTER
                );
                if (after) {
                    clone.appendChild(after);
                }
            }

            this.counters.pop(counters);

            if (
                (style && (this.options.copyStyles || isSVGElementNode(node)) && !isIFrameElement(node)) ||
                copyStyles
            ) {
                copyCSSStyles(style, clone);
            }

            if (node.scrollTop !== 0 || node.scrollLeft !== 0) {
                this.scrolledElements.push([clone, node.scrollLeft, node.scrollTop]);
            }

            if (
                (isTextareaElement(node) || isSelectElement(node)) &&
                (isTextareaElement(clone) || isSelectElement(clone))
            ) {
                clone.value = node.value;
            }

            return clone;
        }

        return node.cloneNode(false);
    }

    static destroy(container: HTMLIFrameElement): boolean {
        if (container.parentNode) {
            container.parentNode.removeChild(container);
            return true;
        }
        return false;
    }
}
