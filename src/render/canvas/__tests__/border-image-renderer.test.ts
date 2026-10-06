import { deepStrictEqual } from 'assert';
import { describe, expect, it, vi } from 'vitest';
import { createMockContext } from '../../__mocks__/canvas';
import { BorderImageRenderer, resolveBorderImageOutset, resolveBorderImageWidths } from '../border-image-renderer';
import { BORDER_IMAGE_REPEAT } from '../../../css/property-descriptors/border-image-repeat';
import type { BorderImageSlice } from '../../../css/property-descriptors/border-image-slice';
import { Bounds } from '../../../css/layout/bounds';

const ctx = () =>
    createMockContext() as unknown as CanvasRenderingContext2D & {
        drawImage: ReturnType<typeof vi.fn>;
    };

const image = (width: number, height: number): HTMLImageElement =>
    ({ naturalWidth: width, naturalHeight: height, width, height }) as unknown as HTMLImageElement;

const slice = (value: number, fill = false): BorderImageSlice => ({
    top: value,
    right: value,
    bottom: value,
    left: value,
    fill,
    unit: 'percent'
});

describe('resolveBorderImageWidths', () => {
    it('resolves percentages against the area height for top/bottom and width for left/right', () => {
        const widths = resolveBorderImageWidths(
            {
                top: { kind: 'percent', value: 10 },
                right: { kind: 'percent', value: 20 },
                bottom: { kind: 'percent', value: 10 },
                left: { kind: 'percent', value: 20 }
            },
            [5, 5, 5, 5],
            new Bounds(0, 0, 200, 100)
        );
        deepStrictEqual(widths, [10, 40, 10, 40]);
    });

    it('multiplies border widths for number kinds and passes lengths through', () => {
        const widths = resolveBorderImageWidths(
            {
                top: { kind: 'number', value: 2 },
                right: { kind: 'length', value: 12 },
                bottom: { kind: 'auto', value: undefined },
                left: undefined as never
            },
            [5, 6, 7, 8],
            new Bounds(0, 0, 100, 100)
        );
        deepStrictEqual(widths, [10, 12, 7, 8]);
    });
});

describe('resolveBorderImageOutset', () => {
    it('multiplies border widths for numbers and passes lengths through', () => {
        const outset = resolveBorderImageOutset(
            {
                top: { kind: 'number', value: 2 },
                right: { kind: 'length', value: 9 },
                bottom: undefined as never,
                left: { kind: 'number', value: 0 }
            },
            [5, 6, 7, 8]
        );
        deepStrictEqual(outset, { top: 10, right: 9, bottom: 0, left: 0 });
    });
});

describe('BorderImageRenderer.renderBorderImage', () => {
    // 25×30 box with 10px borders: the top edge destination is 5 wide × 10
    // tall — narrower than it is tall, which is what used to mis-route the
    // tiling direction through the dw >= dh heuristic.
    const bounds = new Bounds(0, 0, 25, 30);
    const borders = [10, 10, 10, 10];
    // 8×8 image sliced at 25%: source slices are 2px, the top edge strip is
    // 4×2, the center 4×4.
    const img = image(8, 8);

    const callsOf = (c: ReturnType<typeof ctx>): number[][] =>
        (c.drawImage as ReturnType<typeof vi.fn>).mock.calls.map(
            (call: unknown[]) => (call as number[]).slice(1) // drop the image argument
        );

    it('tiles narrow top/bottom edges horizontally by edge identity, not aspect', () => {
        const c = ctx();
        new BorderImageRenderer(c).renderBorderImage(
            bounds,
            img,
            slice(25),
            { horizontal: BORDER_IMAGE_REPEAT.REPEAT, vertical: BORDER_IMAGE_REPEAT.STRETCH },
            ...borders
        );
        // Center-column strips only (sx=2, sw=4): excludes the 2px corners
        // at sx 0/6 and the left/right edges (sy=2).
        const topEdge = callsOf(c).filter(
            ([sx, sy, sw, sh, , dy]) => sx === 2 && sy === 0 && sw === 4 && sh === 2 && dy === 0
        );
        // Two tiles of the full 4px source width at y=0 — the old heuristic
        // produced a single vertical tile at squeezed width.
        deepStrictEqual(
            topEdge.map(([sx, , sw, , dx, , dw]) => [sx, sw, dx, dw]),
            [
                [2, 4, 10, 4],
                [2, 4, 14, 4]
            ]
        );
    });

    it('crops rather than squeezes the overflowing last repeat tile', () => {
        const c = ctx();
        new BorderImageRenderer(c).renderBorderImage(
            bounds,
            img,
            slice(25),
            { horizontal: BORDER_IMAGE_REPEAT.REPEAT, vertical: BORDER_IMAGE_REPEAT.REPEAT },
            ...borders
        );
        const topEdge = callsOf(c).filter(
            ([sx, sy, sw, sh, , dy]) => sx === 2 && sy === 0 && sw === 4 && sh === 2 && dy === 0
        );
        // Both tiles keep the full 4px destination width; the rect clip
        // crops the second one at the 5px-wide edge.
        expect(topEdge.every(([, , , , , , dw]) => dw === 4)).toBe(true);
    });

    it('tiles the filled center region per the repeat keywords', () => {
        const c = ctx();
        new BorderImageRenderer(c).renderBorderImage(
            bounds,
            img,
            slice(25, true),
            { horizontal: BORDER_IMAGE_REPEAT.REPEAT, vertical: BORDER_IMAGE_REPEAT.REPEAT },
            ...borders
        );
        // Center source 4×4, destination 5×10: ceil(5/4)=2 columns ×
        // ceil(10/4)=3 rows = 6 tiles, each at source size. The sx=2/sw=4
        // guard excludes the left/right edge strips.
        const center = callsOf(c).filter(([sx, sy, sw, sh]) => sx === 2 && sy === 2 && sw === 4 && sh === 4);
        expect(center.length).toBe(6);
        deepStrictEqual(
            center.map(([, , , , dx]) => dx).sort((a, b) => a - b),
            [10, 10, 10, 14, 14, 14]
        );
        deepStrictEqual(
            center.map(([, , , , , dy]) => dy).sort((a, b) => a - b),
            [10, 10, 14, 14, 18, 18]
        );
    });

    it('stretches the filled center region for the default repeat', () => {
        const c = ctx();
        new BorderImageRenderer(c).renderBorderImage(
            bounds,
            img,
            slice(25, true),
            { horizontal: BORDER_IMAGE_REPEAT.STRETCH, vertical: BORDER_IMAGE_REPEAT.STRETCH },
            ...borders
        );
        const center = callsOf(c).filter(([sx, sy, sw, sh]) => sx === 2 && sy === 2 && sw === 4 && sh === 4);
        expect(center.length).toBe(1);
        deepStrictEqual(center[0]?.slice(4), [10, 10, 5, 10]);
    });
});
