import { Bounds } from '../../../css/layout/bounds';
import { cropSurface, MAX_SURFACE_PIXELS, reserveSurface, surfaceBounds } from '../surface-bounds';
import { ElementContainer } from '../../../dom/element-container';

const box = (bounds: Bounds, filter: string | null = null, elements: ElementContainer[] = []): ElementContainer =>
    ({
        bounds,
        elements,
        textNodes: [],
        styles: { boxShadow: [], textShadow: [], filter, isVisible: () => true }
    }) as unknown as ElementContainer;

describe('bounded filter surfaces', () => {
    it('includes overflow children and cumulative nested blur/shadow outsets', () => {
        const child = box(new Bounds(-10, 10, 100, 50), 'blur(4px) drop-shadow(-20px 8px 10px black)');
        const parent = box(new Bounds(0, 0, 50, 50), 'blur(2px)', [child]);
        expect(surfaceBounds(parent)).toEqual(new Bounds(-78, -58, 236, 186));
    });
    it('keeps outside contributors and aligns cropped bounds to capture pixels', () => {
        expect(cropSurface(new Bounds(-100, -100, 500, 500), new Bounds(0.5, 0.5, 100, 100), 12, 2)).toEqual(
            new Bounds(-11.5, -11.5, 124, 124)
        );
        expect(cropSurface(new Bounds(1000, 1000, 10, 10), new Bounds(0, 0, 100, 100), 12, 1).width).toBe(0);
    });
    it('shares a strict backing-store reservation across nested surfaces', () => {
        const budget = { pixels: 0 };
        const reserved = reserveSurface(budget, 2048, 2048);
        expect(reserved).toBe(MAX_SURFACE_PIXELS);
        expect(reserveSurface(budget, 1, 1)).toBe(0);
        budget.pixels -= reserved;
        expect(reserveSurface(budget, 100, 100)).toBe(40000);
    });
    it.each([
        [8193, 1],
        [1, 8193],
        [Infinity, 10],
        [0, 100],
        [NaN, 10]
    ])('rejects unsafe dimensions %s × %s', (w, h) => {
        const budget = { pixels: 0 };
        expect(reserveSurface(budget, w, h)).toBe(0);
        expect(budget.pixels).toBe(0);
    });
});
