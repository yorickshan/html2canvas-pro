import { COLORS, parseColor, type Color } from '../css/types/color';
import { isTransparent } from '../css/types/color-utilities';
import type { Context } from './context';

/**
 * Resolve the background colour for the rendered canvas, following CSS
 * background propagation rules:
 *
 * 1. If the target element is `<html>`, inherit the first opaque ancestor
 *    (doc → body → fallback).
 * 2. Otherwise use the user-supplied backgroundColor, or opaque white.
 *
 * @param context               - Current rendering context.
 * @param element               - The root element being rendered.
 * @param backgroundColorOverride - User-supplied override (string | null).
 * @returns A resolved colour value suitable for filling the canvas.
 */
export const parseBackgroundColor = (
    context: Context,
    element: HTMLElement,
    backgroundColorOverride?: string | null
): Color => {
    const ownerDocument = element.ownerDocument;
    // http://www.w3.org/TR/css3-background/#special-backgrounds
    const documentBackgroundColor = ownerDocument.documentElement
        ? parseColor(context, getComputedStyle(ownerDocument.documentElement).backgroundColor as string)
        : COLORS.TRANSPARENT;
    const bodyBackgroundColor = ownerDocument.body
        ? parseColor(context, getComputedStyle(ownerDocument.body).backgroundColor as string)
        : COLORS.TRANSPARENT;

    const defaultBackgroundColor =
        typeof backgroundColorOverride === 'string'
            ? parseColor(context, backgroundColorOverride)
            : backgroundColorOverride === null
              ? COLORS.TRANSPARENT
              : 0xffffffff;

    return element === ownerDocument.documentElement
        ? isTransparent(documentBackgroundColor)
            ? isTransparent(bodyBackgroundColor)
                ? defaultBackgroundColor
                : bodyBackgroundColor
            : documentBackgroundColor
        : defaultBackgroundColor;
};
