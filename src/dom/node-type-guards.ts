/**
 * DOM Node Type Guards
 *
 * All DOM node type guards consolidated here to eliminate duplication
 * and provide a single source of truth for node type checking.
 */

// --- Generic node type guards ---

export const isElementNode = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;
export const isTextNode = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE;

export const isSVGElementNode = (element: Element): element is SVGElement =>
    typeof (element as SVGElement).className === 'object';

export const isHTMLElementNode = (node: Node): node is HTMLElement =>
    isElementNode(node) && typeof (node as HTMLElement).style !== 'undefined' && !isSVGElementNode(node);

// --- Tag name based type guards ---

export const isInputElement = (node: Element): node is HTMLInputElement => node.tagName === 'INPUT';
export const isHTMLElement = (node: Element): node is HTMLHtmlElement => node.tagName === 'HTML';
export const isSVGElement = (node: Element): node is SVGSVGElement => node.tagName === 'svg';
export const isBodyElement = (node: Element): node is HTMLBodyElement => node.tagName === 'BODY';
export const isCanvasElement = (node: Element): node is HTMLCanvasElement => node.tagName === 'CANVAS';
export const isVideoElement = (node: Element): node is HTMLVideoElement => node.tagName === 'VIDEO';
export const isImageElement = (node: Element): node is HTMLImageElement => node.tagName === 'IMG';
export const isIFrameElement = (node: Element): node is HTMLIFrameElement => node.tagName === 'IFRAME';
export const isStyleElement = (node: Element): node is HTMLStyleElement => node.tagName === 'STYLE';
export const isScriptElement = (node: Element): node is HTMLScriptElement => node.tagName === 'SCRIPT';
export const isTextareaElement = (node: Element): node is HTMLTextAreaElement => node.tagName === 'TEXTAREA';
export const isSelectElement = (node: Element): node is HTMLSelectElement => node.tagName === 'SELECT';
export const isSlotElement = (node: Element): node is HTMLSlotElement => node.tagName === 'SLOT';
export const isLIElement = (node: Element): node is HTMLLIElement => node.tagName === 'LI';
export const isOLElement = (node: Element): node is HTMLOListElement => node.tagName === 'OL';

export const isCustomElement = (element: Element): element is HTMLElement =>
    !isSVGElementNode(element) && element.tagName.indexOf('-') > 0;

const VOID_OR_REPLACED_TAGS = new Set([
    'IMG',
    'VIDEO',
    'AUDIO',
    'CANVAS',
    'IFRAME',
    'INPUT',
    'TEXTAREA',
    'SELECT',
    'BR',
    'HR',
    'META',
    'LINK',
    'BASE',
    'COL',
    'SOURCE',
    'TRACK',
    'WBR',
    'AREA',
    'PARAM',
    'EMBED',
    'OBJECT'
]);

/**
 * Check if an element can have ::before / ::after pseudo-elements.
 * Per the CSS spec, replaced elements and void elements cannot have pseudo-elements.
 * SVG elements also do not support pseudo-elements.
 */
export const canHavePseudoElements = (element: Element): boolean =>
    !isSVGElementNode(element) && !VOID_OR_REPLACED_TAGS.has(element.tagName);
