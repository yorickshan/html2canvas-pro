import { afterEach, describe, expect, it } from 'vitest';
import { parseFilterReference, resolveFilterReferences } from '../filter-reference';

const SVG_NS = 'http://www.w3.org/2000/svg';
const box = { width: 200, height: 100 };

const mount = (markup: string): HTMLElement => {
    const host = document.createElement('div');
    host.innerHTML = `<svg width="0" height="0"><defs>${markup}</defs></svg><div id="target"></div>`;
    document.body.appendChild(host);
    return host.querySelector('#target') as HTMLElement;
};

afterEach(() => {
    document.body.innerHTML = '';
});

describe('parseFilterReference', () => {
    it.each([
        ['"#f"', '#f'],
        ["'#inner-shadow-1'", '#inner-shadow-1'],
        ['#f', '#f'],
        [' "#f" ', '#f']
    ])('accepts the same-document reference %s', (body, expected) => {
        expect(parseFilterReference(body)).toBe(expected);
    });

    it.each(['"filters.svg#f"', '"https://example.com/a.svg#f"', '"#"', '""', '"#f\'', '"#a b"'])(
        'rejects %s',
        (body) => {
            expect(parseFilterReference(body)).toBeNull();
        }
    );
});

describe('resolveFilterReferences', () => {
    it('skips filters without url() references', () => {
        const target = mount('');
        expect(resolveFilterReferences(target, null, box)).toBeUndefined();
        expect(resolveFilterReferences(target, 'blur(2px)', box)).toBeUndefined();
    });

    it('converts the default objectBoundingBox region to user space around the border box', () => {
        const target = mount('<filter id="f"><feOffset dx="2"/></filter>');
        const reference = resolveFilterReferences(target, 'url("#f") blur(2px)', box)?.get('#f');

        expect(reference?.region).toEqual({ x: -20, y: -10, width: 240, height: 120 });
        expect(reference?.outset).toBe(20);
        const copy = reference?.element as SVGFilterElement;
        expect(copy.namespaceURI).toBe(SVG_NS);
        expect(copy.getAttribute('filterUnits')).toBe('userSpaceOnUse');
        expect(copy.getAttribute('x')).toBe('-20');
        expect(copy.getAttribute('width')).toBe('240');
        expect(copy.hasAttribute('id')).toBe(false);
        expect(copy.querySelector('feOffset')?.getAttribute('dx')).toBe('2');
        // The copy is detached: rendering never touches the document's filter.
        expect(copy.isConnected).toBe(false);
        expect(document.getElementById('f')?.getAttribute('filterUnits')).toBeNull();
    });

    it('reads fractions and percentages of the border box', () => {
        const target = mount('<filter id="f" x="0" y="-25%" width="1.5" height="150%"><feOffset/></filter>');
        expect(resolveFilterReferences(target, 'url("#f")', box)?.get('#f')?.region).toEqual({
            x: 0,
            y: -25,
            width: 300,
            height: 150
        });
    });

    it('keeps absolute userSpaceOnUse regions relative to the border box', () => {
        const target = mount(
            '<filter id="f" filterUnits="userSpaceOnUse" x="-5" y="-6px" width="210" height="130"><feOffset/></filter>'
        );
        const reference = resolveFilterReferences(target, 'url("#f")', box)?.get('#f');
        expect(reference?.region).toEqual({ x: -5, y: -6, width: 210, height: 130 });
        expect(reference?.outset).toBe(24);
    });

    it('resolves every distinct reference in the chain once', () => {
        const target = mount('<filter id="a"><feOffset/></filter><filter id="b"><feOffset/></filter>');
        const references = resolveFilterReferences(target, 'url("#a") blur(1px) url("#b") url("#a")', box);
        expect(Array.from(references?.keys() ?? [])).toEqual(['#a', '#b']);
    });

    it.each([
        ['a missing element', '<filter id="other"><feOffset/></filter>'],
        ['a non-filter element', '<linearGradient id="f"></linearGradient>'],
        ['objectBoundingBox primitive units', '<filter id="f" primitiveUnits="objectBoundingBox"><feOffset/></filter>'],
        ['an inherited filter', '<filter id="base"><feOffset/></filter><filter id="f" href="#base"></filter>'],
        ['an feImage input', '<filter id="f"><feImage href="data:image/png;base64,AA=="/></filter>'],
        ['a percentage primitive subregion', '<filter id="f"><feFlood width="50%"/></filter>'],
        ['a viewport-relative user-space region', '<filter id="f" filterUnits="userSpaceOnUse"><feOffset/></filter>'],
        ['an empty region', '<filter id="f" width="0"><feOffset/></filter>']
    ])('leaves %s unresolved', (_name, markup) => {
        const target = mount(markup);
        expect(resolveFilterReferences(target, 'url("#f")', box)?.has('#f')).toBe(false);
    });

    it('inlines computed presentation properties set by stylesheets', () => {
        const target = mount('<filter id="f"><feFlood class="tint"/></filter>');
        const style = document.createElement('style');
        style.textContent = '.tint { flood-color: rgb(255, 0, 0); flood-opacity: 0.5; }';
        document.head.appendChild(style);
        try {
            const flood = resolveFilterReferences(target, 'url("#f")', box)
                ?.get('#f')
                ?.element.querySelector('feFlood');
            expect(flood?.getAttribute('flood-color')).toBe('rgb(255, 0, 0)');
            expect(flood?.getAttribute('flood-opacity')).toBe('0.5');
        } finally {
            style.remove();
        }
    });
});
