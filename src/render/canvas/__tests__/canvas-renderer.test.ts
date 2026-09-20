import { afterEach, describe, expect, it, vi } from 'vitest';
import { Context } from '../../../core/context';
import { Vector } from '../../vector';
import { createMockContext } from '../../__mocks__/canvas';
import { CanvasRenderer } from '../canvas-renderer';
import * as stacking from '../../stacking-context';
import { ElementContainer } from '../../../dom/element-container';

describe('CanvasRenderer', () => {
    afterEach(() => vi.restoreAllMocks());

    it.each([false, true])(
        'releases failed internal captures without clearing caller canvases: supplied=%s',
        async (supplied) => {
            vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => createMockContext());
            vi.spyOn(stacking, 'parseStackingContexts').mockReturnValue({} as stacking.StackingContext);
            vi.spyOn(CanvasRenderer.prototype, 'renderStack').mockRejectedValue(new Error('Render failed'));
            const canvas = supplied ? document.createElement('canvas') : undefined;
            if (canvas) {
                canvas.width = 400;
                canvas.height = 300;
            }
            const renderer = new CanvasRenderer({ logger: { debug: vi.fn() } } as unknown as Context, {
                backgroundColor: null,
                canvas,
                width: 400,
                height: 300,
                x: 0,
                y: 0,
                scale: 1
            });
            await expect(renderer.render({} as ElementContainer)).rejects.toThrow('Render failed');
            expect(renderer.canvas.width).toBe(supplied ? 400 : 0);
            expect(renderer.canvas.height).toBe(supplied ? 300 : 0);
        }
    );

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
