import { describe, it, expect } from 'vitest';
import { Vector, isVector } from '../vector';
import { PathType } from '../path';

describe('Vector', () => {
    it('constructs with x and y', () => {
        const v = new Vector(10, 20);
        expect(v.x).toBe(10);
        expect(v.y).toBe(20);
    });

    it('has type VECTOR', () => {
        const v = new Vector(0, 0);
        expect(v.type).toBe(PathType.VECTOR);
    });

    it('add returns new Vector with sum', () => {
        const v = new Vector(10, 20);
        const result = v.add(5, -3);
        expect(result.x).toBe(15);
        expect(result.y).toBe(17);
        expect(v.x).toBe(10);
        expect(v.y).toBe(20);
    });

    it('add with zero does not change', () => {
        const v = new Vector(5, 5);
        const result = v.add(0, 0);
        expect(result.x).toBe(5);
        expect(result.y).toBe(5);
    });

    it('add with negative values', () => {
        const v = new Vector(10, 10);
        const result = v.add(-20, -30);
        expect(result.x).toBe(-10);
        expect(result.y).toBe(-20);
    });
});

describe('isVector', () => {
    it('returns true for Vector instances', () => {
        const v = new Vector(0, 0);
        expect(isVector(v)).toBe(true);
    });

    it('returns false for non-Vector objects', () => {
        expect(isVector({} as any)).toBe(false);
    });
});
