import { describe, it, expect } from 'vitest';
import { boxShadow } from '../box-shadow';
import { Parser } from '../../syntax/parser';

const parse = (value: string) => boxShadow.parse(null!, Parser.parseValues(value));

describe('box-shadow', () => {
    it('none returns empty array', () => {
        const result = parse('none');
        expect(result).toEqual([]);
    });

    it('parses single shadow with offset only', () => {
        const result = parse('5px 10px');
        expect(result.length).toBe(1);
        expect(result[0].inset).toBe(false);
        expect(result[0].offsetX.number).toBe(5);
        expect(result[0].offsetY.number).toBe(10);
    });

    it('parses inset shadow', () => {
        const result = parse('inset 2px 2px 5px');
        expect(result.length).toBe(1);
        expect(result[0].inset).toBe(true);
        expect(result[0].blur.number).toBe(5);
    });

    it('parses spread offset', () => {
        const result = parse('0 0 0 5px black');
        expect(result.length).toBe(1);
        expect(result[0].spread.number).toBe(5);
    });

    it('parses color at end', () => {
        const result = parse('2px 2px red');
        expect(result.length).toBe(1);
        expect(result[0].color).toBe(0xff0000ff);
    });

    it('parses multiple comma-separated shadows', () => {
        const result = parse('1px 1px, 2px 2px');
        expect(result.length).toBe(2);
    });

    it('parses inset with all properties', () => {
        const result = parse('inset 1px 2px 3px 4px rgba(0,0,0,.5)');
        expect(result.length).toBe(1);
        expect(result[0].inset).toBe(true);
        expect(result[0].offsetX.number).toBe(1);
        expect(result[0].offsetY.number).toBe(2);
        expect(result[0].blur.number).toBe(3);
        expect(result[0].spread.number).toBe(4);
    });
});
