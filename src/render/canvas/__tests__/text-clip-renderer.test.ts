import { afterEach, describe, expect, it, vi } from 'vitest';
import { TextClipRenderer } from '../text-clip-renderer';
import { Context } from '../../../core/context';
import { Html2CanvasConfig } from '../../../config';
import { Bounds } from '../../../css/layout/bounds';
import { TextBounds } from '../../../css/layout/text';
import { ElementPaint } from '../../stacking-context';
import { createMockContext } from '../../__mocks__/canvas';

const createContext = (): Context => {
    const config = new Html2CanvasConfig({ window: window as unknown as Window });
    return new Context(
        { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
        new Bounds(0, 0, 800, 600),
        config
    );
};

interface PaintOverrides {
    styles?: Record<string, unknown>;
    fragments?: string[];
}

const makePaint = (width: number, height: number, overrides: PaintOverrides = {}): ElementPaint => {
    const fragments = overrides.fragments ?? [];
    return {
        container: {
            styles: {
                backgroundColor: { r: 255, g: 0, b: 0, a: 1 },
                backgroundImage: [],
                direction: 'ltr',
                writingMode: 0,
                letterSpacing: 0,
                fontSize: { number: 16, unit: 'px' },
                textShadow: [],
                webkitTextStrokeWidth: 0,
                webkitTextStrokeColor: { r: 0, g: 0, b: 0, a: 0 },
                ...overrides.styles
            },
            bounds: new Bounds(10, 20, width, height),
            textNodes: fragments.length
                ? [
                      {
                          textBounds: fragments.map(
                              (text, i) => new TextBounds(text, new Bounds(10 + i * 40, 20, 40, height))
                          )
                      }
                  ]
                : []
        }
    } as unknown as ElementPaint;
};

const createRenderer = () => {
    const context = createContext();
    const ctx = {
        canvas: document.createElement('canvas'),
        drawImage: vi.fn()
    } as unknown as CanvasRenderingContext2D;
    const renderer = new TextClipRenderer({
        ctx,
        context,
        scale: 2,
        createFontStyle: () => ['16px Arial', 'Arial', '16px']
    });
    return { renderer, ctx };
};

/**
 * The renderer creates one canvas per glyph layer. Returns the intercepted
 * contexts in creation order: [offscreen, mask, ...shadow layers, composite].
 */
const setupMockContexts = (): CanvasRenderingContext2D[] => {
    const contexts: CanvasRenderingContext2D[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
        const mock = createMockContext();
        (mock as { canvas: HTMLCanvasElement }).canvas = this;
        contexts.push(mock);
        return mock;
    });
    return contexts;
};

describe('TextClipRenderer', () => {
    afterEach(() => vi.restoreAllMocks());

    it('skips empty bounds without touching the canvas', async () => {
        const { renderer, ctx } = createRenderer();
        await renderer.render(makePaint(0, 100));
        await renderer.render(makePaint(100, 0));
        expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    it('skips silently when no 2D context is available (jsdom)', async () => {
        const { renderer, ctx } = createRenderer();
        // jsdom returns null for getContext('2d') without the canvas package:
        // the renderer must bail out instead of throwing.
        await renderer.render(makePaint(100, 50));
        expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    it('accumulates multiple fragments on the mask before one destination-in pass', async () => {
        // Regression for https://github.com/yorickshan/html2canvas-pro/issues/243:
        // applying destination-in per fragment kept only the pixels of the
        // current fragment, erasing everything drawn before it.
        const contexts = setupMockContexts();
        const { renderer, ctx } = createRenderer();

        await renderer.render(makePaint(200, 50, { fragments: ['also', '-', 'missing'] }));
        expect(contexts.length).toBe(2);
        const [offCtx, maskCtx] = contexts;

        // Glyphs are drawn to the mask with normal compositing, one per fragment.
        expect(maskCtx.fillText).toHaveBeenCalledTimes(3);
        expect(maskCtx.fillText).toHaveBeenNthCalledWith(1, 'also', 0, expect.any(Number));
        expect(maskCtx.fillText).toHaveBeenNthCalledWith(2, '-', 40, expect.any(Number));
        expect(maskCtx.fillText).toHaveBeenNthCalledWith(3, 'missing', 80, expect.any(Number));

        // The background canvas never receives glyphs directly; the combined
        // mask is applied exactly once via destination-in. The mask canvas is
        // device-sized (scale 2) but drawn at CSS size — the offscreen context
        // is already scaled to CSS pixels, so device dimensions would
        // double-scale the clip region.
        expect(offCtx.fillText).not.toHaveBeenCalled();
        expect(offCtx.globalCompositeOperation).toBe('destination-in');
        expect(offCtx.drawImage).toHaveBeenCalledTimes(1);
        const [mask, dx, dy, dw, dh] = (offCtx.drawImage as unknown as ReturnType<typeof vi.fn>).mock
            .calls[0] as unknown as number[];
        expect((mask as HTMLCanvasElement).width).toBe(400);
        expect((mask as HTMLCanvasElement).height).toBe(100);
        expect([dx, dy, dw, dh]).toEqual([0, 0, 200, 50]);

        // Clipped result is composited back onto the main canvas at CSS size
        // (the main context is already scaled), so the device-pixel offscreen
        // maps 1:1 onto the backing store and stays sharp at scale 2.
        expect(ctx.drawImage).toHaveBeenCalledTimes(1);
        const [comp, left, top, compW, compH] = (ctx.drawImage as unknown as ReturnType<typeof vi.fn>).mock
            .calls[0] as unknown as number[];
        expect((comp as HTMLCanvasElement).width).toBe(400);
        expect((comp as HTMLCanvasElement).height).toBe(100);
        expect([left, top, compW, compH]).toEqual([10, 20, 200, 50]);
    });

    it('draws letter-spaced fragments to the mask instead of the background canvas', async () => {
        const contexts = setupMockContexts();
        const { renderer, ctx } = createRenderer();

        await renderer.render(makePaint(200, 50, { fragments: ['a', 'b'], styles: { letterSpacing: 2 } }));
        expect(contexts.length).toBe(2);
        const [offCtx, maskCtx] = contexts;

        expect(maskCtx.fillText).toHaveBeenCalledTimes(2);
        expect(offCtx.fillText).not.toHaveBeenCalled();
        expect(offCtx.globalCompositeOperation).toBe('destination-in');
        expect(offCtx.drawImage).toHaveBeenCalledTimes(1);
        expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    });

    it('includes the stroke band in the mask when -webkit-text-stroke is set', async () => {
        const contexts = setupMockContexts();
        const { renderer, ctx } = createRenderer();

        await renderer.render(
            makePaint(200, 50, {
                fragments: ['A'],
                styles: { webkitTextStrokeWidth: 2, webkitTextStrokeColor: { r: 0, g: 0, b: 0, a: 1 } }
            })
        );
        expect(contexts.length).toBe(2);
        const [offCtx, maskCtx] = contexts;

        // Both fill and stroke contribute to the clip region; the stroke
        // width/lineJoin mirror the main text renderer.
        expect(maskCtx.fillText).toHaveBeenCalledTimes(1);
        expect(maskCtx.strokeText).toHaveBeenCalledTimes(1);
        expect(maskCtx.strokeText).toHaveBeenCalledWith('A', 0, expect.any(Number));
        expect(maskCtx.lineWidth).toBe(2);
        expect(offCtx.drawImage).toHaveBeenCalledTimes(1);
        expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    });

    it('paints shadow silhouettes beneath the clipped background', async () => {
        const contexts = setupMockContexts();
        const { renderer, ctx } = createRenderer();

        await renderer.render(
            makePaint(200, 50, {
                fragments: ['A'],
                styles: {
                    textShadow: [
                        {
                            color: { r: 0, g: 0, b: 0, a: 1 },
                            offsetX: { number: 2 },
                            offsetY: { number: 2 },
                            blur: { number: 0 }
                        },
                        {
                            color: { r: 255, g: 0, b: 0, a: 1 },
                            offsetX: { number: 4 },
                            offsetY: { number: 4 },
                            blur: { number: 0 }
                        }
                    ]
                }
            })
        );
        // offscreen + mask + one shadow layer per shadow + composite
        expect(contexts.length).toBe(5);
        const [offCtx, maskCtx, deepShadowCtx, frontShadowCtx, compositeCtx] = contexts;

        // Each shadow gets its own canvas (a shared canvas would make every
        // previously drawn glyph cast again), drawn in reverse order — the
        // last declared shadow deepest — with device-pixel offsets.
        expect(deepShadowCtx.fillText).toHaveBeenCalledTimes(1);
        expect(deepShadowCtx.shadowOffsetX).toBe(8);
        expect(frontShadowCtx.fillText).toHaveBeenCalledTimes(1);
        expect(frontShadowCtx.shadowOffsetX).toBe(4);
        // The composite layers shadows first, then the clipped background.
        expect(compositeCtx.drawImage).toHaveBeenCalledTimes(3);
        expect(compositeCtx.drawImage).toHaveBeenNthCalledWith(1, expect.anything(), 0, 0);
        expect(offCtx.globalCompositeOperation).toBe('destination-in');
        expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    });

    it('composites straight onto the main canvas when no shadows are present', async () => {
        const contexts = setupMockContexts();
        const { renderer, ctx } = createRenderer();

        await renderer.render(makePaint(200, 50, { fragments: ['A'] }));
        expect(contexts.length).toBe(2);
        expect(ctx.drawImage).toHaveBeenCalledTimes(1);
        const [, left, top] = (ctx.drawImage as unknown as ReturnType<typeof vi.fn>).mock
            .calls[0] as unknown as number[];
        expect([left, top]).toEqual([10, 20]);
    });
});
