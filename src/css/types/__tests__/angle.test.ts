import { describe, it, expect } from 'vitest';
import { Parser } from '../../syntax/parser';
import { angle, deg } from '../angle';
import { Context } from '../../../core/context';

const parse = (value: string) => angle.parse({} as Context, Parser.parseValue(value));

describe('angle type descriptor', () => {
    it('parses deg to radians', () => {
        const result = parse('180deg');
        expect(result).toBeCloseTo(Math.PI, 5);
    });

    it('parses rad unit', () => {
        const result = parse('1rad');
        expect(result).toBeCloseTo(1, 5);
    });

    it('parses grad unit', () => {
        const result = parse('100grad');
        expect(result).toBeCloseTo(Math.PI / 2, 5);
    });

    it('parses turn unit', () => {
        const result = parse('0.5turn');
        expect(result).toBeCloseTo(Math.PI, 5);
    });

    it('parses 0deg', () => {
        const result = parse('0deg');
        expect(result).toBe(0);
    });

    it('parses 360deg to 2*PI', () => {
        const result = parse('360deg');
        expect(result).toBeCloseTo(2 * Math.PI, 5);
    });

    it('handles negative values', () => {
        const result = parse('-90deg');
        expect(result).toBeCloseTo(-Math.PI / 2, 5);
    });
});

describe('deg helper', () => {
    it('converts degrees to radians', () => {
        expect(deg(180)).toBeCloseTo(Math.PI, 5);
        expect(deg(90)).toBeCloseTo(Math.PI / 2, 5);
        expect(deg(0)).toBe(0);
        expect(deg(360)).toBeCloseTo(2 * Math.PI, 5);
    });
});
