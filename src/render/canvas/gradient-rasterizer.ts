/**
 * Shared gradient rasterisation primitives.
 *
 * Canvas 2D has no repeating gradients and no native elliptical radial
 * gradients, so every gradient painter (background, mask, border-image) needs
 * the same two building blocks:
 *
 * 1. periodic stop stacking — the one-cycle stop list re-added k·period + s
 *    for k = 0..cycles-1, clamped to the [0, 1] gradient range;
 * 2. ellipse rasterisation — a circle of radius rx scaled vertically by
 *    ry / rx, painted on a 2rx × 2ry offscreen canvas.
 *
 * Centralising them keeps the subtle invariants in one place:
 * - stop positions are normalised against rx (the canvas gradient radius),
 *   NOT the diameter — normalising against the diameter halves every
 *   absolute-px stop;
 * - the fill must cover the pre-scale circle (fillRect of the rx*2 square),
 *   not the post-scale ellipse box — a user-space (2rx × 2ry) rect shrinks
 *   vertically under the y-scale and clips the ellipse whenever ry < rx;
 * - outside the ending shape a radial gradient continues with its last
 *   colour, which callers must paint across the full area first.
 */

import { UnprocessedGradientColorStop, GradientColorStop } from '../../css/types/image';
import { processColorStops } from '../../css/types/functions/gradient';
import { asString } from '../../css/types/color-utilities';
import { at } from '../../core/util';

export interface StringColorStop {
    stop: number;
    color: string;
}

const clampStop = (stop: number): number => Math.min(1, Math.max(0, stop));

/**
 * Stack the one-cycle stop list periodically across [0, 1]. Returns null for
 * a degenerate period (all stops clamped to one point) — CSS renders the
 * last colour across the whole area in that case, and callers should paint
 * the last colour instead of stacking.
 */
export const stackRepeatingStops = (processed: GradientColorStop[]): StringColorStop[] | null => {
    const first = at(processed, 0);
    const last = at(processed, processed.length - 1);
    if (last.stop - first.stop < 1e-6) {
        return null;
    }
    const period = Math.max(last.stop - first.stop, 0.01);
    const stops: StringColorStop[] = [];
    const cycles = Math.ceil(1 / period);
    for (let k = 0; k < cycles; k++) {
        for (const s of processed) {
            const stop = k * period + (s.stop - first.stop);
            if (stop > 1) break;
            stops.push({ stop, color: asString(s.color) });
        }
    }
    // Continue with the last colour out to the ending shape (skip when a
    // cycle stop already lands exactly on 1).
    const lastPushed = stops[stops.length - 1];
    if (!lastPushed || lastPushed.stop < 1) {
        stops.push({ stop: 1, color: asString(last.color) });
    }
    return stops;
};

/** Map parsed stops to string-colour stops clamped into the canvas [0, 1] range. */
export const toCanvasStops = (processed: GradientColorStop[]): StringColorStop[] =>
    processed.map((s) => ({ stop: clampStop(s.stop), color: asString(s.color) }));

export interface RasterizedRadialGradient {
    /** 2rx × 2ry device-pixel canvas holding the gradient ellipse. */
    canvas: HTMLCanvasElement;
    /** Colour beyond the ending shape (the last stop's colour). */
    lastColor: string;
    rx: number;
    ry: number;
}

/**
 * Rasterise a radial gradient's ending-shape ellipse to an offscreen canvas.
 *
 * The ellipse is a circle of radius rx scaled vertically by ry / rx around
 * the canvas centre, so the offscreen canvas is the ellipse's full 2rx × 2ry
 * bounding box and callers draw it at (centre - rx, centre - ry). Handles the
 * repeating variant by stacking stops across the [0, 1] gradient range.
 */
export const rasterizeRadialGradient = (
    ownerDocument: Document,
    rx: number,
    ry: number,
    stops: UnprocessedGradientColorStop[],
    repeating = false
): RasterizedRadialGradient | null => {
    const processed = processColorStops(stops, rx);
    const last = at(processed, processed.length - 1);
    const lastColor = asString(last.color);

    const canvas = ownerDocument.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(rx * 2));
    canvas.height = Math.max(1, Math.ceil(ry * 2));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return null;
    }

    let colorStops: StringColorStop[];
    if (repeating) {
        const stacked = stackRepeatingStops(processed);
        if (!stacked) {
            // Degenerate period: the last colour covers everything.
            ctx.fillStyle = lastColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return { canvas, lastColor, rx, ry };
        }
        colorStops = stacked;
    } else {
        colorStops = toCanvasStops(processed);
    }

    const gradient = ctx.createRadialGradient(rx, rx, 0, rx, rx, rx);
    colorStops.forEach((s) => gradient.addColorStop(clampStop(s.stop), s.color));
    ctx.fillStyle = gradient;
    if (rx !== ry) {
        ctx.scale(1, ry / rx);
    }
    // Fill the pre-scale circle square: after the y-scale it maps to the
    // ellipse's full device box. A post-scale (2rx × 2ry) rect would cover
    // only a 2ry²/rx-tall band and clip the ellipse whenever ry < rx.
    ctx.fillRect(0, 0, rx * 2, rx * 2);
    return { canvas, lastColor, rx, ry };
};
