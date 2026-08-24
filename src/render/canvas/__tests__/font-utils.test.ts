import { strictEqual } from 'assert';
import { measureBaseline, measureFontMetrics } from '../font-utils';

describe('measureBaseline', () => {
    const createMockCtx = (overrides: Record<string, unknown> = {}) => {
        return {
            font: '16px Arial',
            measureText(_text: string) {
                return {
                    width: 30,
                    fontBoundingBoxAscent: 14,
                    fontBoundingBoxDescent: 3,
                    actualBoundingBoxAscent: 14,
                    actualBoundingBoxDescent: 2,
                    ...overrides
                };
            }
        } as unknown as CanvasRenderingContext2D;
    };

    it('should return fontBoundingBoxAscent when available', () => {
        const ctx = createMockCtx({ fontBoundingBoxAscent: 13, actualBoundingBoxAscent: 14 });
        strictEqual(measureBaseline(ctx, 16), 13);
    });

    it('should fallback to actualBoundingBoxAscent when fontBoundingBoxAscent is undefined', () => {
        const ctx = createMockCtx({ fontBoundingBoxAscent: undefined, actualBoundingBoxAscent: 12 });
        strictEqual(measureBaseline(ctx, 16), 12);
    });

    it('should fallback to provided fallback when both metrics are undefined', () => {
        const ctx = createMockCtx({ fontBoundingBoxAscent: undefined, actualBoundingBoxAscent: undefined });
        strictEqual(measureBaseline(ctx, 16), 16);
    });

    it('should fallback to provided fallback when both metrics are NaN', () => {
        const ctx = createMockCtx({ fontBoundingBoxAscent: NaN, actualBoundingBoxAscent: NaN });
        strictEqual(measureBaseline(ctx, 16), 16);
    });

    it('should preserve 0 as a valid ascent value', () => {
        const ctx = createMockCtx({ fontBoundingBoxAscent: 0, actualBoundingBoxAscent: 0 });
        strictEqual(measureBaseline(ctx, 16), 0, '0 is a valid ascent, should not be replaced by fallback');
    });

    it('should use actualBoundingBoxAscent when fontBoundingBoxAscent is NaN', () => {
        const ctx = createMockCtx({ fontBoundingBoxAscent: NaN, actualBoundingBoxAscent: 14 });
        strictEqual(measureBaseline(ctx, 16), 14);
    });

    it('should return undefined when no metrics and fallback is undefined', () => {
        const ctx = createMockCtx({ fontBoundingBoxAscent: undefined, actualBoundingBoxAscent: undefined });
        const result = measureBaseline(ctx, undefined as unknown as number);
        strictEqual(result, undefined);
    });
});

describe('measureFontMetrics', () => {
    const createMockCtx = (overrides: Record<string, unknown> = {}) =>
        ({
            measureText: () => ({
                fontBoundingBoxAscent: 14,
                fontBoundingBoxDescent: 3,
                actualBoundingBoxAscent: 12,
                actualBoundingBoxDescent: 2,
                ...overrides
            })
        }) as unknown as CanvasRenderingContext2D;

    it('uses the font bounding box when both font metrics are available', () => {
        const metrics = measureFontMetrics(createMockCtx(), 16);
        strictEqual(metrics.baseline, 14);
        strictEqual(metrics.height, 17);
    });

    it('uses the actual glyph box when font bounding metrics are unavailable', () => {
        const metrics = measureFontMetrics(
            createMockCtx({ fontBoundingBoxAscent: undefined, fontBoundingBoxDescent: undefined }),
            16
        );
        strictEqual(metrics.baseline, 12);
        strictEqual(metrics.height, 14);
    });

    it('uses the fallback height when neither complete metric pair is available', () => {
        const metrics = measureFontMetrics(
            createMockCtx({
                fontBoundingBoxDescent: undefined,
                actualBoundingBoxAscent: undefined,
                actualBoundingBoxDescent: undefined
            }),
            16
        );
        strictEqual(metrics.baseline, 14);
        strictEqual(metrics.height, 16);
    });
});
