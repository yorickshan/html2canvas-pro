import { describe, it, expect } from 'vitest';
import { clamp, multiplyMatrices } from '../color-math';
import { isTransparent, asString, pack } from '../color-utilities';

describe('clamp', () => {
    it('returns value within range', () => {
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(0, 0, 10)).toBe(0);
        expect(clamp(10, 0, 10)).toBe(10);
    });

    it('clamps below minimum', () => {
        expect(clamp(-5, 0, 10)).toBe(0);
        expect(clamp(-1, 0, 255)).toBe(0);
    });

    it('clamps above maximum', () => {
        expect(clamp(15, 0, 10)).toBe(10);
        expect(clamp(300, 0, 255)).toBe(255);
    });
});

describe('multiplyMatrices', () => {
    it('multiplies two 3x3 matrices stored as 9-element arrays', () => {
        const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
        const result = multiplyMatrices(identity, identity);
        expect(result).toEqual([1, 0, 0]);
    });

    it('multiplies non-identity matrices', () => {
        const a = [2, 0, 0, 0, 2, 0, 0, 0, 2];
        const b = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const result = multiplyMatrices(a, b);
        expect(result).toBeDefined();
        expect(result.length).toBe(3);
    });

    it('returns a tuple of three numbers', () => {
        const a = [1, 0, 0, 0, 1, 0, 0, 0, 1];
        const b = [5, 5, 5, 5, 5, 5, 5, 5, 5];
        const result = multiplyMatrices(a, b);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(3);
    });
});

describe('isTransparent', () => {
    it('detects fully transparent color', () => {
        expect(isTransparent(0x00000000)).toBe(true);
    });

    it('returns false for opaque colors', () => {
        expect(isTransparent(0xff0000ff)).toBe(false);
        expect(isTransparent(0x000000ff)).toBe(false);
    });

    it('returns false for semi-transparent colors', () => {
        expect(isTransparent(0x00000080)).toBe(false);
    });
});

describe('asString', () => {
    it('formats opaque colors as rgb()', () => {
        const result = asString(0xff0000ff);
        expect(result).toBe('rgb(255,0,0)');
    });

    it('formats semi-transparent colors as rgba()', () => {
        const result = asString(0x00000080);
        expect(result).toContain('rgba');
        expect(result).toContain('0.5');
    });

    it('formats fully transparent colors as rgba()', () => {
        const result = asString(0x00000000);
        expect(result).toContain('rgba');
        expect(result).toContain('0');
    });
});

describe('pack', () => {
    it('packs rgba channels into a single number', () => {
        const packed = pack(255, 0, 0, 1);
        expect(packed).toBe(0xff0000ff);
    });

    it('packs zero channels with zero alpha', () => {
        const packed = pack(0, 0, 0, 0);
        expect(packed).toBe(0);
    });

    it('packs semi-transparent (alpha in 0-1 range)', () => {
        const packed = pack(128, 128, 128, 0.5);
        // 0.5 * 255 = 127.5 -> Math.round -> 128 -> packed as 0x80808080
        expect(packed).toBe(0x80808080);
    });

    it('packs full alpha', () => {
        const packed = pack(0, 255, 0, 1);
        // red (bits 24-31): 0
        expect((packed >> 24) & 0xff).toBe(0);
        // green (bits 16-23): 255
        expect((packed >> 16) & 0xff).toBe(255);
        // blue (bits 8-15): 0
        expect((packed >> 8) & 0xff).toBe(0);
        // alpha (bits 0-7): 255
        expect(packed & 0xff).toBe(255);
    });
});
