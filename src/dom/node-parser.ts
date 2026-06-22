import { CSSParsedDeclaration } from '../css';
import { ElementContainer } from './element-container';
import { TextContainer } from './text-container';
import { ImageElementContainer } from './replaced-elements/image-element-container';
import { CanvasElementContainer } from './replaced-elements/canvas-element-container';
import { SVGElementContainer } from './replaced-elements/svg-element-container';
import { LIElementContainer } from './elements/li-element-container';
import { OLElementContainer } from './elements/ol-element-container';
import { InputElementContainer } from './replaced-elements/input-element-container';
import { SelectElementContainer } from './elements/select-element-container';
import { TextareaElementContainer } from './elements/textarea-element-container';
import { IFrameElementContainer } from './replaced-elements/iframe-element-container';
import { Context } from '../core/context';
import {
    isElementNode,
    isTextNode,
    isSVGElementNode,
    isHTMLElementNode,
    isLIElement,
    isOLElement,
    isCustomElement
} from './node-type-guards';

// Re-export all type guards from node-type-guards for backward compatibility
export {
    isElementNode,
    isTextNode,
    isSVGElementNode,
    isHTMLElementNode,
    isLIElement,
    isOLElement,
    isCustomElement,
    isInputElement,
    isHTMLElement,
    isSVGElement,
    isBodyElement,
    isCanvasElement,
    isVideoElement,
    isImageElement,
    isIFrameElement,
    isStyleElement,
    isScriptElement,
    isTextareaElement,
    isSelectElement,
    isSlotElement
};
import { DISPLAY } from '../css/property-descriptors/display';

const LIST_OWNERS = ['OL', 'UL', 'MENU'];

const parseNodeTree = (context: Context, node: Node, parent: ElementContainer, root: ElementContainer) => {
    for (let childNode = node.firstChild, nextNode; childNode; childNode = nextNode) {
        nextNode = childNode.nextSibling;

        // Fixes #2238 #1624 - Fix the issue of TextNode content being overlooked in rendering due to being perceived as blank by trim().
        if (isTextNode(childNode) && childNode.data.length > 0) {
            parent.textNodes.push(new TextContainer(context, childNode, parent.styles));
        } else if (isElementNode(childNode)) {
            if (isSlotElement(childNode) && childNode.assignedNodes) {
                childNode
                    .assignedNodes()
                    .forEach((assignedNode: Node) => parseNodeTree(context, assignedNode, parent, root));
            } else {
                const container = createContainer(context, childNode);
                if (container.styles.isVisible()) {
                    if (createsRealStackingContext(childNode, container, root)) {
                        container.createsRealStackingContext = true;
                    } else if (createsStackingContext(container.styles)) {
                        container.createsStackingContext = true;
                    }

                    if (LIST_OWNERS.indexOf(childNode.tagName) !== -1) {
                        container.isListOwner = true;
                    }

                    parent.elements.push(container);
                    if (childNode.shadowRoot) {
                        parseNodeTree(context, childNode.shadowRoot, container, root);
                    } else if (
                        !isTextareaElement(childNode) &&
                        !isSVGElement(childNode) &&
                        !isSelectElement(childNode)
                    ) {
                        parseNodeTree(context, childNode, container, root);
                    }
                }
            }
        }
    }
};

const createContainer = (context: Context, element: Element): ElementContainer => {
    if (isImageElement(element)) {
        return new ImageElementContainer(context, element);
    }

    if (isCanvasElement(element)) {
        return new CanvasElementContainer(context, element);
    }

    if (isSVGElement(element)) {
        return new SVGElementContainer(context, element);
    }

    if (isLIElement(element)) {
        return new LIElementContainer(context, element);
    }

    if (isOLElement(element)) {
        return new OLElementContainer(context, element);
    }

    if (isInputElement(element)) {
        return new InputElementContainer(context, element);
    }

    if (isSelectElement(element)) {
        return new SelectElementContainer(context, element);
    }

    if (isTextareaElement(element)) {
        return new TextareaElementContainer(context, element);
    }

    if (isIFrameElement(element)) {
        return new IFrameElementContainer(context, element, parseTree);
    }

    return new ElementContainer(context, element);
};

export const parseTree = (context: Context, element: HTMLElement): ElementContainer => {
    const container = createContainer(context, element);
    container.createsRealStackingContext = true;
    parseNodeTree(context, element, container, container);
    return container;
};

const createsRealStackingContext = (node: Element, container: ElementContainer, root: ElementContainer): boolean => {
    return (
        container.styles.isPositionedWithZIndex() ||
        container.styles.opacity < 1 ||
        container.styles.isTransformed() ||
        (isBodyElement(node) && root.styles.isTransparent())
    );
};

const createsStackingContext = (styles: CSSParsedDeclaration): boolean => {
    // Positioned and floating elements create stacking contexts
    if (styles.isPositioned() || styles.isFloating()) {
        return true;
    }

    // Fix for Issue #137: Inline-level containers (inline-flex, inline-block, etc.)
    // should create stacking contexts to prevent their children from being added
    // to the parent's stacking context, which causes rendering order issues
    return (
        contains(styles.display, DISPLAY.INLINE_FLEX) ||
        contains(styles.display, DISPLAY.INLINE_BLOCK) ||
        contains(styles.display, DISPLAY.INLINE_GRID) ||
        contains(styles.display, DISPLAY.INLINE_TABLE)
    );
};
