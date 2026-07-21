import { describe, it, expect } from 'vitest';
import { copyCSSStyles, serializeDoctype, DocumentCloner, CloneOptions } from '../document-cloner';
import { IGNORE_ATTRIBUTE } from '../slot-cloner';
import { Context } from '../../core/context';
import { Html2CanvasConfig } from '../../config';
import { Bounds } from '../../css/layout/bounds';

function createMockWindow(): Window {
    return {
        document: {
            createElement: (_name: string) => {
                let _href = '';
                return {
                    set href(value: string) {
                        _href = value;
                    },
                    get href() {
                        return _href;
                    },
                    get protocol() {
                        return 'http:';
                    },
                    get hostname() {
                        return 'localhost';
                    },
                    get port() {
                        return '';
                    }
                };
            },
            createDocumentType: document.implementation.createDocumentType.bind(document.implementation)
        },
        location: { href: 'http://localhost/' },
        getComputedStyle: () => ({}),
        pageXOffset: 0,
        pageYOffset: 0
    } as unknown as Window;
}

function createMockContext(): Context {
    const mockWindow = createMockWindow();
    const config = new Html2CanvasConfig({ window: mockWindow });
    return new Context(
        { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
        new Bounds(0, 0, 800, 600),
        config
    );
}

describe('copyCSSStyles', () => {
    it('copies basic style properties', () => {
        const div = document.createElement('div');
        div.style.cssText = 'color: red; font-size: 16px;';
        const target = document.createElement('div');
        const result = copyCSSStyles(div.style, target);
        expect(result.style.color).toBe('red');
        expect(result.style.fontSize).toBe('16px');
    });

    it('ignores the "all" property', () => {
        const div = document.createElement('div');
        div.style.cssText = 'all: initial; color: red;';
        const target = document.createElement('div');
        const result = copyCSSStyles(div.style, target);
        expect(result.style.all).toBe('');
        expect(result.style.color).toBe('red');
    });

    it('ignores the "d" property (SVG path)', () => {
        const div = document.createElement('div');
        div.style.cssText = 'd: path("M0 0"); color: red;';
        const target = document.createElement('div');
        const result = copyCSSStyles(div.style, target);
        expect(result.style.color).toBe('red');
    });

    it('ignores the "content" property', () => {
        const div = document.createElement('div');
        div.style.cssText = 'content: "x"; color: red;';
        const target = document.createElement('div');
        const result = copyCSSStyles(div.style, target);
        expect(result.style.content).toBe('');
        expect(result.style.color).toBe('red');
    });

    it('skips CSS custom properties (--*)', () => {
        const div = document.createElement('div');
        div.style.setProperty('--my-var', '42');
        div.style.color = 'red';
        const target = document.createElement('div');
        const result = copyCSSStyles(div.style, target);
        // --my-var should be skipped, color should be copied
        expect(result.style.getPropertyValue('--my-var')).toBe('');
        expect(result.style.color).toBe('red');
    });

    it('preserves !important priority', () => {
        const div = document.createElement('div');
        div.style.setProperty('color', 'red', 'important');
        const target = document.createElement('div');
        const result = copyCSSStyles(div.style, target);
        expect(result.style.getPropertyPriority('color')).toBe('important');
    });
});

describe('serializeDoctype', () => {
    it('returns empty string for null doctype', () => {
        expect(serializeDoctype(null)).toBe('');
    });

    it('serializes HTML5 doctype', () => {
        const doctype = document.implementation.createDocumentType('html', '', '');
        const result = serializeDoctype(doctype);
        expect(result).toBe('<!DOCTYPE html>');
    });

    it('serializes doctype with publicId and systemId', () => {
        const doctype = document.implementation.createDocumentType(
            'html',
            '-//W3C//DTD HTML 4.01//EN',
            'http://www.w3.org/TR/html4/strict.dtd'
        );
        const result = serializeDoctype(doctype);
        expect(result).toContain('<!DOCTYPE html');
        expect(result).toContain('PUBLIC');
        expect(result).toContain('-//W3C//DTD HTML 4.01//EN');
    });
});

describe('DocumentCloner.destroy', () => {
    it('removes container from DOM and returns true', () => {
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        expect(DocumentCloner.destroy(iframe)).toBe(true);
        expect(iframe.parentNode).toBeNull();
    });

    it('returns false when container has no parent', () => {
        const iframe = document.createElement('iframe');
        expect(DocumentCloner.destroy(iframe)).toBe(false);
    });
});

describe('DocumentCloner construction', () => {
    const defaultCloneOptions: CloneOptions = {
        ignoreElements: undefined,
        onclone: undefined,
        allowTaint: false
    };

    it('constructs without throwing', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        expect(() => {
            new DocumentCloner(createMockContext(), el, {
                ...defaultCloneOptions,
                inlineImages: false,
                copyStyles: true
            });
        }).not.toThrow();
        document.body.removeChild(el);
    });

    it('clonedReferenceElement is set after construction', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        const cloner = new DocumentCloner(createMockContext(), el, {
            ...defaultCloneOptions,
            inlineImages: false,
            copyStyles: true
        });
        expect(cloner.clonedReferenceElement).toBeDefined();
        document.body.removeChild(el);
    });

    it('toIFrame returns a Promise', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        const cloner = new DocumentCloner(createMockContext(), el, {
            ...defaultCloneOptions,
            inlineImages: false,
            copyStyles: true
        });
        const result = cloner.toIFrame(document, new Bounds(0, 0, 800, 600));
        expect(result).toBeInstanceOf(Promise);
        document.body.removeChild(el);
    });
});

describe('IGNORE_ATTRIBUTE', () => {
    it('is a defined string constant', () => {
        expect(typeof IGNORE_ATTRIBUTE).toBe('string');
        expect(IGNORE_ATTRIBUTE.length).toBeGreaterThan(0);
    });
});
