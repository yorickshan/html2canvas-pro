import { describe, it, expect } from 'vitest';
import { Context } from '../../../core/context';
import { Html2CanvasConfig } from '../../../config';
import { Bounds } from '../../../css/layout/bounds';
import { CSSParsedDeclaration } from '../../index';

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
        getComputedStyle: () => ({})
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

describe('BackgroundStyles', () => {
    it('can be accessed from CSSParsedDeclaration', () => {
        const styles = new CSSParsedDeclaration(createMockContext(), createMockCSSStyleDeclaration());
        const bg = styles.background;
        expect(bg).toBeDefined();
        expect(typeof bg.color).toBe('number');
        expect(Array.isArray(bg.image)).toBe(true);
    });
});

describe('BorderStyles', () => {
    it('can be accessed from CSSParsedDeclaration', () => {
        const styles = new CSSParsedDeclaration(createMockContext(), createMockCSSStyleDeclaration());
        const border = styles.border;
        expect(border).toBeDefined();
        expect(typeof border.topColor).toBe('number');
        expect(typeof border.topStyle).toBe('number');
        expect(typeof border.topWidth).toBe('number');
    });
});

describe('FontStyles', () => {
    it('can be accessed from CSSParsedDeclaration', () => {
        const styles = new CSSParsedDeclaration(createMockContext(), createMockCSSStyleDeclaration());
        const font = styles.font;
        expect(font).toBeDefined();
        expect(typeof font.size).toBe('object');
        expect(Array.isArray(font.family)).toBe(true);
    });
});

describe('LayoutStyles', () => {
    it('can be accessed from CSSParsedDeclaration', () => {
        const styles = new CSSParsedDeclaration(createMockContext(), createMockCSSStyleDeclaration());
        const layout = styles.layout;
        expect(layout).toBeDefined();
        expect(typeof layout.display).toBe('number');
        expect(typeof layout.position).toBe('number');
    });
});
