import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Bounds } from '../../../css/layout/bounds';
import { BoxShadow } from '../../../css/property-descriptors/box-shadow';
import { SHADOW_MASK_OFFSET } from '../../../core/constants';
import { ElementPaint } from '../../stacking-context';
import { Vector } from '../../vector';
import { paintBoxShadow } from '../box-shadow-painter';
import { FilterSurfaceError, releaseSurface, renderFilterSurface } from '../filter-surface';

vi.mock('../filter-surface', () => ({
    FilterSurfaceError: class FilterSurfaceError extends Error {},
    releaseSurface: vi.fn(),
    renderFilterSurface: vi.fn()
}));

const context = () => ({
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    drawImage: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: '',
    fillStyle: ''
});

const shadow = (inset = false, blur = 12): BoxShadow[number] =>
    ({
        inset,
        color: 0x00000080,
        offsetX: { number: 18 },
        offsetY: { number: -12 },
        blur: { number: blur },
        spread: { number: 0 }
    }) as BoxShadow[number];

const paint = {
    container: {
        bounds: new Bounds(100, 80, 120, 90),
        styles: { borderLeftWidth: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomWidth: 0 }
    },
    curves: Object.fromEntries(
        ['BorderBox', 'PaddingBox'].flatMap((kind) => [
            ['topLeft' + kind, new Vector(100, 80)],
            ['topRight' + kind, new Vector(220, 80)],
            ['bottomRight' + kind, new Vector(220, 170)],
            ['bottomLeft' + kind, new Vector(100, 170)]
        ])
    )
} as unknown as ElementPaint;

const setup = (scale = 2) => {
    const sourceCtx = context();
    const source = { width: 0, height: 0, getContext: vi.fn(() => sourceCtx) };
    const createElement = vi.fn(() => source);
    const ctx = { ...context(), canvas: { ownerDocument: { createElement } } };
    const options = { x: 40, y: 30, width: 320, height: 260, scale };
    const budget = { pixels: 0 };
    const filtered = { width: 320, height: 260 } as HTMLCanvasElement;
    vi.mocked(renderFilterSurface).mockResolvedValue(filtered);
    const run = (value = shadow()) =>
        paintBoxShadow(ctx as unknown as CanvasRenderingContext2D, paint, value, options, budget);
    return { ctx, sourceCtx, source, filtered, createElement, options, budget, run };
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderFilterSurface).mockReset();
});

describe('box-shadow painter', () => {
    it.each([0.5, 1, 2, 3])('scales native shadow metrics at capture scale %s', async (scale) => {
        const s = setup(scale);
        await s.run();
        expect(s.ctx.shadowOffsetX).toBe((18 + SHADOW_MASK_OFFSET) * scale);
        expect(s.ctx.shadowOffsetY).toBe(-12 * scale);
        expect(s.ctx.shadowBlur).toBe(12 * scale);
        expect(s.ctx.clip).toHaveBeenCalledWith('evenodd');
        expect(s.createElement).not.toHaveBeenCalled();
        expect(s.budget.pixels).toBe(0);
        expect(s.ctx.restore).toHaveBeenCalledOnce();
    });

    it('paints a hard inset once without an intermediate canvas', async () => {
        const s = setup();
        await s.run(shadow(true, 0));
        expect(s.ctx.fill).toHaveBeenCalledExactlyOnceWith('evenodd');
        expect(s.ctx.shadowBlur).toBe(0);
        expect(s.createElement).not.toHaveBeenCalled();
        expect(renderFilterSurface).not.toHaveBeenCalled();
    });

    it('blurs inset color once, clips the result, and releases the shared reservation', async () => {
        const s = setup();
        await s.run(shadow(true));
        expect(s.sourceCtx.fill).toHaveBeenCalledExactlyOnceWith('evenodd');
        expect(renderFilterSurface).toHaveBeenCalledWith(s.source, { blur: 6 }, 1, 2, undefined);
        expect(s.ctx.fill).not.toHaveBeenCalled();
        expect(s.ctx.drawImage).toHaveBeenCalledOnce();
        expect(s.ctx.clip).toHaveBeenCalledOnce();
        expect(releaseSurface).toHaveBeenCalledWith(s.source);
        expect(releaseSurface).toHaveBeenCalledWith(s.filtered);
        expect(s.budget.pixels).toBe(0);
    });

    it('returns the reservation when a source context is unavailable', async () => {
        const s = setup();
        s.source.getContext.mockReturnValue(null as unknown as ReturnType<typeof context>);
        await s.run(shadow(true));
        expect(renderFilterSurface).not.toHaveBeenCalled();
        expect(s.ctx.fill).toHaveBeenCalledOnce();
        expect(s.budget.pixels).toBe(0);
        expect(releaseSurface).toHaveBeenCalledWith(s.source);
    });

    it('falls back on a recoverable filter error without leaking the source', async () => {
        const s = setup();
        vi.mocked(renderFilterSurface).mockRejectedValue(new FilterSurfaceError('blocked SVG'));
        await s.run(shadow(true));
        expect(s.ctx.fill).toHaveBeenCalledOnce();
        expect(s.ctx.drawImage).not.toHaveBeenCalled();
        expect(s.budget.pixels).toBe(0);
        expect(releaseSurface).toHaveBeenCalledWith(s.source);
    });

    it('does not allocate when the shared budget is exhausted', async () => {
        const s = setup();
        s.budget.pixels = 64 * 1024 * 1024;
        await s.run(shadow(true));
        expect(s.createElement).not.toHaveBeenCalled();
        expect(s.ctx.fill).toHaveBeenCalledOnce();
        expect(s.budget.pixels).toBe(64 * 1024 * 1024);
    });

    it.each([new DOMException('cancelled', 'AbortError'), new Error('unexpected')])(
        'propagates non-recoverable errors and still cleans up: %s',
        async (error) => {
            const s = setup();
            vi.mocked(renderFilterSurface).mockRejectedValue(error);
            await expect(s.run(shadow(true))).rejects.toBe(error);
            expect(s.ctx.fill).not.toHaveBeenCalled();
            expect(s.ctx.drawImage).not.toHaveBeenCalled();
            expect(s.budget.pixels).toBe(0);
            expect(releaseSurface).toHaveBeenCalledWith(s.source);
        }
    );

    it('restores canvas state and frees both surfaces if composition throws', async () => {
        const s = setup();
        const error = new Error('draw failed');
        s.ctx.drawImage.mockImplementation(() => {
            throw error;
        });
        await expect(s.run(shadow(true))).rejects.toBe(error);
        expect(s.ctx.restore).toHaveBeenCalledOnce();
        expect(releaseSurface).toHaveBeenCalledTimes(2);
        expect(s.budget.pixels).toBe(0);
    });

    it('skips a fully transparent shadow', async () => {
        const s = setup();
        const value = shadow();
        value.color = 0;
        await s.run(value);
        expect(s.ctx.save).not.toHaveBeenCalled();
        expect(s.createElement).not.toHaveBeenCalled();
    });

    it('does not paint an outer shadow collapsed by negative spread', async () => {
        const s = setup();
        const value = shadow();
        value.spread.number = -100;
        await s.run(value);
        expect(s.ctx.fill).not.toHaveBeenCalled();
    });
});
