import { describe, expect, it } from 'vitest';
import { shadowSpace } from '../box-shadow-transform';

const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

describe('box-shadow coordinate space', () => {
    it('recovers capture bounds from the complete canvas matrix', () => {
        const space = shadowSpace({ a: 2, b: 0, c: 0, d: 2, e: -80, f: -60 }, 640, 520);
        expect(space?.viewport).toMatchObject({ left: 40, top: 30, width: 320, height: 260 });
        expect(space?.scale).toBe(2);
        expect(space?.uniform).toBe(true);
    });

    it('inverse-maps every output corner under rotation', () => {
        const space = shadowSpace({ a: 0, b: 2, c: -2, d: 0, e: 640, f: 0 }, 640, 520);
        expect(space?.viewport).toMatchObject({ left: 0, top: 0, width: 260, height: 320 });
        expect(space?.uniform).toBe(true);
    });

    it('keeps reflections in the uniform-scale fast path', () => {
        const space = shadowSpace({ ...identity, a: -1, e: 320 }, 320, 260);
        expect(space?.viewport).toMatchObject({ width: 320, height: 260 });
        expect(space?.viewport.left).toBeCloseTo(0);
        expect(space?.viewport.top).toBeCloseTo(0);
        expect(space?.uniform).toBe(true);
    });

    it('chooses the largest singular value for nonuniform raster resolution', () => {
        const space = shadowSpace({ ...identity, a: 3 }, 320, 260);
        expect(space?.scale).toBe(3);
        expect(space?.uniform).toBe(false);
    });

    it('does not mistake a shear for a uniform scale', () => {
        const space = shadowSpace({ ...identity, c: 1 }, 320, 260);
        expect(space?.viewport).toMatchObject({ left: -260, top: 0, width: 580, height: 260 });
        expect(space?.scale).toBeCloseTo((1 + Math.sqrt(5)) / 2);
        expect(space?.uniform).toBe(false);
    });

    it('rejects singular and nonfinite matrices before allocating or drawing', () => {
        expect(shadowSpace({ ...identity, a: 0 }, 320, 260)).toBeNull();
        expect(shadowSpace({ ...identity, a: NaN }, 320, 260)).toBeNull();
        expect(shadowSpace({ ...identity, e: Infinity }, 320, 260)).toBeNull();
    });
});
