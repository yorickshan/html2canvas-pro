import { describe, expect, it, vi } from 'vitest';
import { rasterizeRadialGradient, stackRepeatingStops, toCanvasStops } from '../gradient-rasterizer';
import { FIFTY_PERCENT, HUNDRED_PERCENT, ZERO_LENGTH } from '../../../css/types/length-percentage';
import type { UnprocessedGradientColorStop } from '../../../css/types/image';

const BLACK = 0x000000ff;
const WHITE = 0xffffffff;
const RED = 0xff0000ff;

const stop = (color: number, value: unknown): UnprocessedGradientColorStop => ({ color, stop: value as never });

interface FakeCtx {
    createRadialGradient: ReturnType<typeof vi.fn>;
    scale: ReturnType<typeof vi.fn>;
    fillRect: ReturnType<typeof vi.fn>;
    fillStyle: string;
    gradientStops: Array<[number, string]>;
}

/** Fake document whose canvases carry a mock 2D context recording gradient calls. */
const createFakeDocument = () => {
    const canvases: Array<{ canvas: { width: number; height: number }; ctx: FakeCtx }> = [];
    const document = {
        createElement: (): HTMLCanvasElement => {
            const ctx: FakeCtx = {
                createRadialGradient: vi.fn(),
                scale: vi.fn(),
                fillRect: vi.fn(),
                fillStyle: '',
                gradientStops: []
            };
            ctx.createRadialGradient.mockImplementation(() => ({
                addColorStop: (offset: number, color: string) => {
                    ctx.gradientStops.push([offset, color]);
                }
            }));
            const canvas = { width: 0, height: 0, getContext: () => ctx };
            canvases.push({ canvas, ctx });
            return canvas as unknown as HTMLCanvasElement;
        }
    };
    return { document, canvases };
};

describe('stackRepeatingStops', () => {
    it('stacks the one-cycle stop list periodically and pads to 1', () => {
        const stacked = stackRepeatingStops([
            { color: BLACK, stop: 0 },
            { color: WHITE, stop: 0.4 }
        ]);
        expect(stacked).not.toBeNull();
        const positions = (stacked as Array<{ stop: number }>).map((s) => s.stop);
        // cycle 0: 0, 0.4 — cycle 1: 0.4, 0.8 — cycle 2: 0.8 (0.4 + 0.4), then pad
        expect(positions).toEqual([0, 0.4, 0.4, 0.8, 0.8, 1]);
        // the pad extends the cycle's last colour
        expect((stacked as Array<{ stop: number; color: string }>)[5].color).toBe('rgb(255,255,255)');
    });

    it('returns null for a degenerate period', () => {
        expect(
            stackRepeatingStops([
                { color: BLACK, stop: 0.3 },
                { color: WHITE, stop: 0.3 }
            ])
        ).toBeNull();
    });
});

describe('toCanvasStops', () => {
    it('clamps stop fractions into the canvas range', () => {
        const stops = toCanvasStops([
            { color: BLACK, stop: -0.2 },
            { color: WHITE, stop: 1.4 }
        ]);
        expect(stops.map((s) => s.stop)).toEqual([0, 1]);
    });
});

describe('rasterizeRadialGradient', () => {
    it('normalises stops against the radius, not the diameter', () => {
        const { document, canvases } = createFakeDocument();
        const rasterized = rasterizeRadialGradient(
            document as unknown as Document,
            100,
            100,
            [stop(BLACK, ZERO_LENGTH), stop(WHITE, FIFTY_PERCENT)],
            false
        );
        expect(rasterized).not.toBeNull();
        // A 50% stop must land at 0.5 of the canvas gradient (radius 100),
        // not 0.25 as the diameter normalisation would produce.
        expect(canvases[0]?.ctx.gradientStops).toEqual([
            [0, 'rgb(0,0,0)'],
            [0.5, 'rgb(255,255,255)']
        ]);
    });

    it('fills the pre-scale square so ry < rx ellipses are not clipped', () => {
        const { document, canvases } = createFakeDocument();
        rasterizeRadialGradient(
            document as unknown as Document,
            200,
            50,
            [stop(BLACK, ZERO_LENGTH), stop(WHITE, HUNDRED_PERCENT)],
            false
        );
        const entry = canvases[0];
        expect(entry?.canvas.width).toBe(400);
        expect(entry?.canvas.height).toBe(100);
        expect(entry?.ctx.scale).toHaveBeenCalledWith(1, 0.25);
        // The fill covers the whole circle before the y-scale; a post-scale
        // (400 × 100) rect would paint only a 25px band of the 100px canvas.
        expect(entry?.ctx.fillRect).toHaveBeenCalledWith(0, 0, 400, 400);
    });

    it('skips the y-scale for circles', () => {
        const { document, canvases } = createFakeDocument();
        rasterizeRadialGradient(document as unknown as Document, 60, 60, [stop(RED, ZERO_LENGTH)], false);
        expect(canvases[0]?.ctx.scale).not.toHaveBeenCalled();
    });

    it('returns the last stop colour as the beyond-shape continuation', () => {
        const { document } = createFakeDocument();
        const rasterized = rasterizeRadialGradient(
            document as unknown as Document,
            50,
            50,
            [stop(BLACK, ZERO_LENGTH), stop(RED, HUNDRED_PERCENT)],
            false
        );
        expect(rasterized?.lastColor).toBe('rgb(255,0,0)');
    });

    it('stacks repeating stops across the gradient range', () => {
        const { document, canvases } = createFakeDocument();
        rasterizeRadialGradient(
            document as unknown as Document,
            100,
            100,
            [stop(BLACK, ZERO_LENGTH), stop(WHITE, FIFTY_PERCENT)],
            true
        );
        const stops = canvases[0]?.ctx.gradientStops ?? [];
        // cycle 0: 0, 0.5 — cycle 1: 0.5, 1 — pad extends the cycle's last colour
        expect(stops.map(([offset]) => offset)).toEqual([0, 0.5, 0.5, 1]);
        expect(stops[3]?.[1]).toBe('rgb(255,255,255)');
    });

    it('paints a solid last colour for a degenerate repeating period', () => {
        const { document, canvases } = createFakeDocument();
        rasterizeRadialGradient(
            document as unknown as Document,
            80,
            80,
            [stop(BLACK, ZERO_LENGTH), stop(WHITE, ZERO_LENGTH)],
            true
        );
        const entry = canvases[0];
        expect(entry?.ctx.createRadialGradient).not.toHaveBeenCalled();
        expect(entry?.ctx.fillStyle).toBe('rgb(255,255,255)');
        expect(entry?.ctx.fillRect).toHaveBeenCalledWith(0, 0, 160, 160);
    });
});
