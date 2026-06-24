/**
 * Smoke tests for 29 core CSS property descriptors.
 *
 * Verifies each descriptor has a non-empty name and its initialValue
 * is defined (not null or undefined). These minimal checks ensure every
 * descriptor is registered correctly without requiring the full parsing
 * pipeline (which varies per parsing type).
 */
import { describe, it, expect } from 'vitest';
import { display } from '../display';
import { position } from '../position';
import { opacity as opacityDesc } from '../opacity';
import { visibility } from '../visibility';
import { float } from '../float';
import { overflow } from '../overflow';
import { textAlign } from '../text-align';
import { textTransform } from '../text-transform';
import { writingMode } from '../writing-mode';
import { direction } from '../direction';
import { fontStyle } from '../font-style';
import { fontWeight } from '../font-weight';
import { mixBlendMode } from '../mix-blend-mode';
import { boxDecorationBreak } from '../box-decoration-break';
import { objectFit } from '../object-fit';
import { imageRendering } from '../image-rendering';
import { paintOrder } from '../paint-order';
import { listStylePosition } from '../list-style-position';
import { listStyleType } from '../list-style-type';
import { textDecorationLine } from '../text-decoration-line';
import { textDecorationStyle } from '../text-decoration-style';
import { textOverflow } from '../text-overflow';
import { wordBreak } from '../word-break';
import { lineBreak } from '../line-break';
import { overflowWrap } from '../overflow-wrap';
import { fontVariant } from '../font-variant';
import { fontVariantLigatures } from '../font-variant-ligatures';
import { webkitLineClamp } from '../webkit-line-clamp';

const descs = [
    display,
    position,
    opacityDesc,
    visibility,
    float,
    overflow,
    textAlign,
    textTransform,
    writingMode,
    direction,
    fontStyle,
    fontWeight,
    mixBlendMode,
    boxDecorationBreak,
    objectFit,
    imageRendering,
    paintOrder,
    listStylePosition,
    listStyleType,
    textDecorationLine,
    textDecorationStyle,
    textOverflow,
    wordBreak,
    lineBreak,
    overflowWrap,
    fontVariant,
    fontVariantLigatures,
    webkitLineClamp
];

describe('core property descriptor smoke tests', () => {
    descs.forEach((desc) => {
        describe(desc.name, () => {
            it('has non-empty name', () => {
                expect(desc.name.length).toBeGreaterThan(0);
            });
            it('has defined initialValue', () => {
                expect(desc.initialValue).toBeDefined();
                expect(desc.initialValue).not.toBeNull();
            });
        });
    });
});
