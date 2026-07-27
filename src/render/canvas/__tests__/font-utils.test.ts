import { strictEqual } from 'assert';
import { measureBaseline } from '../font-utils';

describe('measureBaseline', () => {
    const createMockCtx = (overrides: Record<string, unknown> = {}) => {
        return {
            font: '16px Arial',
            measureText(_text: string) {
                return {
                    width: 30,
                    fontBoundingBoxAscent: 14,
                    actualBoundingBoxAscent: 14,
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
