import { describe, it, expect, vi } from 'vitest';
import { SlotCloner, IGNORE_ATTRIBUTE } from '../slot-cloner';
import { Context } from '../../core/context';
import { Html2CanvasConfig } from '../../config';
import { Bounds } from '../../css/layout/bounds';

function createMockContext(): Context {
    const mockWindow = {
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
    const config = new Html2CanvasConfig({ window: mockWindow });
    return new Context(
        { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
        new Bounds(0, 0, 800, 600),
        config
    );
}

/**
 * Smoke tests for SlotCloner ensure the exported public API is functional.
 * Deep Shadow DOM / Slot behavior is covered by integration tests.
 */
describe('SlotCloner', () => {
    const makeCloner = () => {
        const mockCloneNode = vi.fn((node: Node, _copyStyles: boolean) => node.cloneNode(false));
        const mockLogger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
        return new SlotCloner(mockCloneNode, { copyStyles: true }, { logger: mockLogger } as any);
    };

    describe('constructor', () => {
        it('creates an instance without throwing', () => {
            expect(() => makeCloner()).not.toThrow();
        });
    });

    describe('appendChildNode', () => {
        it('is callable with valid arguments', () => {
            const cloner = makeCloner();
            const parent = document.createElement('div');
            const child = document.createElement('span');
            // No-op in JSDOM but should not throw
            expect(() => cloner.appendChildNode(parent, child, true)).not.toThrow();
        });
    });

    describe('cloneChildNodes', () => {
        it('handles element without shadow DOM', () => {
            const cloner = makeCloner();
            const source = document.createElement('div');
            source.appendChild(document.createTextNode('hello'));
            const clone = document.createElement('div');

            expect(() => cloner.cloneChildNodes(source, clone, true)).not.toThrow();
        });

        it('handles element with child elements', () => {
            const cloner = makeCloner();
            const source = document.createElement('div');
            source.innerHTML = '<span>a</span><em>b</em>';
            const clone = document.createElement('div');

            expect(() => cloner.cloneChildNodes(source, clone, true)).not.toThrow();
            // clone should now contain cloned children
            expect(clone.children.length).toBe(2);
        });
    });

    describe('additional smoke tests', () => {
        const cloneNodeFn = (node: Node, _copyStyles: boolean): Node => node.cloneNode(true);

        it('cloneChildNodes does not throw for simple element', () => {
            const cloner = new SlotCloner(cloneNodeFn, { copyStyles: true }, createMockContext());
            const original = document.createElement('div');
            const text = document.createTextNode('hello');
            original.appendChild(text);
            const clone = document.createElement('div');

            expect(() => {
                cloner.cloneChildNodes(original, clone, true);
            }).not.toThrow();

            expect(clone.childNodes.length).toBeGreaterThan(0);
        });

        it('appendChildNode handles element nodes', () => {
            const cloner = new SlotCloner(cloneNodeFn, { copyStyles: true }, createMockContext());
            const clone = document.createElement('div');
            const child = document.createElement('span');

            expect(() => {
                cloner.appendChildNode(clone, child, true);
            }).not.toThrow();

            expect(clone.childNodes.length).toBe(1);
        });

        it('appendChildNode handles text nodes', () => {
            const cloner = new SlotCloner(cloneNodeFn, { copyStyles: true }, createMockContext());
            const clone = document.createElement('div');
            const child = document.createTextNode('text');

            expect(() => {
                cloner.appendChildNode(clone, child, true);
            }).not.toThrow();

            expect(clone.textContent).toBe('text');
        });

        it('skips elements with ignore attribute', () => {
            const cloner = new SlotCloner(cloneNodeFn, { copyStyles: true }, createMockContext());
            const original = document.createElement('div');
            const ignored = document.createElement('span');
            ignored.setAttribute(IGNORE_ATTRIBUTE, 'true');
            original.appendChild(ignored);
            const normal = document.createTextNode('visible');
            original.appendChild(normal);

            const clone = document.createElement('div');
            cloner.cloneChildNodes(original, clone, true);

            const spans = clone.querySelectorAll(`[${IGNORE_ATTRIBUTE}]`);
            expect(spans.length).toBe(0);
            expect(clone.textContent).toContain('visible');
        });
    });

    describe('IGNORE_ATTRIBUTE', () => {
        it('is a non-empty string', () => {
            expect(typeof IGNORE_ATTRIBUTE).toBe('string');
            expect(IGNORE_ATTRIBUTE.length).toBeGreaterThan(0);
        });
    });
});
