import { describe, it, expect } from 'vitest';
import { BezierCurve, isBezierCurve } from '../bezier-curve';
import { Vector } from '../vector';
import { PathType } from '../path';

describe('BezierCurve', () => {
    const start = new Vector(0, 0);
    const startControl = new Vector(10, 0);
    const endControl = new Vector(20, 10);
    const end = new Vector(30, 10);

    it('constructs with four control points', () => {
        const curve = new BezierCurve(start, startControl, endControl, end);
        expect(curve.start).toBe(start);
        expect(curve.startControl).toBe(startControl);
        expect(curve.endControl).toBe(endControl);
        expect(curve.end).toBe(end);
    });

    it('has type BEZIER_CURVE', () => {
        const curve = new BezierCurve(start, startControl, endControl, end);
        expect(curve.type).toBe(PathType.BEZIER_CURVE);
    });

    it('add offsets all control points', () => {
        const curve = new BezierCurve(start, startControl, endControl, end);
        const result = curve.add(5, 10);
        expect(result.start.x).toBe(5);
        expect(result.start.y).toBe(10);
        expect(result.end.x).toBe(35);
        expect(result.end.y).toBe(20);
    });

    it('reverse swaps start/end and control points', () => {
        const curve = new BezierCurve(start, startControl, endControl, end);
        const reversed = curve.reverse();
        expect(reversed.start).toEqual(end);
        expect(reversed.end).toEqual(start);
        expect(reversed.startControl).toEqual(endControl);
        expect(reversed.endControl).toEqual(startControl);
    });

    it('subdivide with t=0.5 returns half curve', () => {
        const curve = new BezierCurve(new Vector(0, 0), new Vector(10, 0), new Vector(20, 10), new Vector(30, 10));
        const firstHalf = curve.subdivide(0.5, true);
        expect(firstHalf.start.x).toBe(0);
        expect(firstHalf.start.y).toBe(0);
    });

    it('subdivide with t=0 returns original start', () => {
        const curve = new BezierCurve(start, startControl, endControl, end);
        const result = curve.subdivide(0, true);
        expect(result.start).toEqual(start);
        expect(result.end).toEqual(start);
    });

    it('subdivide with t=1 returns original end', () => {
        const curve = new BezierCurve(start, startControl, endControl, end);
        const result = curve.subdivide(1, true);
        expect(result.start).toEqual(start);
        expect(result.end).toEqual(end);
    });
});

describe('isBezierCurve', () => {
    it('returns true for BezierCurve instances', () => {
        const curve = new BezierCurve(new Vector(0, 0), new Vector(1, 0), new Vector(2, 1), new Vector(3, 1));
        expect(isBezierCurve(curve)).toBe(true);
    });

    it('returns false for plain objects', () => {
        expect(isBezierCurve({} as any)).toBe(false);
    });
});
