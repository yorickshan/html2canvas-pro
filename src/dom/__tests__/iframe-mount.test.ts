import { describe, it, expect, vi } from 'vitest';
import { addBase, createIFrameContainer, resolveTrustedTypesPolicy } from '../iframe-mount';
import { IGNORE_ATTRIBUTE } from '../slot-cloner';
import { Context } from '../../core/context';
import { Html2CanvasConfig } from '../../config';
import { Bounds } from '../../css/layout/bounds';

describe('createIFrameContainer', () => {
    it('creates a hidden, fixed-position iframe sized to the bounds', () => {
        const iframe = createIFrameContainer(document, new Bounds(0, 0, 800, 600));

        expect(iframe.className).toBe('html2canvas-container');
        expect(iframe.style.visibility).toBe('hidden');
        expect(iframe.style.position).toBe('fixed');
        expect(iframe.style.left).toBe('-10000px');
        expect(iframe.width).toBe('800');
        expect(iframe.height).toBe('600');
        expect(iframe.getAttribute(IGNORE_ATTRIBUTE)).toBe('true');
    });

    it('appends to <body> by default and to a custom container when given', () => {
        const iframe = createIFrameContainer(document, new Bounds(0, 0, 100, 100));
        expect(iframe.parentNode).toBe(document.body);
        iframe.remove();

        const custom = document.createElement('div');
        const iframe2 = createIFrameContainer(document, new Bounds(0, 0, 100, 100), custom);
        expect(iframe2.parentNode).toBe(custom);
    });
});

describe('addBase', () => {
    it('inserts a <base href> at the head of the cloned document', () => {
        const doc = document.implementation.createHTMLDocument('clone');
        doc.head.appendChild(doc.createElement('title'));
        addBase(doc.documentElement as HTMLElement, 'http://localhost/page');

        const base = doc.head.querySelector('base');
        expect(base).toBeTruthy();
        expect(base!.getAttribute('href')).toBe('http://localhost/page');
        // The base must take precedence: it is inserted before existing head nodes.
        expect(doc.head.firstChild).toBe(base);
    });
});

describe('Context.adjustWindowBounds', () => {
    it('shifts windowBounds and exposes them read-only', () => {
        const config = new Html2CanvasConfig({ window: window as unknown as Window });
        const context = new Context(
            { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
            new Bounds(10, 20, 800, 600),
            config
        );
        expect(context.windowBounds.left).toBe(10);
        expect(context.windowBounds.top).toBe(20);

        context.adjustWindowBounds(5, -3);
        expect(context.windowBounds.left).toBe(15);
        expect(context.windowBounds.top).toBe(17);
        expect(context.windowBounds.width).toBe(800);
        expect(context.windowBounds.height).toBe(600);
    });
});

describe('resolveTrustedTypesPolicy', () => {
    it('returns null when Trusted Types are unavailable', () => {
        expect(resolveTrustedTypesPolicy(null)).toBeNull();
        expect(resolveTrustedTypesPolicy({} as Window)).toBeNull();
    });

    it('creates the policy once per realm and reuses it', () => {
        const createPolicy = vi.fn(() => ({ createHTML: (s: string) => s }));
        const win = { trustedTypes: { createPolicy } } as unknown as Window;

        const first = resolveTrustedTypesPolicy(win);
        const second = resolveTrustedTypesPolicy(win);

        expect(createPolicy).toHaveBeenCalledTimes(1);
        expect(second).toBe(first);
        expect(first?.createHTML('<html></html>')).toBe('<html></html>');
    });

    it('caches failures so a refused policy does not throw again on later renders', () => {
        const createPolicy = vi.fn(() => {
            throw new TypeError('Policy names must be unique');
        });
        const win = { trustedTypes: { createPolicy } } as unknown as Window;

        expect(resolveTrustedTypesPolicy(win)).toBeNull();
        expect(resolveTrustedTypesPolicy(win)).toBeNull();
        expect(createPolicy).toHaveBeenCalledTimes(1);
    });
});
