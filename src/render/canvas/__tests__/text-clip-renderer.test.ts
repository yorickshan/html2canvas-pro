import { describe, expect, it, vi } from 'vitest';
import { TextClipRenderer } from '../text-clip-renderer';
import { Context } from '../../../core/context';
import { Html2CanvasConfig } from '../../../config';
import { Bounds } from '../../../css/layout/bounds';
import { ElementPaint } from '../../stacking-context';

const createContext = (): Context => {
    const config = new Html2CanvasConfig({ window: window as unknown as Window });
    return new Context(
        { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
        new Bounds(0, 0, 800, 600),
        config
    );
};

const makePaint = (width: number, height: number): ElementPaint =>
    ({
        container: {
            styles: {
                backgroundColor: { r: 255, g: 0, b: 0, a: 1 },
                backgroundImage: [],
                direction: 'ltr',
                writingMode: 0,
                letterSpacing: 0,
                fontSize: { number: 16, unit: 'px' }
            },
            bounds: new Bounds(10, 20, width, height),
            textNodes: []
        }
    }) as unknown as ElementPaint;

const createRenderer = () => {
    const context = createContext();
    const ctx = {
        canvas: document.createElement('canvas'),
        drawImage: vi.fn()
    } as unknown as CanvasRenderingContext2D;
    const renderer = new TextClipRenderer({
        ctx,
        context,
        createFontStyle: () => ['16px Arial', 'Arial', '16px']
    });
    return { renderer, ctx };
};

describe('TextClipRenderer', () => {
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
});
