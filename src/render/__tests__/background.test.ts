import { describe, expect, it } from 'vitest';
import { Bounds } from '../../css/layout/bounds';
import { ElementContainer } from '../../dom/element-container';
import { Context } from '../../core/context';
import { Parser } from '../../css/syntax/parser';
import { FLAG_INTEGER, TokenType } from '../../css/syntax/tokenizer';
import { BACKGROUND_CLIP } from '../../css/property-descriptors/background-clip';
import { BACKGROUND_ORIGIN } from '../../css/property-descriptors/background-origin';
import { backgroundPosition } from '../../css/property-descriptors/background-position';
import { BACKGROUND_REPEAT } from '../../css/property-descriptors/background-repeat';
import { backgroundSize, BackgroundSizeInfo } from '../../css/property-descriptors/background-size';
import { LengthPercentage } from '../../css/types/length-percentage';
import {
    calculateBackgroundPaintingArea,
    calculateBackgroundPositioningArea,
    calculateBackgroundRendering,
    calculateBackgroundRepeatPath,
    calculateBackgroundSize,
    getBackgroundValueForIndex,
    isAuto
} from '../background';
import { Vector } from '../vector';

const px = (n: number): LengthPercentage => ({
    type: TokenType.DIMENSION_TOKEN,
    number: n,
    flags: FLAG_INTEGER,
    unit: 'px'
});

const pct = (n: number): LengthPercentage => ({
    type: TokenType.PERCENTAGE_TOKEN,
    number: n,
    flags: FLAG_INTEGER
});

/** Parses a single layer of a background-size value (e.g. '50% 50%') into tokens. */
const parseSizeLayer = (value: string): BackgroundSizeInfo[] =>
    backgroundSize.parse({} as Context, Parser.parseValues(value))[0]!;

/** Parses a single layer of a background-position value (e.g. '10px 20px'). */
const parsePositionLayer = (value: string): LengthPercentage[] =>
    backgroundPosition.parse({} as Context, Parser.parseValues(value))[0]!;

interface ContainerStyleOverrides {
    backgroundOrigin?: BACKGROUND_ORIGIN[];
    backgroundClip?: BACKGROUND_CLIP[];
    backgroundSize?: BackgroundSizeInfo[][];
    backgroundPosition?: LengthPercentage[][];
    backgroundRepeat?: BACKGROUND_REPEAT[];
    borderLeftWidth?: number;
    borderTopWidth?: number;
    borderRightWidth?: number;
    borderBottomWidth?: number;
    paddingLeft?: LengthPercentage;
    paddingRight?: LengthPercentage;
    paddingTop?: LengthPercentage;
    paddingBottom?: LengthPercentage;
}

const container = (bounds: Bounds, overrides: ContainerStyleOverrides = {}): ElementContainer =>
    ({
        bounds,
        styles: {
            backgroundOrigin: [BACKGROUND_ORIGIN.BORDER_BOX],
            backgroundClip: [BACKGROUND_CLIP.BORDER_BOX],
            backgroundSize: [parseSizeLayer('auto')],
            backgroundPosition: [parsePositionLayer('0px 0px')],
            backgroundRepeat: [BACKGROUND_REPEAT.REPEAT],
            borderLeftWidth: 0,
            borderTopWidth: 0,
            borderRightWidth: 0,
            borderBottomWidth: 0,
            paddingLeft: px(0),
            paddingRight: px(0),
            paddingTop: px(0),
            paddingBottom: px(0),
            ...overrides
        }
    }) as unknown as ElementContainer;

// 100x50 box offset at (10, 20)
const BOX = new Bounds(10, 20, 100, 50);

describe('background rendering calculations', () => {
    describe('calculateBackgroundPositioningArea', () => {
        it('uses the border box for BORDER_BOX origin', () => {
            const element = container(BOX, { backgroundOrigin: [BACKGROUND_ORIGIN.BORDER_BOX] });
            expect(calculateBackgroundPositioningArea(BACKGROUND_ORIGIN.BORDER_BOX, element)).toEqual(BOX);
        });

        it('excludes borders and padding for CONTENT_BOX origin', () => {
            const element = container(BOX, {
                borderLeftWidth: 2,
                borderTopWidth: 2,
                borderRightWidth: 2,
                borderBottomWidth: 2,
                paddingLeft: px(10),
                paddingRight: px(10),
                paddingTop: px(10),
                paddingBottom: px(10)
            });
            expect(calculateBackgroundPositioningArea(BACKGROUND_ORIGIN.CONTENT_BOX, element)).toEqual(
                new Bounds(22, 32, 76, 26)
            );
        });

        it('resolves percentage padding against the border box width', () => {
            const element = container(BOX, {
                paddingLeft: pct(10),
                paddingRight: pct(10),
                paddingTop: pct(10),
                paddingBottom: pct(10)
            });
            // 10% of 100 for both axes -> 10px
            expect(calculateBackgroundPositioningArea(BACKGROUND_ORIGIN.CONTENT_BOX, element)).toEqual(
                new Bounds(20, 30, 80, 30)
            );
        });

        it('excludes only borders for PADDING_BOX origin', () => {
            const element = container(BOX, {
                borderLeftWidth: 2,
                borderTopWidth: 3,
                borderRightWidth: 4,
                borderBottomWidth: 5
            });
            expect(calculateBackgroundPositioningArea(BACKGROUND_ORIGIN.PADDING_BOX, element)).toEqual(
                new Bounds(12, 23, 94, 42)
            );
        });
    });

    describe('calculateBackgroundPaintingArea', () => {
        it('uses the border box for BORDER_BOX clip', () => {
            const element = container(BOX, { backgroundClip: [BACKGROUND_CLIP.BORDER_BOX] });
            expect(calculateBackgroundPaintingArea(BACKGROUND_CLIP.BORDER_BOX, element)).toEqual(BOX);
        });

        it('uses the content box for CONTENT_BOX clip', () => {
            const element = container(BOX, {
                borderLeftWidth: 1,
                borderTopWidth: 1,
                borderRightWidth: 1,
                borderBottomWidth: 1,
                paddingLeft: px(5),
                paddingRight: px(5),
                paddingTop: px(5),
                paddingBottom: px(5)
            });
            expect(calculateBackgroundPaintingArea(BACKGROUND_CLIP.CONTENT_BOX, element)).toEqual(
                new Bounds(16, 26, 88, 38)
            );
        });

        it('uses the padding box for any other clip value', () => {
            const element = container(BOX, {
                borderLeftWidth: 2,
                borderTopWidth: 2,
                borderRightWidth: 2,
                borderBottomWidth: 2
            });
            expect(calculateBackgroundPaintingArea(BACKGROUND_CLIP.PADDING_BOX, element)).toEqual(
                new Bounds(12, 22, 96, 46)
            );
        });
    });

    describe('calculateBackgroundSize', () => {
        const bounds = new Bounds(0, 0, 100, 50);

        it('returns a zero size for an empty layer', () => {
            expect(calculateBackgroundSize([], [null, null, null], bounds)).toEqual([0, 0]);
        });

        it('resolves percentage pairs against the positioning area', () => {
            expect(calculateBackgroundSize(parseSizeLayer('50% 25%'), [null, null, null], bounds)).toEqual([50, 12.5]);
        });

        it('resolves px pairs directly', () => {
            expect(calculateBackgroundSize(parseSizeLayer('30px 40px'), [null, null, null], bounds)).toEqual([30, 40]);
        });

        it('resolves calc() sizes against the positioning area', () => {
            expect(
                calculateBackgroundSize(parseSizeLayer('calc(50% + 10px) 20px'), [null, null, null], bounds)
            ).toEqual([60, 20]);
        });

        it('fills the remaining height for a single percentage size without intrinsic dimensions', () => {
            expect(calculateBackgroundSize(parseSizeLayer('50%'), [null, null, null], bounds)).toEqual([50, 50]);
        });

        it('scales a single percentage size using intrinsic proportions', () => {
            expect(calculateBackgroundSize(parseSizeLayer('50%'), [40, 20, null], bounds)).toEqual([50, 25]);
        });

        it('clamps a zero percentage width to the positioning area height', () => {
            expect(calculateBackgroundSize(parseSizeLayer('0%'), [null, null, null], bounds)).toEqual([0, 50]);
        });

        it('uses the positioning area for contain without intrinsic proportions', () => {
            expect(calculateBackgroundSize(parseSizeLayer('contain'), [null, null, null], bounds)).toEqual([100, 50]);
            expect(calculateBackgroundSize(parseSizeLayer('cover'), [40, 20, null], bounds)).toEqual([100, 50]);
        });

        it('fits contain inside the positioning area when it is wider than the image', () => {
            // target ratio 2 < intrinsic ratio 4 -> width-bound
            expect(calculateBackgroundSize(parseSizeLayer('contain'), [40, 10, 4], bounds)).toEqual([100, 25]);
        });

        it('letterboxes contain when the positioning area is narrower than the image', () => {
            // target ratio 2 is not < intrinsic ratio 1 -> height-bound
            expect(calculateBackgroundSize(parseSizeLayer('contain'), [10, 10, 1], bounds)).toEqual([50, 50]);
        });

        it('covers the positioning area when it is wider than the image', () => {
            // target ratio 2 < intrinsic ratio 4, but cover inverts the test -> height-bound
            expect(calculateBackgroundSize(parseSizeLayer('cover'), [40, 10, 4], bounds)).toEqual([200, 50]);
        });

        it('covers by width when the positioning area is narrower than the image', () => {
            // target ratio 2 is not < intrinsic ratio 1 -> width-bound
            expect(calculateBackgroundSize(parseSizeLayer('cover'), [10, 10, 1], bounds)).toEqual([100, 100]);
        });

        it('renders auto/auto at the intrinsic size', () => {
            expect(calculateBackgroundSize(parseSizeLayer('auto auto'), [30, 20, null], bounds)).toEqual([30, 20]);
            expect(calculateBackgroundSize(parseSizeLayer('auto'), [30, 20, null], bounds)).toEqual([30, 20]);
        });

        it('renders images without intrinsic dimensions at the positioning area size', () => {
            expect(calculateBackgroundSize(parseSizeLayer('auto'), [null, null, null], bounds)).toEqual([100, 50]);
        });

        it('renders images with intrinsic proportions but no dimensions at the positioning area size (known gap)', () => {
            expect(calculateBackgroundSize(parseSizeLayer('auto'), [null, null, 2], bounds)).toEqual([100, 50]);
        });

        it('scales a single intrinsic dimension using intrinsic proportions', () => {
            expect(calculateBackgroundSize(parseSizeLayer('auto'), [30, null, 2], bounds)).toEqual([30, 15]);
            expect(calculateBackgroundSize(parseSizeLayer('auto'), [null, 20, 2], bounds)).toEqual([40, 20]);
        });

        it('pairs a single intrinsic dimension with the positioning area when no proportions exist', () => {
            expect(calculateBackgroundSize(parseSizeLayer('auto'), [30, null, null], bounds)).toEqual([30, 50]);
            expect(calculateBackgroundSize(parseSizeLayer('auto'), [null, 20, null], bounds)).toEqual([100, 20]);
        });

        it('stretches to a specified dimension along the intrinsic proportion', () => {
            expect(calculateBackgroundSize(parseSizeLayer('50% auto'), [null, null, 2], bounds)).toEqual([50, 25]);
            expect(calculateBackgroundSize(parseSizeLayer('auto 50%'), [null, null, 2], bounds)).toEqual([50, 25]);
        });

        it('stretches to a specified dimension without intrinsic proportions', () => {
            expect(calculateBackgroundSize(parseSizeLayer('50% auto'), [null, null, null], bounds)).toEqual([50, 50]);
            expect(calculateBackgroundSize(parseSizeLayer('auto 50%'), [null, null, null], bounds)).toEqual([100, 25]);
        });

        it('scales both dimensions from one specified dimension and intrinsic dimensions', () => {
            expect(calculateBackgroundSize(parseSizeLayer('50% auto'), [40, 20, null], bounds)).toEqual([50, 25]);
            expect(calculateBackgroundSize(parseSizeLayer('auto 50%'), [40, 20, null], bounds)).toEqual([50, 25]);
        });

        it('throws when the size cannot be resolved', () => {
            // 'auto cover' - neither a length/percentage pair nor resolvable
            expect(() => calculateBackgroundSize(parseSizeLayer('auto cover'), [null, null, null], bounds)).toThrow(
                'Unable to calculate background-size for element'
            );
            // width resolved but the second token is neither auto nor a length
            expect(() => calculateBackgroundSize(parseSizeLayer('50% cover'), [null, null, null], bounds)).toThrow(
                'Unable to calculate background-size for element'
            );
            // unrecognised identifier
            expect(() => calculateBackgroundSize(parseSizeLayer('stretch'), [null, null, null], bounds)).toThrow(
                'Unable to calculate background-size for element'
            );
        });
    });

    describe('getBackgroundValueForIndex', () => {
        it('returns the value at the index when present', () => {
            expect(getBackgroundValueForIndex(['a', 'b'], 1)).toBe('b');
            expect(getBackgroundValueForIndex(['a', 'b'], 0)).toBe('a');
        });

        it('falls back to the first value for out-of-range layers', () => {
            expect(getBackgroundValueForIndex(['a', 'b'], 5)).toBe('a');
        });
    });

    describe('isAuto', () => {
        it('matches the auto ident', () => {
            expect(isAuto(parseSizeLayer('auto')[0]!)).toBe(true);
        });

        it('rejects other idents and length tokens', () => {
            expect(isAuto(parseSizeLayer('contain')[0]!)).toBe(false);
            expect(isAuto(parseSizeLayer('50%')[0]!)).toBe(false);
        });
    });

    describe('calculateBackgroundRepeatPath', () => {
        const positioning = new Bounds(0, 0, 100, 50);
        const painting = new Bounds(0, 0, 100, 50);
        const position: [number, number] = [5, 6];
        const size: [number, number] = [30, 40];

        it('spans the positioning area horizontally for repeat-x', () => {
            expect(
                calculateBackgroundRepeatPath(BACKGROUND_REPEAT.REPEAT_X, position, size, positioning, painting)
            ).toEqual([new Vector(0, 6), new Vector(100, 6), new Vector(100, 46), new Vector(0, 46)]);
        });

        it('spans the positioning area vertically for repeat-y', () => {
            expect(
                calculateBackgroundRepeatPath(BACKGROUND_REPEAT.REPEAT_Y, position, size, positioning, painting)
            ).toEqual([new Vector(5, 0), new Vector(35, 0), new Vector(35, 50), new Vector(5, 50)]);
        });

        it('draws a single tile for no-repeat', () => {
            expect(
                calculateBackgroundRepeatPath(BACKGROUND_REPEAT.NO_REPEAT, position, size, positioning, painting)
            ).toEqual([new Vector(5, 6), new Vector(35, 6), new Vector(35, 46), new Vector(5, 46)]);
        });

        it('fills the whole painting area for repeat', () => {
            const offsetPainting = new Bounds(10, 10, 100, 50);
            expect(
                calculateBackgroundRepeatPath(BACKGROUND_REPEAT.REPEAT, position, size, positioning, offsetPainting)
            ).toEqual([new Vector(10, 10), new Vector(110, 10), new Vector(110, 60), new Vector(10, 60)]);
        });
    });

    describe('calculateBackgroundRendering', () => {
        it('positions and sizes a no-repeat layer within the positioning area', () => {
            const element = container(BOX, {
                backgroundSize: [parseSizeLayer('50% 50%')],
                backgroundPosition: [parsePositionLayer('10px 20px')],
                backgroundRepeat: [BACKGROUND_REPEAT.NO_REPEAT]
            });

            const [path, offsetX, offsetY, width, height] = calculateBackgroundRendering(element, 0, [40, 20, null]);

            // size 50% x 50% of 100x50 -> 50x25; position 10px/20px from the top-left
            expect(path).toEqual([new Vector(20, 40), new Vector(70, 40), new Vector(70, 65), new Vector(20, 65)]);
            expect(offsetX).toBe(20);
            expect(offsetY).toBe(40);
            expect(width).toBe(50);
            expect(height).toBe(25);
        });

        it('centers a layer with a 50% position relative to the free space', () => {
            const element = container(BOX, {
                backgroundSize: [parseSizeLayer('50% 50%')],
                backgroundPosition: [parsePositionLayer('50% 50%')],
                backgroundRepeat: [BACKGROUND_REPEAT.NO_REPEAT]
            });

            const [, offsetX, offsetY] = calculateBackgroundRendering(element, 0, [null, null, null]);

            // free space (100-50, 50-25) -> position (25, 12.5) -> offset (35, 32.5->33)
            expect(offsetX).toBe(35);
            expect(offsetY).toBe(33);
        });

        it('shifts the offset by the padding box when the origin is padding-box', () => {
            const element = container(BOX, {
                backgroundOrigin: [BACKGROUND_ORIGIN.PADDING_BOX],
                borderLeftWidth: 2,
                borderTopWidth: 3,
                backgroundSize: [parseSizeLayer('50% 50%')],
                backgroundPosition: [parsePositionLayer('0px 0px')],
                backgroundRepeat: [BACKGROUND_REPEAT.NO_REPEAT]
            });

            const [, offsetX, offsetY] = calculateBackgroundRendering(element, 0, [null, null, null]);
            expect(offsetX).toBe(12);
            expect(offsetY).toBe(23);
        });

        it('restricts the repeat path to the content box when the clip is content-box', () => {
            const element = container(BOX, {
                backgroundClip: [BACKGROUND_CLIP.CONTENT_BOX],
                borderLeftWidth: 2,
                borderTopWidth: 2,
                borderRightWidth: 2,
                borderBottomWidth: 2,
                paddingLeft: px(10),
                paddingRight: px(10),
                paddingTop: px(10),
                paddingBottom: px(10),
                backgroundSize: [parseSizeLayer('50% 50%')],
                backgroundPosition: [parsePositionLayer('0px 0px')],
                backgroundRepeat: [BACKGROUND_REPEAT.REPEAT]
            });

            const [path] = calculateBackgroundRendering(element, 0, [null, null, null]);
            // content box (22, 32, 76, 26)
            expect(path).toEqual([new Vector(22, 32), new Vector(98, 32), new Vector(98, 58), new Vector(22, 58)]);
        });

        it('clamps zero computed sizes to at least one pixel', () => {
            const element = container(BOX, {
                backgroundSize: [parseSizeLayer('0%')]
            });

            const [, offsetX, offsetY, width, height] = calculateBackgroundRendering(element, 0, [null, null, null]);
            expect(width).toBe(1);
            expect(height).toBe(50);
            expect(offsetX).toBe(10);
            expect(offsetY).toBe(20);
        });

        it('falls back to the first layer value for layers without their own style', () => {
            const element = container(BOX, {
                backgroundSize: [parseSizeLayer('50% 50%')],
                backgroundPosition: [parsePositionLayer('10px 20px')],
                backgroundRepeat: [BACKGROUND_REPEAT.NO_REPEAT]
            });

            // Second layer has no per-layer styles -> falls back to index 0 values
            const [path, offsetX, , width] = calculateBackgroundRendering(element, 1, [null, null, null]);

            expect(width).toBe(50);
            expect(offsetX).toBe(20);
            expect(path[0]).toEqual(new Vector(20, 40));
        });
    });
});
