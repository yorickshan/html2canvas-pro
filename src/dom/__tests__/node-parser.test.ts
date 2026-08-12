/**
 * Regression tests for issue #226.
 *
 * Web component labels that live in the shadow DOM (either as bare text
 * assigned to a `<slot>` or as an element assigned to a slot) were silently
 * dropped by the parser: the slot branch recursed with `parseNodeTree(node)`,
 * which only iterates `node.firstChild` — and text nodes have no children, so
 * slotted text never became a TextContainer. Slotted elements (e.g. the
 * `dwc-field` inside `dwc-combobox`) were skipped entirely, so their shadow
 * subtrees were never rendered.
 *
 * The host element is nested inside a plain parent so the parser only reaches
 * the slotted content through the `<slot>` branch (the root element's light
 * DOM children are always iterated directly and would mask the bug).
 */
import { describe, it, expect } from 'vitest';
import { parseTree } from '../node-parser';
import { Context } from '../../core/context';
import { Html2CanvasConfig } from '../../config';
import { Bounds } from '../../css/layout/bounds';
import { ElementContainer } from '../element-container';

const context = new Context(
    { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
    new Bounds(0, 0, 800, 600),
    new Html2CanvasConfig({ window: window })
);

/** Collect all text nodes across a parsed container tree. */
const collectTexts = (container: ElementContainer, acc: string[] = []): string[] => {
    for (const textNode of container.textNodes) {
        acc.push(textNode.text);
    }
    for (const child of container.elements) {
        collectTexts(child, acc);
    }
    return acc;
};

describe('parseTree with slotted shadow DOM content (issue #226)', () => {
    it('parses bare text assigned to a slot into the slot parent', () => {
        const parent = document.createElement('div');
        const host = document.createElement('div');
        host.textContent = 'slotted label';
        const root = host.attachShadow({ mode: 'open' });
        const slotParent = document.createElement('div');
        const slot = document.createElement('slot');
        slotParent.appendChild(slot);
        root.appendChild(slotParent);
        parent.appendChild(host);

        const parsed = parseTree(context, parent);
        expect(collectTexts(parsed)).toContain('slotted label');
    });

    it('parses an element assigned to a slot as a container with its children', () => {
        const parent = document.createElement('div');
        const host = document.createElement('div');
        const slottedSpan = document.createElement('span');
        slottedSpan.textContent = 'inner text';
        host.appendChild(slottedSpan);
        const root = host.attachShadow({ mode: 'open' });
        const slotParent = document.createElement('div');
        const slot = document.createElement('slot');
        slotParent.appendChild(slot);
        root.appendChild(slotParent);
        parent.appendChild(host);

        const parsed = parseTree(context, parent);
        expect(collectTexts(parsed)).toContain('inner text');
    });

    it('parses the shadow root of a slotted custom element', () => {
        const parent = document.createElement('div');
        const host = document.createElement('div');
        const slottedCustom = document.createElement('div');
        host.appendChild(slottedCustom);
        const innerRoot = slottedCustom.attachShadow({ mode: 'open' });
        const label = document.createElement('label');
        label.textContent = 'field label';
        innerRoot.appendChild(label);
        const root = host.attachShadow({ mode: 'open' });
        const slotParent = document.createElement('div');
        const slot = document.createElement('slot');
        slotParent.appendChild(slot);
        root.appendChild(slotParent);
        parent.appendChild(host);

        const parsed = parseTree(context, parent);
        expect(collectTexts(parsed)).toContain('field label');
    });

    it('keeps parsing regular light DOM text', () => {
        const div = document.createElement('div');
        div.textContent = 'plain text';
        const parsed = parseTree(context, div);
        expect(collectTexts(parsed)).toContain('plain text');
    });
});
