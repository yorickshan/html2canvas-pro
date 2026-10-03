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
    isBodyElement,
    isCanvasElement,
    isElementNode,
    isIFrameElement,
    isImageElement,
    isInputElement,
    isLIElement,
    isOLElement,
    isSelectElement,
    isSlotElement,
    isSVGElement,
    isTextareaElement,
    isTextNode
} from './node-type-guards';

import { contains } from '../core/bitwise';
import { ISOLATION } from '../css/property-descriptors/isolation';
import { DISPLAY } from '../css/property-descriptors/display';
import { MIX_BLEND_MODE } from '../css/property-descriptors/mix-blend-mode';
import { Bounds } from '../css/layout/bounds';
import { TextBounds } from '../css/layout/text';

const LIST_OWNERS = ['OL', 'UL', 'MENU'];

const parseNodeTree = (
    context: Context,
    node: Node,
    parent: ElementContainer,
    root: ElementContainer,
    zoomScale = 1
) => {
    for (let childNode = node.firstChild, nextNode; childNode; childNode = nextNode) {
        nextNode = childNode.nextSibling;
        parseChildNode(context, childNode, parent, root, zoomScale);
    }
};

/**
 * Parse a single node as a child of `parent`.
 *
 * Separated from the tree walk so that nodes assigned to a `<slot>` (including
 * bare text nodes, which have no child nodes) can be parsed directly. Without
 * this, slotted shadow-DOM content such as web component labels was silently
 * dropped because `parseNodeTree` only iterates `node.firstChild` (issue #226).
 */
const parseChildNode = (
    context: Context,
    childNode: Node,
    parent: ElementContainer,
    root: ElementContainer,
    zoomScale = 1
) => {
    // Fixes #2238 #1624 - Fix the issue of TextNode content being overlooked in rendering due to being perceived as blank by trim().
    if (isTextNode(childNode) && childNode.data.length > 0) {
        const textContainer = new TextContainer(context, childNode, parent.styles);
        if (zoomScale !== 1) {
            // Inside a zoomed ancestor, getClientRects returns zoomed (visual)
            // coordinates. The renderer paints this subtree in unzoomed layout
            // coordinates (relative to the zoomed element's visual top-left,
            // which the zoom TransformEffect keeps fixed), so convert text
            // bounds into that space.
            const originLeft = parent.bounds.left;
            const originTop = parent.bounds.top;
            textContainer.textBounds = textContainer.textBounds.map(
                (tb) =>
                    new TextBounds(
                        tb.text,
                        new Bounds(
                            originLeft + (tb.bounds.left - originLeft) / zoomScale,
                            originTop + (tb.bounds.top - originTop) / zoomScale,
                            tb.bounds.width / zoomScale,
                            tb.bounds.height / zoomScale
                        )
                    )
            );
        }
        parent.textNodes.push(textContainer);
    } else if (isElementNode(childNode)) {
        if (isSlotElement(childNode) && childNode.assignedNodes) {
            // Slotted content is laid out at the slot's position: parse each
            // assigned node (text or element) as a direct child of the slot's
            // parent container.
            childNode
                .assignedNodes()
                .forEach((assignedNode: Node) => parseChildNode(context, assignedNode, parent, root, zoomScale));
        } else {
            const container = createContainer(context, childNode);
            // A zoomed element lays itself out in unzoomed coordinates and is
            // visually scaled by its own TransformEffect from the element's
            // visual top-left corner. Its bounds therefore keep the visual
            // left/top (position in the parent flow) but the width/height
            // must be converted back to the unzoomed layout size — the
            // TransformEffect scales them back up during painting.
            // Descendants are laid out in unzoomed coordinates relative to
            // that corner: parseChildNode converts their bounds into that
            // space as the subtree is parsed.
            const ownZoom = container.styles.zoom || 1;
            if (ownZoom !== 1) {
                container.bounds = new Bounds(
                    container.bounds.left,
                    container.bounds.top,
                    container.bounds.width / ownZoom,
                    container.bounds.height / ownZoom
                );
            }
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
                const childZoom = zoomScale * (container.styles.zoom || 1);
                if (childNode.shadowRoot) {
                    parseNodeTree(context, childNode.shadowRoot, container, root, childZoom);
                } else if (!isTextareaElement(childNode) && !isSVGElement(childNode) && !isSelectElement(childNode)) {
                    parseNodeTree(context, childNode, container, root, childZoom);
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
        Boolean(container.styles.filter) ||
        Boolean(container.styles.backdropFilter) ||
        container.styles.maskImage.length > 0 ||
        Boolean(container.styles.webkitBoxReflect) ||
        container.styles.isolation === ISOLATION.ISOLATE ||
        container.styles.isTransformed() ||
        (isBodyElement(node) && root.styles.isTransparent())
    );
};

const createsStackingContext = (styles: CSSParsedDeclaration): boolean => {
    // Positioned and floating elements create stacking contexts
    if (styles.isPositioned() || styles.isFloating()) {
        return true;
    }

    // mix-blend-mode blends the element as one isolated group with the
    // backdrop, which requires its own stacking context (same as opacity<1).
    if (styles.mixBlendMode !== MIX_BLEND_MODE.NORMAL) {
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
