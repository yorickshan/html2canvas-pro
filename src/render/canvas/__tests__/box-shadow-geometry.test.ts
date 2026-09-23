import { describe, expect, it } from 'vitest';
import { Vector } from '../../vector';
import { shadowRadius, spreadShadowPath } from '../box-shadow-geometry';

describe('shadow spread geometry', () => {
    it.each([
        [10, 20, 27.5],
        [0, 12, 0],
        [5, -8, 0],
        [20, -5, 15],
        [48, 4, 52],
        [20, 0, 20]
    ])('adjusts radius %s with spread %s to %s', (radius, spread, expected) => {
        expect(shadowRadius(radius, spread)).toBeCloseTo(expected);
    });

    it('keeps square corners square and does not mutate the original path', () => {
        const paths = [new Vector(0, 0), new Vector(100, 0), new Vector(100, 80), new Vector(0, 80)];
        expect(spreadShadowPath(paths, 10)).toEqual([
            new Vector(-10, -10),
            new Vector(110, -10),
            new Vector(110, 90),
            new Vector(-10, 90)
        ]);
        expect(paths[0]).toEqual(new Vector(0, 0));
        expect(spreadShadowPath(paths, 0)).toBe(paths);
    });

    it('returns an empty silhouette when spread collapses the box', () => {
        const paths = [new Vector(0, 0), new Vector(100, 0), new Vector(100, 80), new Vector(0, 80)];
        expect(spreadShadowPath(paths, -41)).toEqual([]);
    });
});
