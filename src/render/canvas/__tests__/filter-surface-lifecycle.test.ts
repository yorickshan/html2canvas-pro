import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilterSurfaceError, renderFilterSurface } from '../filter-surface';
import { createMockContext } from '../../__mocks__/canvas';

describe('optional filter surface lifecycle', () => {
    let source: HTMLCanvasElement;
    let decode: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => createMockContext());
        vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test');
        // jsdom does not provide an image decoder.
        Object.defineProperty(HTMLImageElement.prototype, 'decode', {
            value: () => Promise.resolve(),
            configurable: true
        });
        decode = vi.spyOn(HTMLImageElement.prototype, 'decode');
        source = document.createElement('canvas');
        source.width = source.height = 10;
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('does not serialize pixels for opacity-only tainted canvases', async () => {
        vi.mocked(source.toDataURL).mockImplementation(() => {
            throw new DOMException('', 'SecurityError');
        });
        const result = await renderFilterSurface(source, { blur: 0 }, 0.5, 1);
        expect(result.width).toBe(10);
        expect(source.toDataURL).not.toHaveBeenCalled();
        expect(decode).not.toHaveBeenCalled();
    });

    it('signals a recoverable fallback when a filtered source is tainted', async () => {
        vi.mocked(source.toDataURL).mockImplementation(() => {
            throw new DOMException('', 'SecurityError');
        });
        await expect(renderFilterSurface(source, { blur: 4 }, 1, 1)).rejects.toBeInstanceOf(FilterSurfaceError);
        expect(decode).not.toHaveBeenCalled();
        expect(source.width).toBe(10);
    });

    it('releases the SVG reference after a CSP or decoder rejection', async () => {
        let image: HTMLImageElement | undefined;
        decode.mockImplementation(function (this: HTMLImageElement) {
            image = this;
            return Promise.reject(new Error('blocked'));
        });
        await expect(renderFilterSurface(source, { blur: 4 }, 1, 1)).rejects.toBeInstanceOf(FilterSurfaceError);
        expect(image?.hasAttribute('src')).toBe(false);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('aborts promptly during a stalled decode and removes the listener', async () => {
        decode.mockImplementation(() => new Promise(() => {}));
        const controller = new AbortController();
        const remove = vi.spyOn(controller.signal, 'removeEventListener');
        const result = renderFilterSurface(source, { blur: 4 }, 1, 1, controller.signal);
        const assertion = expect(result).rejects.toMatchObject({ name: 'AbortError' });
        controller.abort();
        await assertion;
        expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
        expect(vi.getTimerCount()).toBe(0);
    });

    it('times out a decoder that never settles', async () => {
        decode.mockImplementation(() => new Promise(() => {}));
        const result = renderFilterSurface(source, { blur: 4 }, 1, 1);
        const assertion = expect(result).rejects.toThrow('timed out');
        await vi.advanceTimersByTimeAsync(10000);
        await assertion;
        expect(vi.getTimerCount()).toBe(0);
    });

    it('clears a partially allocated output if drawing fails', async () => {
        const canvases: HTMLCanvasElement[] = [];
        vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(function (this: HTMLCanvasElement) {
            canvases.push(this);
            const context = createMockContext();
            vi.mocked(context.drawImage).mockImplementation(() => {
                throw new Error('decode resource lost');
            });
            return context;
        });
        await expect(renderFilterSurface(source, { blur: 4 }, 1, 1)).rejects.toBeInstanceOf(FilterSurfaceError);
        expect(canvases[0].width).toBe(0);
        expect(canvases[0].height).toBe(0);
    });
});
