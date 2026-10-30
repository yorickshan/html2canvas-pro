import { describe, it, expect, vi } from 'vitest';
import {
    addBase,
    createIFrameContainer,
    mountCloneInIFrame,
    resolveTrustedTypesPolicy,
    stylesheetsReady
} from '../iframe-mount';
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

describe('stylesheetsReady (issue #245)', () => {
    const makeLink = (doc: Document, attrs: Record<string, string>): HTMLLinkElement => {
        const link = doc.createElement('link');
        for (const [name, value] of Object.entries(attrs)) {
            link.setAttribute(name, value);
        }
        doc.head.appendChild(link);
        return link;
    };

    it('resolves immediately when the document has no pending stylesheet links', async () => {
        const doc = document.implementation.createHTMLDocument('clone');
        makeLink(doc, { rel: 'icon', href: 'favicon.ico' });
        makeLink(doc, { rel: 'preload', as: 'style', href: 'x.css' });

        await expect(stylesheetsReady(doc)).resolves.toBeUndefined();
    });

    it('resolves immediately when every stylesheet link already has a sheet', async () => {
        const doc = document.implementation.createHTMLDocument('clone');
        const link = makeLink(doc, { rel: 'stylesheet', href: 'applied.css' });
        Object.defineProperty(link, 'sheet', { value: {} as CSSStyleSheet });

        await expect(stylesheetsReady(doc)).resolves.toBeUndefined();
    });

    it('skips alternate and disabled links that may never fire load', async () => {
        const doc = document.implementation.createHTMLDocument('clone');
        makeLink(doc, { rel: 'stylesheet alternate', href: 'alt.css' });
        const disabled = makeLink(doc, { rel: 'stylesheet', href: 'off.css' });
        disabled.disabled = true;
        makeLink(doc, { rel: 'stylesheet' });

        await expect(stylesheetsReady(doc)).resolves.toBeUndefined();
    });

    it('waits for the load event of a pending stylesheet', async () => {
        const doc = document.implementation.createHTMLDocument('clone');
        const link = makeLink(doc, { rel: 'stylesheet', href: 'slow.css' });

        let settled = false;
        const wait = stylesheetsReady(doc).then(() => {
            settled = true;
        });
        await new Promise((r) => setTimeout(r, 10));
        expect(settled).toBe(false);

        link.dispatchEvent(new Event('load'));
        await expect(wait).resolves.toBeUndefined();
    });

    it('settles on error instead of waiting out the timeout', async () => {
        const doc = document.implementation.createHTMLDocument('clone');
        const link = makeLink(doc, { rel: 'stylesheet', href: 'missing.css' });

        const wait = stylesheetsReady(doc);
        link.dispatchEvent(new Event('error'));
        await expect(wait).resolves.toBeUndefined();
    });

    it('resolves when the sheet appears without any event (already cached)', async () => {
        const doc = document.implementation.createHTMLDocument('clone');
        const link = makeLink(doc, { rel: 'stylesheet', href: 'cached.css' });

        const wait = stylesheetsReady(doc);
        await new Promise((r) => setTimeout(r, 10));
        Object.defineProperty(link, 'sheet', { value: {} as CSSStyleSheet });
        link.dispatchEvent(new Event('load'));
        await expect(wait).resolves.toBeUndefined();
    });

    it('resolves without waiting when the signal is already aborted', async () => {
        const doc = document.implementation.createHTMLDocument('clone');
        makeLink(doc, { rel: 'stylesheet', href: 'never.css' });
        const controller = new AbortController();
        controller.abort();

        await expect(stylesheetsReady(doc, undefined, controller.signal)).resolves.toBeUndefined();
    });

    it('waits for a sheet whose @import chain is still loading', async () => {
        const doc = document.implementation.createHTMLDocument('clone');
        const style = doc.createElement('style');
        style.textContent = '@import url("nested.css");\n.body { color: red; }';
        doc.head.appendChild(style);

        // jsdom's attached sheet rejects defineProperty, and no engine builds
        // a CSSImportRule we can mutate — replace the sheet with a stub whose
        // import rule models the spec: styleSheet is null while in flight.
        const importRule: { cssText: string; styleSheet: CSSStyleSheet | null } = {
            cssText: '@import url("nested.css");',
            styleSheet: null
        };
        Object.defineProperty(style, 'sheet', {
            configurable: true,
            value: { cssRules: [importRule] } as unknown as CSSStyleSheet
        });

        let settled = false;
        const wait = stylesheetsReady(doc).then(() => {
            settled = true;
        });
        await new Promise((r) => setTimeout(r, 120));
        expect(settled).toBe(false);

        // The import resolves: the rule now exposes an applied inner sheet.
        importRule.styleSheet = { cssRules: [] } as unknown as CSSStyleSheet;
        await expect(wait).resolves.toBeUndefined();
    });

    it('resolves immediately for an @import chain that is already applied', async () => {
        const doc = document.implementation.createHTMLDocument('clone');
        const style = doc.createElement('style');
        style.textContent = '@import url("nested.css");';
        doc.head.appendChild(style);
        Object.defineProperty(style, 'sheet', {
            configurable: true,
            value: {
                cssRules: [
                    {
                        cssText: '@import url("nested.css");',
                        styleSheet: { cssRules: [] }
                    }
                ]
            } as unknown as CSSStyleSheet
        });

        await expect(stylesheetsReady(doc)).resolves.toBeUndefined();
    });

    it('collects pending links inside shadow roots', async () => {
        const doc = document.implementation.createHTMLDocument('clone');
        const host = doc.createElement('div');
        doc.body.appendChild(host);
        const shadow = host.attachShadow({ mode: 'open' });
        const link = doc.createElement('link');
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('href', 'shadow.css');
        shadow.appendChild(link);

        let settled = false;
        const wait = stylesheetsReady(doc).then(() => {
            settled = true;
        });
        await new Promise((r) => setTimeout(r, 120));
        expect(settled).toBe(false);

        link.dispatchEvent(new Event('load'));
        await expect(wait).resolves.toBeUndefined();
    });

    it('warns and resolves when the stylesheet readiness budget expires', async () => {
        const doc = document.implementation.createHTMLDocument('clone');
        makeLink(doc, { rel: 'stylesheet', href: 'hangs.css' });
        const warn = vi.fn();

        await expect(stylesheetsReady(doc, { warn }, undefined, 100)).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]?.[0]).toContain('hangs.css');
    });
});

describe('mountCloneInIFrame failure cleanup', () => {
    const makeContext = (): Context =>
        new Context(
            { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
            new Bounds(0, 0, 800, 600),
            new Html2CanvasConfig({ window: window as unknown as Window })
        );

    const makeMountOptions = () => ({
        documentElement: document.createElement('div') as HTMLElement,
        clonedReferenceElement: document.createElement('div') as HTMLElement,
        referenceElementName: 'DIV',
        scrolledElements: []
    });

    it('removes the iframe it created from the DOM when the mount is aborted', async () => {
        const context = makeContext();
        const controller = new AbortController();
        const mount = { ...makeMountOptions(), signal: controller.signal };

        // The jsdom environment is shared across tests in this worker; track
        // only containers the mount itself adds.
        const before = new Set(document.querySelectorAll('iframe.html2canvas-container'));

        const mounted = mountCloneInIFrame(context, document, new Bounds(0, 0, 800, 600), mount);
        controller.abort();

        await expect(mounted).rejects.toThrow();
        // The appended container must be detached again — renderElement never
        // receives the reference on a rejected mount, so the mount owns this.
        const after = Array.from(document.querySelectorAll('iframe.html2canvas-container'));
        expect(after.filter((el) => !before.has(el))).toHaveLength(0);
    });

    // The success path needs a real iframe load event, which jsdom never
    // fires; it is covered by the css/slow-css.html reftest instead.
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
