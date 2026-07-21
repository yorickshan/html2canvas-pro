import { describe, it, expect } from 'vitest';
import {
    isElementNode,
    isTextNode,
    isHTMLElementNode,
    isSVGElementNode,
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
    isSlotElement,
    isLIElement,
    isOLElement,
    canHavePseudoElements
} from '../node-type-guards';

describe('node-type-guards', () => {
    describe('isElementNode', () => {
        it('returns true for Element', () => {
            expect(isElementNode(document.createElement('div'))).toBe(true);
        });
        it('returns false for Text', () => {
            expect(isElementNode(document.createTextNode('hello'))).toBe(false);
        });
        it('returns false for Comment', () => {
            expect(isElementNode(document.createComment('note'))).toBe(false);
        });
    });

    describe('isTextNode', () => {
        it('returns true for Text', () => {
            expect(isTextNode(document.createTextNode('hello'))).toBe(true);
        });
        it('returns false for Element', () => {
            expect(isTextNode(document.createElement('div'))).toBe(false);
        });
    });

    describe('isHTMLElementNode', () => {
        it('returns true for HTML elements', () => {
            expect(isHTMLElementNode(document.createElement('div'))).toBe(true);
        });
        it('returns false for SVG elements', () => {
            const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            expect(isHTMLElementNode(svgEl)).toBe(false);
        });
    });

    describe('isSVGElementNode', () => {
        it('returns true for SVG elements', () => {
            const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            expect(isSVGElementNode(svgEl)).toBe(true);
        });
    });

    describe('isInputElement', () => {
        it('returns true for input', () => {
            expect(isInputElement(document.createElement('input'))).toBe(true);
        });
        it('returns false for div', () => {
            expect(isInputElement(document.createElement('div'))).toBe(false);
        });
    });

    describe('isHTMLElement', () => {
        it('returns true for html element', () => {
            expect(isHTMLElement(document.documentElement)).toBe(true);
        });
    });

    describe('isBodyElement', () => {
        it('returns true for body', () => {
            expect(isBodyElement(document.body)).toBe(true);
        });
    });

    describe('isCanvasElement', () => {
        it('returns true for canvas', () => {
            expect(isCanvasElement(document.createElement('canvas'))).toBe(true);
        });
    });

    describe('isVideoElement', () => {
        it('returns true for video', () => {
            expect(isVideoElement(document.createElement('video'))).toBe(true);
        });
    });

    describe('isImageElement', () => {
        it('returns true for img', () => {
            expect(isImageElement(document.createElement('img'))).toBe(true);
        });
    });

    describe('isIFrameElement', () => {
        it('returns true for iframe', () => {
            expect(isIFrameElement(document.createElement('iframe'))).toBe(true);
        });
    });

    describe('isStyleElement', () => {
        it('returns true for style', () => {
            expect(isStyleElement(document.createElement('style'))).toBe(true);
        });
    });

    describe('isScriptElement', () => {
        it('returns true for script', () => {
            expect(isScriptElement(document.createElement('script'))).toBe(true);
        });
    });

    describe('isTextareaElement', () => {
        it('returns true for textarea', () => {
            expect(isTextareaElement(document.createElement('textarea'))).toBe(true);
        });
    });

    describe('isSelectElement', () => {
        it('returns true for select', () => {
            expect(isSelectElement(document.createElement('select'))).toBe(true);
        });
    });

    describe('isSlotElement', () => {
        it('returns true for slot', () => {
            expect(isSlotElement(document.createElement('slot'))).toBe(true);
        });
    });

    describe('isLIElement', () => {
        it('returns true for li', () => {
            expect(isLIElement(document.createElement('li'))).toBe(true);
        });
    });

    describe('isOLElement', () => {
        it('returns true for ol', () => {
            expect(isOLElement(document.createElement('ol'))).toBe(true);
        });
    });

    describe('canHavePseudoElements', () => {
        it('returns boolean', () => {
            expect(typeof canHavePseudoElements(document.createElement('div'))).toBe('boolean');
        });
    });
});
