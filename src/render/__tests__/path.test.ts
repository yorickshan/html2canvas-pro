import { describe, it, expect } from 'vitest';
import { PathType, equalPath, transformPath } from '../path';
import { Vector } from '../vector';

describe('PathType', () => {
    it('has VECTOR and BEZIER_CURVE values', () => {
        expect(PathType.VECTOR).toBe(0);
        expect(PathType.BEZIER_CURVE).toBe(1);
    });
});

describe('equalPath', () => {
    it('returns false for two empty arrays (due to .some() semantics)', () => {
        expect(equalPath([], [])).toBe(false);
    });

    it('returns false for different length arrays', () => {
        const a = [new Vector(0, 0)];
        expect(equalPath(a, [])).toBe(false);
    });

    it('returns true when arrays share reference-equal elements', () => {
        const v1 = new Vector(1, 2);
        const v2 = new Vector(3, 4);
        const a = [v1, v2];
        const b = [v1, v2];
        expect(equalPath(a, b)).toBe(true);
    });

    it('returns false for different Vector instances', () => {
        const a = [new Vector(1, 2)];
        const b = [new Vector(1, 3)];
        expect(equalPath(a, b)).toBe(false);
    });
});

describe('transformPath', () => {
    it('translates vectors at index 0 with deltaX and deltaY', () => {
        const path = [new Vector(10, 20)];
        const result = transformPath(path, 5, 5, 2, 2);
        expect(result[0].x).toBe(15);
        expect(result[0].y).toBe(25);
    });

    it('handles empty path', () => {
        expect(transformPath([], 0, 0, 1, 1)).toEqual([]);
    });
});
