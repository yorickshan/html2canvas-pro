import { describe, it, expect } from 'vitest';
import { contains } from '../bitwise';

describe('contains', () => {
    it('returns true when bit is fully contained', () => {
        expect(contains(0b0010, 0b0010)).toBe(true);
        expect(contains(0b0010, 0b1011)).toBe(true);
    });

    it('returns false when bit is not present', () => {
        expect(contains(0b0010, 0b0001)).toBe(false);
        expect(contains(0b0010, 0b1100)).toBe(false);
    });

    it('returns false when value is zero', () => {
        expect(contains(0b0010, 0)).toBe(false);
    });

    it('returns false when bit is zero', () => {
        expect(contains(0, 0b1111)).toBe(false);
    });
});
