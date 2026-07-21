import { describe, it, expect } from 'vitest';
import {
    Parser,
    isDimensionToken,
    isNumberToken,
    isIdentToken,
    isStringToken,
    isIdentWithValue,
    nonWhiteSpace,
    nonFunctionArgSeparator,
    parseFunctionArgs
} from '../parser';
import { TokenType } from '../token-types';

describe('isDimensionToken', () => {
    it('returns true for DIMENSION_TOKEN', () => {
        expect(isDimensionToken({ type: TokenType.DIMENSION_TOKEN, flags: 0, unit: 'px', number: 10 })).toBe(true);
    });

    it('returns false for non-dimension tokens', () => {
        expect(isDimensionToken({ type: TokenType.NUMBER_TOKEN, flags: 0, number: 5 })).toBe(false);
        expect(isDimensionToken({ type: TokenType.IDENT_TOKEN, value: 'auto' })).toBe(false);
    });
});

describe('isNumberToken', () => {
    it('returns true for NUMBER_TOKEN', () => {
        expect(isNumberToken({ type: TokenType.NUMBER_TOKEN, flags: 0, number: 10 })).toBe(true);
    });

    it('returns false for PERCENTAGE_TOKEN', () => {
        expect(isNumberToken({ type: TokenType.PERCENTAGE_TOKEN, flags: 0, number: 50 })).toBe(false);
    });

    it('returns false for other tokens', () => {
        expect(isNumberToken({ type: TokenType.IDENT_TOKEN, value: 'auto' })).toBe(false);
        expect(isNumberToken({ type: TokenType.DIMENSION_TOKEN, flags: 0, unit: 'px', number: 10 })).toBe(false);
    });
});

describe('isIdentToken', () => {
    it('returns true for IDENT_TOKEN', () => {
        expect(isIdentToken({ type: TokenType.IDENT_TOKEN, value: 'auto' })).toBe(true);
    });

    it('returns false for non-ident tokens', () => {
        expect(isIdentToken({ type: TokenType.NUMBER_TOKEN, flags: 0, number: 0 })).toBe(false);
        expect(isIdentToken({ type: TokenType.STRING_TOKEN, value: 'hello' })).toBe(false);
    });
});

describe('isStringToken', () => {
    it('returns true for STRING_TOKEN', () => {
        expect(isStringToken({ type: TokenType.STRING_TOKEN, value: 'hello' })).toBe(true);
    });

    it('returns false for non-string tokens', () => {
        expect(isStringToken({ type: TokenType.IDENT_TOKEN, value: 'hello' })).toBe(false);
    });
});

describe('isIdentWithValue', () => {
    it('returns true when ident token has matching value', () => {
        expect(isIdentWithValue({ type: TokenType.IDENT_TOKEN, value: 'auto' }, 'auto')).toBe(true);
    });

    it('returns false when ident token has different value', () => {
        expect(isIdentWithValue({ type: TokenType.IDENT_TOKEN, value: 'auto' }, 'none')).toBe(false);
    });

    it('returns false for non-ident tokens', () => {
        expect(isIdentWithValue({ type: TokenType.NUMBER_TOKEN, flags: 0, number: 0 }, '0')).toBe(false);
    });
});

describe('nonWhiteSpace', () => {
    it('returns true for non-whitespace tokens', () => {
        expect(nonWhiteSpace({ type: TokenType.IDENT_TOKEN, value: 'auto' })).toBe(true);
    });

    it('returns false for whitespace tokens', () => {
        expect(nonWhiteSpace({ type: TokenType.WHITESPACE_TOKEN })).toBe(false);
    });
});

describe('nonFunctionArgSeparator', () => {
    it('returns true for non-comma and non-whitespace tokens', () => {
        expect(nonFunctionArgSeparator({ type: TokenType.IDENT_TOKEN, value: 'x' })).toBe(true);
        expect(nonFunctionArgSeparator({ type: TokenType.NUMBER_TOKEN, flags: 0, number: 1 })).toBe(true);
    });

    it('returns false for commas and whitespace', () => {
        expect(nonFunctionArgSeparator({ type: TokenType.COMMA_TOKEN })).toBe(false);
        expect(nonFunctionArgSeparator({ type: TokenType.WHITESPACE_TOKEN })).toBe(false);
    });
});

describe('parseFunctionArgs', () => {
    it('splits tokens by commas into argument groups', () => {
        const tokens = [
            { type: TokenType.NUMBER_TOKEN, flags: 0, number: 1 },
            { type: TokenType.COMMA_TOKEN },
            { type: TokenType.NUMBER_TOKEN, flags: 0, number: 2 },
            { type: TokenType.COMMA_TOKEN },
            { type: TokenType.NUMBER_TOKEN, flags: 0, number: 3 }
        ];
        const args = parseFunctionArgs(tokens);
        expect(args).toHaveLength(3);
        expect(args[0]).toHaveLength(1);
        expect(args[1]).toHaveLength(1);
        expect(args[2]).toHaveLength(1);
    });

    it('handles empty argument list', () => {
        expect(parseFunctionArgs([])).toHaveLength(0);
    });

    it('handles single argument with whitespace', () => {
        const tokens = [
            { type: TokenType.WHITESPACE_TOKEN },
            { type: TokenType.NUMBER_TOKEN, flags: 0, number: 1 },
            { type: TokenType.WHITESPACE_TOKEN }
        ];
        const args = parseFunctionArgs(tokens);
        expect(args).toHaveLength(1);
        expect(args[0]).toHaveLength(1);
    });
});

describe('Parser static methods', () => {
    it('parseValue returns a CSSValue', () => {
        const value = Parser.parseValue('10px');
        expect(value).toBeDefined();
    });

    it('parseValues returns array of CSSValues', () => {
        const values = Parser.parseValues('10px 20px');
        expect(Array.isArray(values)).toBe(true);
        expect(values.length).toBeGreaterThan(0);
    });

    it('create returns a Parser instance', () => {
        const p = Parser.create('auto');
        expect(p).toBeDefined();
    });
});
