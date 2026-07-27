/**
 * Font measurement utility
 *
 * Provides Canvas API-based baseline measurement that works correctly with
 * webfonts (which may not be loaded in the original document) and system fonts.
 *
 * Fallback chain:
 *   1. fontBoundingBoxAscent — font-level metric (Chrome 99+, FF 116+, Safari 17.4+)
 *   2. actualBoundingBoxAscent — glyph-level metric (widely supported)
 *   3. fallback value — coarse CSS fallback
 */

const SAMPLE_TEXT = 'Mg'; // characters with both ascender and descender

/**
 * Measure the baseline ascent for the currently set font.
 *
 * @param ctx - Canvas 2D rendering context with ctx.font already set
 * @param fallback - Fallback value when no metrics are available (e.g. fontSize.number)
 * @returns The distance from the text baseline to the top of the bounding box
 */
export const measureBaseline = (ctx: CanvasRenderingContext2D, fallback: number): number => {
    const tm = ctx.measureText(SAMPLE_TEXT);
    const fmAscent = (tm as { fontBoundingBoxAscent?: number }).fontBoundingBoxAscent;
    const ascent = fmAscent !== undefined && !Number.isNaN(fmAscent) ? fmAscent : tm.actualBoundingBoxAscent;
    return ascent !== undefined && !Number.isNaN(ascent) ? ascent : fallback;
};
