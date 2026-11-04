import { describe, expect, it } from 'vitest';
import { Bounds } from '../../css/layout/bounds';
import {
    IDENTITY_MATRIX,
    applyMatrixToPoint,
    inverseTransformBoundsToAabb,
    invertMatrix,
    isIdentityMatrix,
    multiplyMatrix,
    transformBoundsToAabb
} from '../matrix';
import type { Matrix } from '../../css/property-descriptors/transform';

const translation = (dx: number, dy: number): Matrix => [1, 0, 0, 1, dx, dy];
const scaling = (sx: number, sy: number): Matrix => [sx, 0, 0, sy, 0, 0];
const rotation = (radians: number): Matrix => [
    Math.cos(radians),
    Math.sin(radians),
    -Math.sin(radians),
    Math.cos(radians),
    0,
    0
];

describe('matrix utilities', () => {
    describe('isIdentityMatrix', () => {
        it('accepts the identity constant', () => {
            expect(isIdentityMatrix(IDENTITY_MATRIX)).toBe(true);
        });

        it('rejects translation-only matrices', () => {
            expect(isIdentityMatrix(translation(1, 0))).toBe(false);
        });
    });

    describe('multiplyMatrix', () => {
        it('composes identity with anything to that thing', () => {
            const m = scaling(2, 3);
            expect(multiplyMatrix(IDENTITY_MATRIX, m)).toEqual(m);
            expect(multiplyMatrix(m, IDENTITY_MATRIX)).toEqual(m);
        });

        it('composes translations additively', () => {
            expect(multiplyMatrix(translation(2, 3), translation(10, 20))).toEqual(translation(12, 23));
        });

        it('applies a first, then b (canvas post-multiply)', () => {
            // translate(10,0) then scale(2): x -> 2x + 10
            const m = multiplyMatrix(translation(10, 0), scaling(2, 2));
            expect(applyMatrixToPoint(m, 1, 0)).toEqual([12, 0]);
            // scale(2) then translate(10,0): x -> 2x + 20
            const reversed = multiplyMatrix(scaling(2, 2), translation(10, 0));
            expect(applyMatrixToPoint(reversed, 1, 0)).toEqual([22, 0]);
        });

        it('composes with rotation non-commutatively', () => {
            // rotate 90° then translate x by 5 equals moving along +y.
            const m = multiplyMatrix(rotation(Math.PI / 2), translation(5, 0));
            expect(applyMatrixToPoint(m, 0, 0)[1]).toBeCloseTo(5);
            expect(applyMatrixToPoint(m, 0, 0)[0]).toBeCloseTo(0);
        });
    });

    describe('applyMatrixToPoint', () => {
        it('leaves points unchanged under identity', () => {
            expect(applyMatrixToPoint(IDENTITY_MATRIX, 3, 4)).toEqual([3, 4]);
        });

        it('scales and translates', () => {
            const m = multiplyMatrix(translation(1, 2), scaling(3, 4));
            expect(applyMatrixToPoint(m, 2, 2)).toEqual([7, 10]);
        });
    });

    describe('transformBoundsToAabb', () => {
        it('keeps axis-aligned bounds exact under translation and scale', () => {
            const m = multiplyMatrix(translation(5, 7), scaling(2, 2));
            const out = transformBoundsToAabb(m, new Bounds(10, 10, 30, 40));
            expect(out.left).toBe(25);
            expect(out.top).toBe(27);
            expect(out.width).toBe(60);
            expect(out.height).toBe(80);
        });

        it('grows the box to cover rotated corners', () => {
            // 90° rotation of a 20×10 box yields a 10×20 box at a shifted origin.
            const out = transformBoundsToAabb(rotation(Math.PI / 2), new Bounds(0, 0, 20, 10));
            expect(out.width).toBeCloseTo(10);
            expect(out.height).toBeCloseTo(20);
            expect(out.left).toBeCloseTo(-10);
            expect(out.top).toBeCloseTo(0);
        });

        it('contains all four transformed corners', () => {
            const m = multiplyMatrix(rotation(0.3), translation(12, -4));
            const source = new Bounds(5, 8, 40, 25);
            const out = transformBoundsToAabb(m, source);
            for (const [x, y] of [
                applyMatrixToPoint(m, source.left, source.top),
                applyMatrixToPoint(m, source.left + source.width, source.top),
                applyMatrixToPoint(m, source.left, source.top + source.height),
                applyMatrixToPoint(m, source.left + source.width, source.top + source.height)
            ]) {
                expect(x).toBeGreaterThanOrEqual(out.left - 1e-9);
                expect(x).toBeLessThanOrEqual(out.left + out.width + 1e-9);
                expect(y).toBeGreaterThanOrEqual(out.top - 1e-9);
                expect(y).toBeLessThanOrEqual(out.top + out.height + 1e-9);
            }
        });
    });

    describe('invertMatrix', () => {
        it('round-trips points through inverse', () => {
            const m = multiplyMatrix(translation(5, -3), multiplyMatrix(scaling(2, 4), rotation(0.7)));
            const inverse = invertMatrix(m);
            expect(inverse).not.toBeNull();
            const [x, y] = applyMatrixToPoint(inverse as Matrix, 17, -9);
            const [backX, backY] = applyMatrixToPoint(m, x, y);
            expect(backX).toBeCloseTo(17);
            expect(backY).toBeCloseTo(-9);
        });

        it('returns null for singular matrices', () => {
            expect(invertMatrix(scaling(0, 1))).toBeNull();
            expect(invertMatrix([0, 0, 0, 0, 0, 0])).toBeNull();
        });
    });

    describe('inverseTransformBoundsToAabb', () => {
        it('maps the visual viewport back into layout space conservatively', () => {
            // Layout-space box at (100,100), scaled 2× → visual box at (200,200).
            const m = multiplyMatrix(translation(100, 100), scaling(2, 2));
            const visual = new Bounds(240, 280, 60, 40);
            const layoutWindow = inverseTransformBoundsToAabb(m, visual);
            expect(layoutWindow).not.toBeNull();
            // Composed p' = 2p + 100 (scale first, then translate); inverse is (p'-100)/2.
            expect((layoutWindow as Bounds).left).toBeCloseTo(70);
            expect((layoutWindow as Bounds).top).toBeCloseTo(90);
            expect((layoutWindow as Bounds).width).toBeCloseTo(30);
            expect((layoutWindow as Bounds).height).toBeCloseTo(20);
        });

        it('returns null when the matrix is singular', () => {
            expect(inverseTransformBoundsToAabb(scaling(0, 0), new Bounds(0, 0, 1, 1))).toBeNull();
        });
    });
});
