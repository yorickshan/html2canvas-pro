/**
 * Regression tests for issue #225.
 *
 * Some browsers report a *whitespace-only* computed value for certain CSS
 * properties on web-component shadow styles (e.g. DWC components). The CSS
 * tokenizer emits only an EOF token for such input, so `parseComponentValue()`
 * threw "Error parsing CSS component value, unexpected EOF", crashing the
 * whole capture. The parser layer now falls back to the descriptor's
 * initialValue for empty/whitespace-only values.
 */
import { describe, it, expect } from 'vitest';
import { CSSParsedDeclaration } from '../index';
import { Parser } from '../syntax/parser';
import { Context } from '../../core/context';
import { Tokenizer, TokenType } from '../syntax/tokenizer';

const context = { cache: { addImage: () => {} } } as unknown as Context;

const declaration = (overrides: Record<string, string>): CSSStyleDeclaration => {
    const values: Record<string, string> = {
        display: 'block',
        opacity: '1',
        visibility: 'visible',
        color: 'rgb(0, 0, 0)',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        borderTopColor: 'rgb(0, 0, 0)',
        borderRightColor: 'rgb(0, 0, 0)',
        borderBottomColor: 'rgb(0, 0, 0)',
        borderLeftColor: 'rgb(0, 0, 0)',
        textDecorationColor: 'rgb(0, 0, 0)',
        textDecorationLine: 'none',
        borderTopWidth: '0px',
        borderRightWidth: '0px',
        borderBottomWidth: '0px',
        borderLeftWidth: '0px',
        borderTopStyle: 'none',
        borderRightStyle: 'none',
        borderBottomStyle: 'none',
        borderLeftStyle: 'none',
        boxShadow: 'none',
        textShadow: 'none',
        transform: 'none',
        rotate: 'none',
        fontFamily: 'sans-serif',
        fontSize: '16px',
        fontWeight: '400',
        fontStyle: 'normal',
        lineHeight: 'normal',
        letterSpacing: 'normal',
        marginTop: '0px',
        marginRight: '0px',
        marginBottom: '0px',
        marginLeft: '0px',
        paddingTop: '0px',
        paddingRight: '0px',
        paddingBottom: '0px',
        paddingLeft: '0px',
        backgroundImage: 'none',
        backgroundPosition: '0% 0%',
        backgroundSize: 'auto',
        backgroundRepeat: 'repeat',
        backgroundOrigin: 'padding-box',
        backgroundClip: 'border-box',
        position: 'static',
        float: 'none',
        overflow: 'visible',
        zIndex: 'auto',
        cssFloat: 'none'
    };
    const cssStyle: Record<string, string> = { ...values, ...overrides };
    return new Proxy({} as CSSStyleDeclaration, {
        get: (_target, prop: string) => {
            if (prop === 'toString') {
                return () => '[object CSSStyleDeclaration]';
            }
            return cssStyle[prop] ?? '';
        }
    });
};

describe('CSSParsedDeclaration with whitespace-only computed values (issue #225)', () => {
    it('does not throw when color is whitespace-only', () => {
        expect(() => new CSSParsedDeclaration(context, declaration({ color: '   ' }))).not.toThrow();
    });

    it('falls back to the initial value for whitespace-only color', () => {
        const parsed = new CSSParsedDeclaration(context, declaration({ color: '   ' }));
        // initialValue for color is 'transparent'
        expect(parsed.color).toBe(0x00000000);
    });

    it('does not throw when backgroundColor is whitespace-only', () => {
        expect(() => new CSSParsedDeclaration(context, declaration({ backgroundColor: '' }))).not.toThrow();
    });

    it('does not throw when boxShadow is whitespace-only', () => {
        expect(() => new CSSParsedDeclaration(context, declaration({ boxShadow: ' \n\t ' }))).not.toThrow();
        const parsed = new CSSParsedDeclaration(context, declaration({ boxShadow: '   ' }));
        // initialValue for box-shadow is 'none'
        expect(parsed.boxShadow).toEqual([]);
    });

    it('does not throw when textShadow is whitespace-only', () => {
        expect(() => new CSSParsedDeclaration(context, declaration({ textShadow: '   ' }))).not.toThrow();
    });

    it('does not throw when borderImageSource is whitespace-only', () => {
        expect(() => new CSSParsedDeclaration(context, declaration({ borderImageSource: '   ' }))).not.toThrow();
    });

    it('does not throw when backgroundImage is whitespace-only', () => {
        expect(() => new CSSParsedDeclaration(context, declaration({ backgroundImage: '   ' }))).not.toThrow();
    });

    it('does not throw when transform is whitespace-only', () => {
        expect(() => new CSSParsedDeclaration(context, declaration({ transform: '   ' }))).not.toThrow();
    });

    it('does not throw when content is whitespace-only', () => {
        const parsed = new CSSParsedDeclaration(context, declaration({ content: '   ' }));
        expect(parsed).toBeDefined();
    });

    it('still parses valid computed values normally', () => {
        const parsed = new CSSParsedDeclaration(context, declaration({ color: 'rgb(255, 0, 0)' }));
        expect(parsed.color).toBe(0xff0000ff);
    });
});

describe('Parser.parseValue on whitespace-only input', () => {
    it('throws the unexpected EOF error (upstream behavior kept)', () => {
        expect(() => Parser.parseValue('   ')).toThrow(/unexpected EOF/);
        expect(() => Parser.parseValue('')).toThrow(/unexpected EOF/);
    });
});

describe('tokenizer on whitespace-only input', () => {
    it('produces only a whitespace token (parser then hits EOF)', () => {
        const tokenizer = new Tokenizer();
        tokenizer.write('   ');
        const tokens = tokenizer.read();
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe(TokenType.WHITESPACE_TOKEN);
    });
});
