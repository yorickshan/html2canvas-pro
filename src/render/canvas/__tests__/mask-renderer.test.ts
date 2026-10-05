import { describe, expect, it, vi } from 'vitest';
import { paintMaskLayers, type MaskLayerStyles } from '../mask-renderer';
import { BACKGROUND_REPEAT } from '../../../css/property-descriptors/background-repeat';
import {
    CSSImageType,
    type CSSURLImage,
    type CSSLinearGradientImage,
    type CSSRadialGradientImage
} from '../../../css/types/image';
import { FIFTY_PERCENT, ZERO_LENGTH } from '../../../css/types/length-percentage';

const ctx = () => {
    return {
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        fillStyle: ''
    } as unknown as CanvasRenderingContext2D;
};

const styles = (overrides: Partial<MaskLayerStyles> = {}): MaskLayerStyles => ({
    maskPosition: [[ZERO_LENGTH, ZERO_LENGTH]],
    maskRepeat: [BACKGROUND_REPEAT.NO_REPEAT],
    maskSize: [],
    ...overrides
});

describe('paintMaskLayers', () => {
    it('draws a URL image once for no-repeat with natural sizing', async () => {
        const c = ctx();
        const img = { naturalWidth: 64, naturalHeight: 32, width: 64, height: 32 } as HTMLImageElement;
        await paintMaskLayers(
            c,
            [{ url: 'x.png', type: CSSImageType.URL } as CSSURLImage],
            styles(),
            { left: 0, top: 0, width: 200, height: 100 },
            async () => img
        );
        expect(c.drawImage).toHaveBeenCalledWith(img, 0, 0, 64, 32);
    });

    it('tiles repeating images across the whole area', async () => {
        const c = ctx();
        const img = { naturalWidth: 50, naturalHeight: 50, width: 50, height: 50 } as HTMLImageElement;
        await paintMaskLayers(
            c,
            [{ url: 'x.png', type: CSSImageType.URL } as CSSURLImage],
            styles({ maskRepeat: [BACKGROUND_REPEAT.REPEAT] }),
            { left: 0, top: 0, width: 200, height: 100 },
            async () => img
        );
        // 200x50 tiles: 4 columns × 2 rows, plus the tile-before offsets.
        expect((c.drawImage as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(8);
    });

    it('scales percentage mask-size', async () => {
        const c = ctx();
        const img = { naturalWidth: 100, naturalHeight: 100, width: 100, height: 100 } as HTMLImageElement;
        await paintMaskLayers(
            c,
            [{ url: 'x.png', type: CSSImageType.URL } as CSSURLImage],
            styles({ maskSize: [[{ type: 16, number: 50, flags: 4, unit: '%' } as never]] }),
            { left: 0, top: 0, width: 200, height: 100 },
            async () => img
        );
        expect(c.drawImage).toHaveBeenCalledWith(img, 0, 0, 100, 100);
    });

    it('fills the area for gradient layers', async () => {
        const c = ctx();
        await paintMaskLayers(
            c,
            [
                {
                    type: CSSImageType.LINEAR_GRADIENT,
                    angle: 0,
                    stops: [
                        { color: 0x000000ff, stop: { type: 16, number: 0, flags: 4 } },
                        { color: 0xffffffff, stop: null }
                    ]
                } as CSSLinearGradientImage
            ],
            styles(),
            { left: 10, top: 20, width: 200, height: 100 },
            async () => undefined
        );
        expect(c.fillRect).toHaveBeenCalledWith(10, 20, 200, 100);
    });

    it('resolves percentage mask positions', async () => {
        const c = ctx();
        const img = { naturalWidth: 100, naturalHeight: 100, width: 100, height: 100 } as HTMLImageElement;
        await paintMaskLayers(
            c,
            [{ url: 'x.png', type: CSSImageType.URL } as CSSURLImage],
            styles({ maskPosition: [[FIFTY_PERCENT, ZERO_LENGTH]] }),
            { left: 0, top: 0, width: 300, height: 100 },
            async () => img
        );
        // 50% of leftover space (300-100)/2 = 100
        expect(c.drawImage).toHaveBeenCalledWith(img, 100, 0, 100, 100);
    });

    it('paints the last colour underlay before the ellipse for radial masks', async () => {
        // Outside the ending shape a radial gradient continues with its last
        // colour, so the whole positioning area keeps that alpha.
        const rasterizedCanvases: Array<{ width: number; height: number }> = [];
        const ownerDocument = {
            createElement: (): HTMLCanvasElement => {
                const canvas = {
                    width: 0,
                    height: 0,
                    getContext: () => ({
                        createRadialGradient: () => ({ addColorStop: () => undefined }),
                        scale: () => undefined,
                        fillRect: () => undefined,
                        fillStyle: ''
                    })
                };
                rasterizedCanvases.push(canvas);
                return canvas as unknown as HTMLCanvasElement;
            }
        };
        const c = ctx() as CanvasRenderingContext2D & { canvas: { ownerDocument: unknown } };
        c.canvas = { ownerDocument };
        await paintMaskLayers(
            c,
            [
                {
                    type: CSSImageType.RADIAL_GRADIENT,
                    shape: 0 /* CIRCLE */,
                    size: 0 /* CLOSEST_SIDE */,
                    position: [],
                    stops: [
                        { color: 0x000000ff, stop: { type: 16, number: 0, flags: 4 } },
                        { color: 0xffffffff, stop: null }
                    ]
                } as unknown as CSSRadialGradientImage
            ],
            styles(),
            { left: 0, top: 0, width: 200, height: 100 },
            async () => undefined
        );
        // CLOSEST_SIDE circle at the area centre: rx = ry = 50.
        // Underlay first across the whole area in the last colour…
        expect(c.fillStyle).toBe('rgb(255,255,255)');
        expect(c.fillRect).toHaveBeenCalledWith(0, 0, 200, 100);
        // …then the ellipse canvas drawn at its 2rx × 2ry box around the centre.
        expect(c.drawImage).toHaveBeenCalledWith(rasterizedCanvases[0], 50, 0, 100, 100);
    });
});
