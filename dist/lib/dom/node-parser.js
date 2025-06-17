"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCustomElement = exports.isSlotElement = exports.isSelectElement = exports.isTextareaElement = exports.isScriptElement = exports.isStyleElement = exports.isIFrameElement = exports.isImageElement = exports.isVideoElement = exports.isCanvasElement = exports.isBodyElement = exports.isSVGElement = exports.isHTMLElement = exports.isInputElement = exports.isOLElement = exports.isLIElement = exports.isSVGElementNode = exports.isHTMLElementNode = exports.isElementNode = exports.isTextNode = exports.parseTree = void 0;
var element_container_1 = require("./element-container");
var text_container_1 = require("./text-container");
var image_element_container_1 = require("./replaced-elements/image-element-container");
var canvas_element_container_1 = require("./replaced-elements/canvas-element-container");
var svg_element_container_1 = require("./replaced-elements/svg-element-container");
var li_element_container_1 = require("./elements/li-element-container");
var ol_element_container_1 = require("./elements/ol-element-container");
var input_element_container_1 = require("./replaced-elements/input-element-container");
var select_element_container_1 = require("./elements/select-element-container");
var textarea_element_container_1 = require("./elements/textarea-element-container");
var iframe_element_container_1 = require("./replaced-elements/iframe-element-container");
var LIST_OWNERS = ['OL', 'UL', 'MENU'];
var parseNodeTree = function (context, node, parent, root) {
    for (var childNode = node.firstChild, nextNode = void 0; childNode; childNode = nextNode) {
        nextNode = childNode.nextSibling;
        // Fixes #2238 #1624 - Fix the issue of TextNode content being overlooked in rendering due to being perceived as blank by trim().
        if ((0, exports.isTextNode)(childNode) && childNode.data.length > 0) {
            parent.textNodes.push(new text_container_1.TextContainer(context, childNode, parent.styles));
        }
        else if ((0, exports.isElementNode)(childNode)) {
            if ((0, exports.isSlotElement)(childNode) && childNode.assignedNodes) {
                childNode.assignedNodes().forEach(function (childNode) { return parseNodeTree(context, childNode, parent, root); });
            }
            else {
                var container = createContainer(context, childNode);
                if (container.styles.isVisible()) {
                    if (createsRealStackingContext(childNode, container, root)) {
                        container.flags |= 4 /* FLAGS.CREATES_REAL_STACKING_CONTEXT */;
                    }
                    else if (createsStackingContext(container.styles)) {
                        container.flags |= 2 /* FLAGS.CREATES_STACKING_CONTEXT */;
                    }
                    if (LIST_OWNERS.indexOf(childNode.tagName) !== -1) {
                        container.flags |= 8 /* FLAGS.IS_LIST_OWNER */;
                    }
                    parent.elements.push(container);
                    childNode.slot;
                    if (childNode.shadowRoot) {
                        parseNodeTree(context, childNode.shadowRoot, container, root);
                    }
                    else if (!(0, exports.isTextareaElement)(childNode) &&
                        !(0, exports.isSVGElement)(childNode) &&
                        !(0, exports.isSelectElement)(childNode)) {
                        parseNodeTree(context, childNode, container, root);
                    }
                }
            }
        }
    }
};
var createContainer = function (context, element) {
    if ((0, exports.isImageElement)(element)) {
        return new image_element_container_1.ImageElementContainer(context, element);
    }
    if ((0, exports.isCanvasElement)(element)) {
        return new canvas_element_container_1.CanvasElementContainer(context, element);
    }
    if ((0, exports.isSVGElement)(element)) {
        return new svg_element_container_1.SVGElementContainer(context, element);
    }
    if ((0, exports.isLIElement)(element)) {
        return new li_element_container_1.LIElementContainer(context, element);
    }
    if ((0, exports.isOLElement)(element)) {
        return new ol_element_container_1.OLElementContainer(context, element);
    }
    if ((0, exports.isInputElement)(element)) {
        return new input_element_container_1.InputElementContainer(context, element);
    }
    if ((0, exports.isSelectElement)(element)) {
        return new select_element_container_1.SelectElementContainer(context, element);
    }
    if ((0, exports.isTextareaElement)(element)) {
        return new textarea_element_container_1.TextareaElementContainer(context, element);
    }
    if ((0, exports.isIFrameElement)(element)) {
        return new iframe_element_container_1.IFrameElementContainer(context, element);
    }
    return new element_container_1.ElementContainer(context, element);
};
var parseTree = function (context, element) {
    var container = createContainer(context, element);
    container.flags |= 4 /* FLAGS.CREATES_REAL_STACKING_CONTEXT */;
    parseNodeTree(context, element, container, container);
    return container;
};
exports.parseTree = parseTree;
var createsRealStackingContext = function (node, container, root) {
    return (container.styles.isPositionedWithZIndex() ||
        container.styles.opacity < 1 ||
        container.styles.isTransformed() ||
        ((0, exports.isBodyElement)(node) && root.styles.isTransparent()));
};
var createsStackingContext = function (styles) { return styles.isPositioned() || styles.isFloating(); };
var isTextNode = function (node) { return node.nodeType === Node.TEXT_NODE; };
exports.isTextNode = isTextNode;
var isElementNode = function (node) { return node.nodeType === Node.ELEMENT_NODE; };
exports.isElementNode = isElementNode;
var isHTMLElementNode = function (node) {
    return (0, exports.isElementNode)(node) && typeof node.style !== 'undefined' && !(0, exports.isSVGElementNode)(node);
};
exports.isHTMLElementNode = isHTMLElementNode;
var isSVGElementNode = function (element) {
    return typeof element.className === 'object';
};
exports.isSVGElementNode = isSVGElementNode;
var isLIElement = function (node) { return node.tagName === 'LI'; };
exports.isLIElement = isLIElement;
var isOLElement = function (node) { return node.tagName === 'OL'; };
exports.isOLElement = isOLElement;
var isInputElement = function (node) { return node.tagName === 'INPUT'; };
exports.isInputElement = isInputElement;
var isHTMLElement = function (node) { return node.tagName === 'HTML'; };
exports.isHTMLElement = isHTMLElement;
var isSVGElement = function (node) { return node.tagName === 'svg'; };
exports.isSVGElement = isSVGElement;
var isBodyElement = function (node) { return node.tagName === 'BODY'; };
exports.isBodyElement = isBodyElement;
var isCanvasElement = function (node) { return node.tagName === 'CANVAS'; };
exports.isCanvasElement = isCanvasElement;
var isVideoElement = function (node) { return node.tagName === 'VIDEO'; };
exports.isVideoElement = isVideoElement;
var isImageElement = function (node) { return node.tagName === 'IMG'; };
exports.isImageElement = isImageElement;
var isIFrameElement = function (node) { return node.tagName === 'IFRAME'; };
exports.isIFrameElement = isIFrameElement;
var isStyleElement = function (node) { return node.tagName === 'STYLE'; };
exports.isStyleElement = isStyleElement;
var isScriptElement = function (node) { return node.tagName === 'SCRIPT'; };
exports.isScriptElement = isScriptElement;
var isTextareaElement = function (node) { return node.tagName === 'TEXTAREA'; };
exports.isTextareaElement = isTextareaElement;
var isSelectElement = function (node) { return node.tagName === 'SELECT'; };
exports.isSelectElement = isSelectElement;
var isSlotElement = function (node) { return node.tagName === 'SLOT'; };
exports.isSlotElement = isSlotElement;
// https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
var isCustomElement = function (node) { return node.tagName.indexOf('-') > 0; };
exports.isCustomElement = isCustomElement;
//# sourceMappingURL=node-parser.js.map