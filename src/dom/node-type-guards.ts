/**
 * DOM Node Type Guards
 * Extracted to break circular dependencies
 */

/**
 * Check if node is an Element
 */
export const isElementNode = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;

/**
 * Check if node is a Text node
 */
export const isTextNode = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE;

/**
 * Check if element is an SVG element
 */
export const isSVGElementNode = (element: Element): element is SVGElement =>
    typeof (element as SVGElement).className === 'object';

/**
 * Check if node is an HTML element
 */
export const isHTMLElementNode = (node: Node): node is HTMLElement =>
    isElementNode(node) && typeof (node as HTMLElement).style !== 'undefined' && !isSVGElementNode(node);

/**
 * Check if node is an LI element
 */
export const isLIElement = (node: Element): node is HTMLLIElement => node.tagName === 'LI';

/**
 * Check if node is an OL element
 */
export const isOLElement = (node: Element): node is HTMLOListElement => node.tagName === 'OL';

/**
 * Check if element is a custom element
 * Custom elements must have a hyphen and cannot be SVG elements
 */
export const isCustomElement = (element: Element): element is HTMLElement =>
    !isSVGElementNode(element) && element.tagName.indexOf('-') > 0;
