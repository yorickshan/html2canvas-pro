import { describe, it, expect } from 'vitest';
import { Parser } from '../../syntax/parser';
import { time } from '../time';
import { Context } from '../../../core/context';

const parse = (value: string) => time.parse({} as Context, Parser.parseValue(value));

describe('time type descriptor', () => {
    it('parses seconds to milliseconds', () => {
        expect(parse('1s')).toBe(1000);
        expect(parse('0.5s')).toBe(500);
        expect(parse('2s')).toBe(2000);
    });

    it('parses milliseconds directly', () => {
        expect(parse('100ms')).toBe(100);
        expect(parse('0ms')).toBe(0);
        expect(parse('500ms')).toBe(500);
    });

    it('throws for invalid input', () => {
        expect(() => parse('invalid')).toThrow('Unsupported time type');
    });
});
