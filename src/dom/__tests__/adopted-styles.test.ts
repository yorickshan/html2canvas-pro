import { describe, it, expect, vi } from 'vitest';
import { serializeStyleSheetRules, createAdoptedStylesElement } from '../adopted-styles';
import { SlotCloner } from '../slot-cloner';

const makeLogger = () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() });

const makeCloner = (options: { copyStyles: boolean; cspNonce?: string }) =>
    new SlotCloner((node: Node, _copyStyles: boolean) => node.cloneNode(true), options, {
        logger: makeLogger()
    } as never);

describe('serializeStyleSheetRules', () => {
    it('concatenates cssText of all rules across sheets', () => {
        const a = new CSSStyleSheet();
        a.replaceSync('.a { color: red; }');
        const b = new CSSStyleSheet();
        b.replaceSync('.b { color: blue; } .c { color: green; }');

        const css = serializeStyleSheetRules([a, b]);
        expect(css).toContain('.a');
        expect(css).toContain('.b');
        expect(css).toContain('.c');
    });

    it('skips sheets whose cssRules cannot be read', () => {
        const readable = new CSSStyleSheet();
        readable.replaceSync('.ok { color: red; }');
        const unreadable = {
            get cssRules(): CSSRuleList {
                throw new DOMException('SecurityError', 'SecurityError');
            }
        } as unknown as CSSStyleSheet;

        expect(serializeStyleSheetRules([unreadable, readable])).toContain('.ok');
    });
});

describe('createAdoptedStylesElement', () => {
    it('returns null when the sheets carry no rules', () => {
        const sheet = new CSSStyleSheet();
        expect(createAdoptedStylesElement(document, [sheet])).toBeNull();
    });

    it('creates a style element with the serialized rules', () => {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('.x { color: red; }');
        const style = createAdoptedStylesElement(document, [sheet]);
        expect(style).not.toBeNull();
        expect(style?.textContent).toContain('.x');
        expect(style?.tagName.toLowerCase()).toBe('style');
    });

    it('applies the CSP nonce when provided', () => {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('.n { color: red; }');
        const style = createAdoptedStylesElement(document, [sheet], 'nonce-123');
        expect(style?.nonce).toBe('nonce-123');
    });
});

describe('SlotCloner adoptedStyleSheets cloning', () => {
    const makeHost = (): { host: HTMLElement; sheet: CSSStyleSheet } => {
        const host = document.createElement('x-adopted');
        const shadow = host.attachShadow({ mode: 'open' });
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('.title { color: rgb(12, 34, 56); }');
        shadow.adoptedStyleSheets = [sheet];
        const paragraph = document.createElement('p');
        shadow.appendChild(paragraph);
        return { host, sheet };
    };

    it('appends the adopted rules as a <style> inside the cloned shadow root', () => {
        const { host } = makeHost();
        const cloner = makeCloner({ copyStyles: false });
        const clone = document.createElement('div');
        clone.attachShadow({ mode: 'open' });

        cloner.cloneChildNodes(host, clone, false);

        const style = clone.shadowRoot?.querySelector('style');
        expect(style).not.toBeNull();
        expect(style?.textContent).toContain('.title');
        // Regular shadow children are still cloned alongside the rules.
        expect(clone.shadowRoot?.querySelector('p')).not.toBeNull();
    });

    it('flattens adopted rules into light DOM when the clone has no shadow root', () => {
        const { host } = makeHost();
        const cloner = makeCloner({ copyStyles: false });
        const clone = document.createElement('div');

        cloner.cloneChildNodes(host, clone, false);

        const style = clone.querySelector('style');
        expect(style).not.toBeNull();
        expect(style?.textContent).toContain('.title');
    });

    it('skips adopted sheets when computed styles are inlined (copyStyles)', () => {
        const { host } = makeHost();
        const cloner = makeCloner({ copyStyles: true });
        const clone = document.createElement('div');
        clone.attachShadow({ mode: 'open' });

        cloner.cloneChildNodes(host, clone, true);

        expect(clone.shadowRoot?.querySelector('style')).toBeNull();
    });

    it('applies the CSP nonce to the synthesized style element', () => {
        const { host } = makeHost();
        const cloner = makeCloner({ copyStyles: false, cspNonce: 'nonce-abc' });
        const clone = document.createElement('div');
        clone.attachShadow({ mode: 'open' });

        cloner.cloneChildNodes(host, clone, false);

        expect(clone.shadowRoot?.querySelector('style')?.nonce).toBe('nonce-abc');
    });

    it('does nothing for shadow roots without adopted sheets', () => {
        const host = document.createElement('x-plain');
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.appendChild(document.createElement('span'));
        const cloner = makeCloner({ copyStyles: false });
        const clone = document.createElement('div');
        clone.attachShadow({ mode: 'open' });

        cloner.cloneChildNodes(host, clone, false);

        expect(clone.shadowRoot?.querySelector('style')).toBeNull();
        expect(clone.shadowRoot?.querySelector('span')).not.toBeNull();
    });
});
