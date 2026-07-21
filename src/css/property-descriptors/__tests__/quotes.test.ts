import { describe, it, expect } from 'vitest';
import { quotes, getQuote } from '../quotes';
import { Parser } from '../../syntax/parser';

const parse = (value: string) => quotes.parse(null!, Parser.parseValues(value));

describe('quotes', () => {
    it('empty tokens returns null', () => {
        expect(parse('')).toBeNull();
    });

    it('none returns null', () => {
        expect(parse('none')).toBeNull();
    });

    it('odd number of strings returns null', () => {
        expect(parse('"a" "b" "c"')).toBeNull();
    });

    it('single quote pair', () => {
        const result = parse('"«" "»"');
        expect(result).toEqual([{ open: '«', close: '»' }]);
    });

    it('multiple quote pairs', () => {
        const result = parse('"«" "»" "‹" "›"');
        expect(result).toEqual([
            { open: '«', close: '»' },
            { open: '‹', close: '›' }
        ]);
    });
});

describe('getQuote', () => {
    const q = [
        { open: '«', close: '»' },
        { open: '‹', close: '›' }
    ];

    it('returns open quote at depth 0', () => {
        expect(getQuote(q, 0, true)).toBe('«');
    });

    it('returns close quote at depth 0', () => {
        expect(getQuote(q, 0, false)).toBe('»');
    });

    it('returns second-level quote at depth 1', () => {
        expect(getQuote(q, 1, true)).toBe('‹');
    });

    it('clamps to last level when depth exceeds length', () => {
        expect(getQuote(q, 5, true)).toBe('‹');
    });

    it('returns empty string for null quotes', () => {
        expect(getQuote(null, 0, true)).toBe('');
    });
});
