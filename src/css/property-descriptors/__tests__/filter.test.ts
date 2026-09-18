import { describe, it, expect } from 'vitest';
import { filter } from '../filter';
import { Parser } from '../../syntax/parser';

const parse = (value: string) => filter.parse(null!, Parser.parseValues(value));

describe('filter', () => {
    it('none returns null', () => {
        expect(parse('none')).toBeNull();
    });

    it('single blur function', () => {
        expect(parse('blur(5px)')).toBe('blur(5px)');
    });

    it('brightness', () => {
        expect(parse('brightness(0.5)')).toBe('brightness(0.5)');
    });

    it('contrast', () => {
        expect(parse('contrast(200%)')).toBe('contrast(200%)');
    });

    it('grayscale', () => {
        expect(parse('grayscale(100%)')).toBe('grayscale(100%)');
    });

    it('hue-rotate with deg', () => {
        expect(parse('hue-rotate(90deg)')).toBe('hue-rotate(90deg)');
    });

    it('invert', () => {
        expect(parse('invert(0.5)')).toBe('invert(0.5)');
    });

    it('opacity', () => {
        expect(parse('opacity(0.5)')).toBe('opacity(0.5)');
    });

    it('saturate', () => {
        expect(parse('saturate(200%)')).toBe('saturate(200%)');
    });

    it('sepia', () => {
        expect(parse('sepia(0.5)')).toBe('sepia(0.5)');
    });

    it('drop-shadow', () => {
        const result = parse('drop-shadow(2px 2px 5px red)');
        expect(result).toBe('drop-shadow(2px 2px 5px red)');
    });

    it('multiple filter functions combined', () => {
        const result = parse('blur(2px) brightness(1.5)');
        expect(result).toBe('blur(2px) brightness(1.5)');
    });

    it.each([
        'drop-shadow(12px -8px 4px rgba(0, 0, 0, 0.5))',
        'drop-shadow(rgb(10 20 30 / 50%) 0px 2px 8px)',
        'blur(4px) drop-shadow(12px 8px 8px rgba(0, 0, 0, 0.5))',
        'hue-rotate(0.5turn)',
        'blur(0)'
    ])('preserves dimensions, color functions and filter order: %s', (value) => {
        expect(parse(value)).toBe(value);
    });

    describe('blur argument serialization', () => {
        it.each(['blur()', 'blur(0px)', 'blur(0.5px)', 'blur(2em)'])(
            'preserves omitted, zero, fractional and relative lengths: %s',
            (value) => {
                expect(parse(value)).toBe(value);
            }
        );

        // This descriptor serializes CSS; it must not turn an invalid length into
        // a valid effect by adding px. Browser acceptance and ignored-assignment
        // behavior are checked in scripts/filter-descriptor-regressions.mjs.
        it.each(['blur(5)', 'blur(0.5)', 'blur(-5)', 'blur(5%)', 'blur(-5px)', 'blur(5pxpx)', 'blur(5) brightness(2)'])(
            'does not repair invalid blur arguments: %s',
            (value) => {
                expect(parse(value)).toBe(value);
            }
        );

        it('preserves valid unitless zero in a filter chain', () => {
            expect(parse('blur(0) brightness(2)')).toBe('blur(0) brightness(2)');
        });
    });

    it('unknown filter name is skipped', () => {
        expect(parse('unknown(1)')).toBeNull();
    });
});
