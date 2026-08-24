/**
 * Font measurement utility
 *
 * Provides Canvas API-based font measurement that works correctly with webfonts
 * (which may not be loaded in the original document) and system fonts.
 *
 * Fallback chain:
 *   1. fontBoundingBoxAscent — font-level metric (Chrome 99+, FF 116+, Safari 17.4+)
 *   2. actualBoundingBoxAscent — glyph-level metric (widely supported)
 *   3. fallback value — coarse CSS fallback
 */

const SAMPLE_TEXT = 'Mg'; // characters with both ascender and descender

export interface CanvasFontMetrics {
    baseline: number;
    height: number;
}

const isValidMetric = (value: number | undefined): value is number => value !== undefined && !Number.isNaN(value);

/**
 * Measure the baseline ascent and full font box for the currently set font.
 */
export const measureFontMetrics = (ctx: CanvasRenderingContext2D, fallback: number): CanvasFontMetrics => {
    const tm = ctx.measureText(SAMPLE_TEXT);
    const fontMetrics = tm as TextMetrics & {
        fontBoundingBoxAscent?: number;
        fontBoundingBoxDescent?: number;
    };
    const baseline = isValidMetric(fontMetrics.fontBoundingBoxAscent)
        ? fontMetrics.fontBoundingBoxAscent
        : isValidMetric(tm.actualBoundingBoxAscent)
          ? tm.actualBoundingBoxAscent
          : fallback;
    const height =
        isValidMetric(fontMetrics.fontBoundingBoxAscent) && isValidMetric(fontMetrics.fontBoundingBoxDescent)
            ? fontMetrics.fontBoundingBoxAscent + fontMetrics.fontBoundingBoxDescent
            : isValidMetric(tm.actualBoundingBoxAscent) && isValidMetric(tm.actualBoundingBoxDescent)
              ? tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent
              : fallback;

    return { baseline, height };
};

/**
 * Measure the baseline ascent for the currently set font.
 *
 * @param ctx - Canvas 2D rendering context with ctx.font already set
 * @param fallback - Fallback value when no metrics are available (e.g. fontSize.number)
 * @returns The distance from the text baseline to the top of the bounding box
 */
export const measureBaseline = (ctx: CanvasRenderingContext2D, fallback: number): number => {
    return measureFontMetrics(ctx, fallback).baseline;
};
