import { describe, it, expect } from 'vitest';
import { Context } from '../../core/context';
import { TextContainer } from '../text-container';
import { Html2CanvasConfig } from '../../config';
import { Bounds } from '../../css/layout/bounds';
import { CSSParsedDeclaration } from '../../css/index';

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
            }
        },
        location: { href: 'http://localhost/' },
        getComputedStyle: () => ({}) as CSSStyleDeclaration
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

function createMockCSSStyleDeclaration(): CSSStyleDeclaration {
    return {} as CSSStyleDeclaration;
}

describe('TextContainer', () => {
    it('constructs with text content', () => {
        const textNode = document.createTextNode('Hello World');
        const styles = new CSSParsedDeclaration(createMockContext(), createMockCSSStyleDeclaration());
        const container = new TextContainer(createMockContext(), textNode, styles);
        expect(container.text).toBe('Hello World');
    });

    it('constructs with empty text', () => {
        const textNode = document.createTextNode('');
        const styles = new CSSParsedDeclaration(createMockContext(), createMockCSSStyleDeclaration());
        const container = new TextContainer(createMockContext(), textNode, styles);
        expect(container.text).toBe('');
    });

    it('has textBounds array', () => {
        const textNode = document.createTextNode('test');
        const styles = new CSSParsedDeclaration(createMockContext(), createMockCSSStyleDeclaration());
        const container = new TextContainer(createMockContext(), textNode, styles);
        expect(Array.isArray(container.textBounds)).toBe(true);
    });
});
