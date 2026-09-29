import { describe, expect, it, vi } from 'vitest';
import { SlotCloner, IGNORE_ATTRIBUTE } from '../slot-cloner';
import { Context } from '../../core/context';
import { Html2CanvasConfig } from '../../config';
import { Bounds } from '../../css/layout/bounds';

const createContext = (): Context => {
    const config = new Html2CanvasConfig({ window: window as unknown as Window });
    return new Context(
        { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
        new Bounds(0, 0, 800, 600),
        config
    );
};

/**
 * Builds a SlotCloner whose cloneNodeFn performs a real deep DOM clone so the
 * produced trees can be inspected structurally.
 */
const createCloner = (context: Context, options = { copyStyles: false }) =>
    new SlotCloner((node: Node) => node.cloneNode(true), options, context);

describe('SlotCloner with real shadow DOM', () => {
    it('clones shadow DOM content into the clone shadow root', () => {
        const context = createContext();
        const cloner = createCloner(context);

        const host = document.createElement('my-widget');
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = '<p class="inner">shadow text</p>';

        const clone = document.createElement('my-widget');
        clone.attachShadow({ mode: 'open' });

        cloner.cloneChildNodes(host, clone, false);

        expect(clone.shadowRoot!.querySelector('p.inner')?.textContent).toBe('shadow text');
    });

    it('resolves slotted light-DOM content into the cloned shadow root', () => {
        const context = createContext();
        const cloner = createCloner(context);

        const host = document.createElement('my-widget');
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = '<slot></slot>';
        const label = document.createElement('span');
        label.textContent = 'slotted label';
        host.appendChild(label);

        const clone = document.createElement('my-widget');
        clone.attachShadow({ mode: 'open' });
        clone.shadowRoot!.appendChild(document.createElement('slot'));

        cloner.cloneChildNodes(host, clone, false);

        const shadowText = clone.shadowRoot!.textContent ?? '';
        expect(shadowText).toContain('slotted label');
    });

    it('falls back to slot fallback content when nothing is assigned', () => {
        const context = createContext();
        const cloner = createCloner(context);

        const host = document.createElement('my-widget');
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = '<slot>default content</slot>';

        const clone = document.createElement('my-widget');
        clone.attachShadow({ mode: 'open' });
        clone.shadowRoot!.appendChild(document.createElement('slot'));

        cloner.cloneChildNodes(host, clone, false);

        expect(clone.shadowRoot!.textContent).toContain('default content');
    });

    it('flattens shadow DOM into light DOM when the clone has no shadow root', () => {
        const context = createContext();
        const cloner = createCloner(context);

        const host = document.createElement('my-widget');
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = '<p>shadow-only content</p>';
        const label = document.createElement('span');
        label.textContent = 'light content';
        host.appendChild(label);

        // Clone without a shadow root (clonable:false components).
        const clone = document.createElement('div');
        cloner.cloneChildNodes(host, clone, false);

        // The fallback preserves the shadow content (slot assignment included);
        // direct light-DOM children of a shadow host are not part of the shadow
        // render output unless referenced by a slot.
        expect(clone.textContent ?? '').toContain('shadow-only content');
    });

    it('skips script elements and IGNORE_ATTRIBUTE elements', () => {
        const context = createContext();
        const cloner = createCloner(context);

        const host = document.createElement('div');
        host.innerHTML =
            '<p>kept</p><script>evil()</script><div ' + IGNORE_ATTRIBUTE + '="true">ignored</div><span>kept too</span>';

        const clone = document.createElement('div');
        cloner.cloneChildNodes(host, clone, false);

        const text = clone.textContent ?? '';
        expect(text).toContain('kept');
        expect(text).toContain('kept too');
        expect(text).not.toContain('ignored');
        expect(clone.querySelector('script')).toBeNull();
    });

    it('honours a custom ignoreElements predicate', () => {
        const context = createContext();
        const ignore = vi.fn((el: Element) => el.classList.contains('skip-me'));
        const cloner = new SlotCloner(
            (node: Node) => node.cloneNode(true),
            { copyStyles: false, ignoreElements: ignore },
            context
        );

        const host = document.createElement('div');
        host.innerHTML = '<p class="skip-me">no</p><p class="keep-me">yes</p>';

        const clone = document.createElement('div');
        cloner.cloneChildNodes(host, clone, false);

        expect(ignore).toHaveBeenCalled();
        expect(clone.textContent).toContain('yes');
        expect(clone.textContent).not.toContain('no');
    });

    it('drops <style> children when copyStyles is true (styles are copied inline)', () => {
        const context = createContext();
        const cloner = createCloner(context, { copyStyles: true });

        const host = document.createElement('div');
        host.innerHTML = '<style>p { color: red }</style><p>text</p>';

        const clone = document.createElement('div');
        cloner.cloneChildNodes(host, clone, true);

        expect(clone.querySelector('style')).toBeNull();
        expect(clone.textContent).toContain('text');
    });
});
