import { describe, it, expect } from 'vitest';
import { content } from '../content';
import { Parser } from '../../syntax/parser';

const parse = (value: string) => content.parse(null!, Parser.parseValues(value));

describe('content', () => {
    it('empty tokens return empty array', () => {
        expect(parse('')).toEqual([]);
    });

    it('none returns empty array', () => {
        expect(parse('none')).toEqual([]);
    });

    it('string content returns tokens', () => {
        const result = parse('"hello"');
        expect(result.length).toBeGreaterThan(0);
    });

    it('multiple values pass through', () => {
        const result = parse('"a" "b"');
        expect(result.length).toBeGreaterThan(0);
    });
});
