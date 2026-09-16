import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockContext } from '../../__mocks__/canvas';

function pixels(data: number[]): ImageData {
    return { data: new Uint8ClampedArray(data) } as ImageData;
}

describe('native filter surface', () => {
    let helper: typeof import('../filter-surface');
    let source: HTMLCanvasElement;
    let contexts: Map<HTMLCanvasElement, CanvasRenderingContext2D>;
    let initialize: (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;

    beforeEach(async () => {
        vi.resetModules();
        helper = await import('../filter-surface');
        contexts = new Map();
        initialize = () => {};
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
            let context = contexts.get(this);
            if (!context) {
                context = createMockContext();
                vi.mocked(context.getImageData).mockImplementation((x: number) =>
                    pixels(x === 6 ? [255, 255, 255, 30] : [255, 0, 0, 128])
                );
                initialize(context, this);
                contexts.set(this, context);
            }
            return context;
        });
        vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test');
        Object.defineProperty(HTMLImageElement.prototype, 'decode', {
            value: () => Promise.resolve(),
            configurable: true
        });
        source = document.createElement('canvas');
        source.width = source.height = 100;
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('checks pixels for both blur and colored shadow and releases the probes', () => {
        expect(helper.supportsNativeFilters()).toBe(true);
        expect(contexts.size).toBe(2);
        for (const canvas of contexts.keys()) expect(canvas.width * canvas.height).toBe(0);
        expect(helper.supportsNativeFilters()).toBe(true);
        expect(contexts.size).toBe(2);
        expect(helper.supportsNativeFilters(document.implementation.createHTMLDocument())).toBe(true);
        expect(contexts.size).toBe(4);
    });

    it('rejects missing filter support before creating an expando', () => {
        initialize = (context) => {
            Reflect.deleteProperty(context, 'filter');
        };
        expect(helper.supportsNativeFilters()).toBe(false);
        for (const context of contexts.values()) expect('filter' in context).toBe(false);
    });

    it.each(['blur', 'shadow', 'readback'])('rejects a broken %s implementation', (broken) => {
        initialize = (context) => {
            vi.mocked(context.getImageData).mockImplementation((x: number) => {
                if (broken === 'readback') throw new Error('readback unavailable');
                return pixels(
                    x === 6
                        ? [255, 255, 255, broken === 'blur' ? 0 : 30]
                        : [255, 0, 0, broken === 'shadow' ? 0 : 128]
                );
            });
        };
        expect(helper.supportsNativeFilters()).toBe(false);
        for (const canvas of contexts.keys()) expect(canvas.width * canvas.height).toBe(0);
    });

    it('filters at full alpha, scales lengths and applies opacity only in the final pass', async () => {
        helper.supportsNativeFilters();
        const draws: Array<{ image: CanvasImageSource; filter: string; alpha: number }> = [];
        initialize = (context) => {
            vi.mocked(context.drawImage).mockImplementation((image: CanvasImageSource) => {
                draws.push({ image, filter: context.filter, alpha: context.globalAlpha });
            });
        };
        const result = await helper.renderFilterSurface(
            source,
            { blur: 4, shadow: { x: -12, y: 8, blur: 6, color: 'rgba(0,0,0,0.5)' } },
            0.25,
            2
        );
        expect(draws).toHaveLength(2);
        expect(draws[0]).toEqual({
            image: source,
            filter: 'blur(8px) drop-shadow(-24px 16px 12px rgba(0,0,0,0.5))',
            alpha: 1
        });
        expect(draws[1].filter).toBe('none');
        expect(draws[1].alpha).toBe(0.25);
        expect((draws[1].image as HTMLCanvasElement).width).toBe(0);
        expect(result.width).toBe(100);
        expect(source.width).toBe(100);
        expect(source.toDataURL).not.toHaveBeenCalled();
    });

    it('skips probing and serialization for opacity-only layers', async () => {
        const result = await helper.renderFilterSurface(source, { blur: 0 }, 0.5, 1);
        expect(contexts.size).toBe(1);
        expect(contexts.get(result)?.globalAlpha).toBe(0.5);
        expect(source.toDataURL).not.toHaveBeenCalled();
    });

    it('falls back to SVG after a native drawing failure and clears temporary canvases', async () => {
        helper.supportsNativeFilters();
        let fail = true;
        initialize = (context) => {
            vi.mocked(context.drawImage).mockImplementation(() => {
                if (context.filter !== 'none' && fail) {
                    fail = false;
                    throw new Error('native allocation lost');
                }
            });
        };
        const result = await helper.renderFilterSurface(source, { blur: 4 }, 0.5, 1);
        expect(fail).toBe(false);
        expect(source.toDataURL).toHaveBeenCalledTimes(1);
        for (const canvas of contexts.keys()) if (canvas !== result) expect(canvas.width * canvas.height).toBe(0);
        expect(source.width).toBe(100);
    });

    it('falls back when the actual filter assignment is rejected', async () => {
        helper.supportsNativeFilters();
        initialize = (context) => {
            Object.defineProperty(context, 'filter', { get: () => 'none', set: () => {} });
        };
        const result = await helper.renderFilterSurface(source, { blur: 4 }, 0.5, 1);
        expect(source.toDataURL).toHaveBeenCalledTimes(1);
        for (const canvas of contexts.keys()) if (canvas !== result) expect(canvas.width * canvas.height).toBe(0);
    });

    it('does not convert cancellation during a native draw into SVG fallback', async () => {
        helper.supportsNativeFilters();
        const controller = new AbortController();
        initialize = (context) => {
            vi.mocked(context.drawImage).mockImplementation(() => controller.abort());
        };
        await expect(helper.renderFilterSurface(source, { blur: 4 }, 0.5, 1, controller.signal)).rejects.toMatchObject({
            name: 'AbortError'
        });
        expect(source.toDataURL).not.toHaveBeenCalled();
        for (const canvas of contexts.keys()) expect(canvas.width * canvas.height).toBe(0);
        expect(source.width).toBe(100);
    });

    it('honors a pre-aborted signal before probing or allocating', async () => {
        const controller = new AbortController();
        controller.abort();
        await expect(helper.renderFilterSurface(source, { blur: 4 }, 1, 1, controller.signal)).rejects.toMatchObject({
            name: 'AbortError'
        });
        expect(contexts.size).toBe(0);
    });
});
