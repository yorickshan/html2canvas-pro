import { describe, it, expect } from 'vitest';
import { PseudoContentResolver, PseudoElementType, createPseudoHideStyles } from '../pseudo-content';
import { CounterState } from '../../css/types/functions/counter';
import { Context } from '../../core/context';
import { Html2CanvasConfig } from '../../config';
import { Bounds } from '../../css/layout/bounds';

/**
 * Minimal CSSStyleDeclaration stand-in: resolvePseudoContent only reads
 * `content`, `display`, `quotes` and (via copyCSSStyles) the item iteration
 * protocol.
 */
const makeStyle = (content: string, extra: Record<string, string> = {}): CSSStyleDeclaration =>
    ({
        content,
        display: 'block',
        ...extra,
        length: 0,
        item: () => '',
        getPropertyValue: () => '',
        getPropertyPriority: () => ''
    }) as unknown as CSSStyleDeclaration;

describe('PseudoContentResolver', () => {
    const createResolver = () => {
        const config = new Html2CanvasConfig({ window: window as unknown as Window });
        const context = new Context(
            { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
            new Bounds(0, 0, 800, 600),
            config
        );
        return new PseudoContentResolver(context, new CounterState());
    };

    const resolve = (content: string, node?: Element) => {
        const resolver = createResolver();
        const clone = document.createElement('div');
        const target = node ?? document.createElement('div');
        const result = resolver.resolvePseudoContent(target, clone, makeStyle(content), PseudoElementType.BEFORE);
        return { result, clone };
    };

    it('resolves a string content into a text node', () => {
        const { result } = resolve('"prefix-"');
        expect(result).toBeTruthy();
        expect(result!.textContent).toBe('prefix-');
        expect(result!.tagName).toBe('HTML2CANVASPSEUDOELEMENT');
    });

    it('resolves attr() from the source element attributes', () => {
        const node = document.createElement('div');
        node.setAttribute('data-label', 'value');
        const { result } = resolve('attr(data-label)', node);
        expect(result!.textContent).toBe('value');
    });

    it('resolves a url() content into an img surrogate', () => {
        const { result } = resolve('url(http://localhost/img.png)');
        const img = result!.querySelector('img');
        expect(img).toBeTruthy();
        expect(img!.getAttribute('src')).toBe('http://localhost/img.png');
    });

    it('resolves counter() to a decimal text node (default value 1)', () => {
        const { result } = resolve('counter(chapter)');
        expect(result!.textContent).toBe('1');
    });

    it('resolves open-quote and close-quote with the quotes style', () => {
        const resolver = createResolver();
        const clone = document.createElement('div');
        const open = resolver.resolvePseudoContent(
            document.createElement('div'),
            clone,
            makeStyle('open-quote', { quotes: '"«" "»"' }),
            PseudoElementType.BEFORE
        );
        expect(open!.textContent).toBe('«');

        const close = resolver.resolvePseudoContent(
            document.createElement('div'),
            clone,
            makeStyle('close-quote', { quotes: '"«" "»"' }),
            PseudoElementType.AFTER
        );
        expect(close!.textContent).toBe('»');
    });

    it('returns undefined for content: none', () => {
        const { result } = resolve('none');
        expect(result).toBeUndefined();
    });

    it('returns undefined when the pseudo is display: none', () => {
        const resolver = createResolver();
        const clone = document.createElement('div');
        const result = resolver.resolvePseudoContent(
            document.createElement('div'),
            clone,
            makeStyle('"x"', { display: 'none' }),
            PseudoElementType.AFTER
        );
        expect(result).toBeUndefined();
    });

    it('appends the matching hide class to the clone', () => {
        const { clone } = resolve('"x"');
        expect(clone.className).toContain('___html2canvas___pseudoelement_before');

        const resolver = createResolver();
        const afterClone = document.createElement('div');
        resolver.resolvePseudoContent(
            document.createElement('div'),
            afterClone,
            makeStyle('"x"'),
            PseudoElementType.AFTER
        );
        expect(afterClone.className).toContain('___html2canvas___pseudoelement_after');
    });

    it('keeps quote depth across sequential open/close calls', () => {
        const config = new Html2CanvasConfig({ window: window as unknown as Window });
        const context = new Context(
            { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
            new Bounds(0, 0, 800, 600),
            config
        );
        const resolver = new PseudoContentResolver(context, new CounterState());
        const clone = document.createElement('div');
        // Two quote pairs: depth is clamped per level (a,b) then (c,d).
        const openStyle = () => makeStyle('open-quote', { quotes: '"a" "b" "c" "d"' });
        const closeStyle = () => makeStyle('close-quote', { quotes: '"a" "b" "c" "d"' });
        // Nesting: a … c … d … b
        expect(
            resolver.resolvePseudoContent(document.createElement('div'), clone, openStyle(), PseudoElementType.BEFORE)!
                .textContent
        ).toBe('a');
        expect(
            resolver.resolvePseudoContent(document.createElement('div'), clone, openStyle(), PseudoElementType.BEFORE)!
                .textContent
        ).toBe('c');
        expect(
            resolver.resolvePseudoContent(document.createElement('div'), clone, closeStyle(), PseudoElementType.AFTER)!
                .textContent
        ).toBe('d');
        expect(
            resolver.resolvePseudoContent(document.createElement('div'), clone, closeStyle(), PseudoElementType.AFTER)!
                .textContent
        ).toBe('b');
    });
});

describe('createPseudoHideStyles', () => {
    it('injects a style element hiding both surrogate classes', () => {
        const body = document.createElement('body');
        createPseudoHideStyles(body, 'nonce-123');
        const style = body.querySelector('style');
        expect(style).toBeTruthy();
        expect(style!.textContent).toContain('___html2canvas___pseudoelement_before:before');
        expect(style!.textContent).toContain('___html2canvas___pseudoelement_after:after');
        expect(style!.getAttribute('nonce')).toBe('nonce-123');
    });
});
