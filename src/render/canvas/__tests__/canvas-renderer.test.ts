import { describe, expect, it, vi } from 'vitest';
import { Context } from '../../../core/context';
import { Vector } from '../../vector';
import { createMockContext } from '../../__mocks__/canvas';
import { CanvasRenderer } from '../canvas-renderer';

describe('CanvasRenderer', () => {
    it('anchors masks to an offset render origin', () => {
        const ctx = createMockContext();
        const canvas = {
            getContext: vi.fn().mockReturnValue(ctx)
        } as unknown as HTMLCanvasElement;
        const context = {
            logger: {
                debug: vi.fn()
            }
        } as unknown as Context;
        const renderer = new CanvasRenderer(context, {
            backgroundColor: null,
            canvas,
            height: 300,
            scale: 1,
            width: 400,
            x: 300,
            y: 200
        });

        renderer.mask([new Vector(480, 240), new Vector(680, 240), new Vector(680, 440), new Vector(480, 440)]);

        expect(ctx.moveTo).toHaveBeenNthCalledWith(1, 300, 200);
        expect(ctx.lineTo).toHaveBeenNthCalledWith(1, 700, 200);
        expect(ctx.lineTo).toHaveBeenNthCalledWith(2, 700, 500);
        expect(ctx.lineTo).toHaveBeenNthCalledWith(3, 300, 500);
        expect(ctx.lineTo).toHaveBeenNthCalledWith(4, 300, 200);
    });
});
