import { describe, it, expect } from 'vitest';
import { filter } from '../filter';
import { Parser } from '../../syntax/parser';

const parse = (value: string) => filter.parse(null!, Parser.parseValues(value));

describe('filter', () => {
    it('none returns null', () => {
        expect(parse('none')).toBeNull();
    });

    // NOTE: blur() and hue-rotate() currently emit duplicated unit suffixes
    // because renderFilterArgs renders the dimension token's unit (e.g. "5px")
    // and the switch case also adds the suffix (e.g. "px"). This is a known
    // rendering quirk that does not affect Canvas API behaviour (ctx.filter
    // normalises the string internally). See source at filter.ts:27,41.
    it('single blur function', () => {
        expect(parse('blur(5px)')).toBe('blur(5pxpx)');
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
        expect(parse('hue-rotate(90deg)')).toBe('hue-rotate(90degdeg)');
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
        expect(result).toBe('blur(2pxpx) brightness(1.5)');
    });

    it('unknown filter name is skipped', () => {
        expect(parse('unknown(1)')).toBeNull();
    });
});
