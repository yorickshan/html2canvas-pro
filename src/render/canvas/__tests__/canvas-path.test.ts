import { describe, it, expect } from 'vitest';
import { formatCanvasPath, createCanvasPath } from '../canvas-path';
import { Vector } from '../../vector';
import { BezierCurve } from '../../bezier-curve';
import { createMockContext } from '../../__mocks__/canvas';

describe('formatCanvasPath', () => {
    it('handles empty path array', () => {
        const ctx = createMockContext();
        expect(() => formatCanvasPath(ctx, [])).not.toThrow();
    });

    it('calls moveTo for first Vector', () => {
        const ctx = createMockContext();
        formatCanvasPath(ctx, [new Vector(10, 20)]);
        expect(ctx.moveTo).toHaveBeenCalledWith(10, 20);
    });

    it('calls lineTo for second Vector', () => {
        const ctx = createMockContext();
        formatCanvasPath(ctx, [new Vector(0, 0), new Vector(100, 0)]);
        expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
        expect(ctx.lineTo).toHaveBeenCalledWith(100, 0);
    });

    it('calls moveTo, lineTo, and bezierCurveTo for BezierCurve paths', () => {
        const ctx = createMockContext();
        const start = new Vector(0, 0);
        const startControl = new Vector(20, -10);
        const endControl = new Vector(80, -10);
        const end = new Vector(100, 0);

        const curve = new BezierCurve(start, startControl, endControl, end);

        formatCanvasPath(ctx, [start, curve]);
        expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
        expect(ctx.lineTo).toHaveBeenCalledWith(0, 0);
        expect(ctx.bezierCurveTo).toHaveBeenCalledWith(20, -10, 80, -10, 100, 0);
    });
});

describe('createCanvasPath', () => {
    it('wraps formatCanvasPath with beginPath/closePath', () => {
        const ctx = createMockContext();
        createCanvasPath(ctx, [new Vector(10, 20)]);
        expect(ctx.beginPath).toHaveBeenCalled();
        expect(ctx.closePath).toHaveBeenCalled();
    });

    it('calls beginPath before moveTo', () => {
        const ctx = createMockContext();
        createCanvasPath(ctx, [new Vector(50, 50), new Vector(100, 100)]);

        // beginPath must be called before moveTo
        const beginPathOrder = ctx.beginPath.mock.invocationCallOrder[0];
        const moveToOrder = ctx.moveTo.mock.invocationCallOrder[0];
        expect(beginPathOrder).toBeLessThan(moveToOrder);
    });

    it('calls closePath after all path operations', () => {
        const ctx = createMockContext();
        createCanvasPath(ctx, [new Vector(0, 0), new Vector(100, 0)]);

        // closePath must be called after the last lineTo
        const closePathOrder = ctx.closePath.mock.invocationCallOrder[0];
        const lineToOrder = ctx.lineTo.mock.invocationCallOrder[0];
        expect(closePathOrder).toBeGreaterThan(lineToOrder);
    });
});
