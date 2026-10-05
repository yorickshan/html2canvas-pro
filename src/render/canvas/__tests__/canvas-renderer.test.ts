import { afterEach, describe, expect, it, vi } from 'vitest';
import { Context } from '../../../core/context';
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
            const renderer = new CanvasRenderer(
                { logger: { debug: vi.fn() }, resourceDocument: document } as unknown as Context,
                {
                    backgroundColor: null,
                    canvas,
                    width: 400,
                    height: 300,
                    x: 0,
                    y: 0,
                    scale: 1
                }
            );
            await expect(renderer.render({} as ElementContainer)).rejects.toThrow('Render failed');
            expect(renderer.canvas.width).toBe(supplied ? 400 : 0);
            expect(renderer.canvas.height).toBe(supplied ? 300 : 0);
        }
    );
});
