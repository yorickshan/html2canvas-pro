import { describe, expect, it, vi } from 'vitest';
import { paintMaskLayers, type MaskLayerStyles } from '../mask-renderer';
import { BACKGROUND_REPEAT } from '../../../css/property-descriptors/background-repeat';
import { CSSImageType } from '../../../css/types/image';
import { ZERO_LENGTH } from '../../../css/types/length-percentage';

/**
 * Regression: the mask gradient line was built in area-local coordinates
 * while fillRect painted in page coordinates, so with a translated mask
 * context the gradient sampled outside its line and the mask applied the
 * endpoint colour everywhere (fully opaque or fully transparent).
 */
describe('paintMaskLayers linear gradient coordinates', () => {
    it('builds the gradient line in page coordinates', async () => {
        const gradArgs: number[][] = [];
        const ctx = {
            createLinearGradient: vi.fn((...args: number[]) => {
                gradArgs.push(args);
                return { addColorStop: vi.fn() };
            }),
            fillRect: vi.fn(),
            drawImage: vi.fn()
        } as unknown as CanvasRenderingContext2D;

        await paintMaskLayers(
            ctx,
            [
                {
                    type: CSSImageType.LINEAR_GRADIENT,
                    angle: Math.PI / 2, // 'to right' as radians (deg(90))
                    stops: [
                        { color: 0x000000ff, stop: { type: 16, number: 0, flags: 4 } },
                        { color: 0x00000000, stop: null }
                    ]
                }
            ],
            {
                maskPosition: [[ZERO_LENGTH, ZERO_LENGTH]],
                maskRepeat: [BACKGROUND_REPEAT.NO_REPEAT],
                maskSize: []
            },
            { left: 300, top: 200, width: 120, height: 90 },
            async () => undefined
        );

        expect(ctx.fillRect).toHaveBeenCalledWith(300, 200, 120, 90);
        const [x0, y0, x1, y1] = gradArgs[0];
        // Line must span the area in page coordinates: x from 300 to 420,
        // y constant at the vertical centre (200 + 45).
        expect(x0).toBe(300);
        expect(x1).toBe(420);
        expect(y0).toBeCloseTo(245);
        expect(y1).toBeCloseTo(245);
    });
});
