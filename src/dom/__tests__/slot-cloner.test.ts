import { describe, it, expect, vi } from 'vitest';
import { SlotCloner } from '../slot-cloner';

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
});
