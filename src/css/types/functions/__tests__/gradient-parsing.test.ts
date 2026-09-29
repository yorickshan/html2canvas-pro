import { strictEqual } from 'assert';
import { Parser } from '../../../syntax/parser';
import { TokenType, FLAG_INTEGER } from '../../../syntax/tokenizer';
import { color } from '../../color';
import { CSSImageType, CSSRadialExtent, CSSRadialGradientImage, CSSRadialShape } from '../../image';
import { radialGradient } from '../radial-gradient';
import { prefixRadialGradient } from '../-prefix-radial-gradient';
import { webkitGradient } from '../-webkit-gradient';
import { calculateGradientDirection, calculateRadius, parseColorStop } from '../gradient';
import { FIFTY_PERCENT, HUNDRED_PERCENT, ZERO_LENGTH } from '../../length-percentage';
import { Context } from '../../../../core/context';

const parse = (fn: (context: Context, tokens: CSSValueTokens) => unknown, value: string) => {
    const functionToken = Parser.parseValue(value);
    strictEqual(functionToken.type, TokenType.FUNCTION, `expected a function token for ${value}`);
    return fn({} as Context, (functionToken as { values: never }).values);
};

type CSSValueTokens = Parameters<typeof radialGradient>[1];

const px = (n: number) => ({ type: TokenType.DIMENSION_TOKEN, number: n, flags: FLAG_INTEGER, unit: 'px' });

const colorOf = (value: string) => color.parse({} as Context, Parser.parseValue(value));

describe('functions', () => {
    describe('radial-gradient', () => {
        const parseRadial = (value: string) => parse(radialGradient, value) as CSSRadialGradientImage;

        it('circle at center', () => {
            const image = parseRadial('radial-gradient(circle at center, #000, #fff)');
            strictEqual(image.shape, CSSRadialShape.CIRCLE);
            strictEqual(image.position.length, 1);
            strictEqual(image.position[0], FIFTY_PERCENT);
        });

        it('at top left', () => {
            const image = parseRadial('radial-gradient(circle at top left, #000, #fff)');
            strictEqual(image.position[0], ZERO_LENGTH);
            strictEqual(image.position[1], ZERO_LENGTH);
        });

        it('at right bottom', () => {
            const image = parseRadial('radial-gradient(circle at right bottom, #000, #fff)');
            strictEqual(image.position[0], HUNDRED_PERCENT);
            strictEqual(image.position[1], HUNDRED_PERCENT);
        });

        it('at length position', () => {
            const image = parseRadial('radial-gradient(circle at 10px 20px, #000, #fff)');
            strictEqual(image.position.length, 2);
            strictEqual((image.position[0] as { number: number }).number, 10);
            strictEqual((image.position[1] as { number: number }).number, 20);
        });

        it('ellipse farthest-side', () => {
            const image = parseRadial('radial-gradient(ellipse farthest-side, #000, #fff)');
            strictEqual(image.shape, CSSRadialShape.ELLIPSE);
            strictEqual(image.size, CSSRadialExtent.FARTHEST_SIDE);
        });

        it('circle contain maps to closest-corner', () => {
            const image = parseRadial('radial-gradient(circle contain, #000, #fff)');
            strictEqual(image.size, CSSRadialExtent.CLOSEST_CORNER);
        });

        it('circle cover maps to farthest-side', () => {
            const image = parseRadial('radial-gradient(circle cover, #000, #fff)');
            strictEqual(image.size, CSSRadialExtent.FARTHEST_SIDE);
        });

        it('ellipse explicit size', () => {
            const image = parseRadial('radial-gradient(ellipse 100px 50px, #000, #fff)');
            strictEqual(Array.isArray(image.size), true);
            const size = image.size as unknown[];
            strictEqual((size[0] as { number: number }).number, 100);
            strictEqual((size[1] as { number: number }).number, 50);
        });

        it('lone length becomes the size', () => {
            const image = parseRadial('radial-gradient(100px, #000, #fff)');
            const size = image.size as unknown[];
            strictEqual(Array.isArray(size), true);
            strictEqual((size[0] as { number: number }).number, 100);
        });

        it('color stops with positions', () => {
            const image = parseRadial('radial-gradient(circle, #000 10px, #fff 20%)');
            strictEqual(image.stops.length, 2);
            strictEqual((image.stops[0]?.stop as { number: number }).number, 10);
            strictEqual((image.stops[1]?.stop as { number: number }).number, 20);
        });
    });

    describe('-prefix-radial-gradient', () => {
        const parsePrefix = (value: string) => parse(prefixRadialGradient, value) as CSSRadialGradientImage;

        it('center position', () => {
            const image = parsePrefix('-webkit-radial-gradient(center, #000, #fff)');
            strictEqual(image.position.length, 1);
            strictEqual(image.position[0], FIFTY_PERCENT);
            strictEqual(image.stops.length, 2);
        });

        it('top left position', () => {
            const image = parsePrefix('-webkit-radial-gradient(top left, #000, #fff)');
            strictEqual(image.position[0], ZERO_LENGTH);
            strictEqual(image.position[1], ZERO_LENGTH);
        });

        it('right bottom position', () => {
            const image = parsePrefix('-webkit-radial-gradient(right bottom, #000, #fff)');
            strictEqual(image.position[0], HUNDRED_PERCENT);
            strictEqual(image.position[1], HUNDRED_PERCENT);
        });

        it('length position', () => {
            const image = parsePrefix('-webkit-radial-gradient(10px 20px, #000, #fff)');
            strictEqual((image.position[0] as { number: number }).number, 10);
            strictEqual((image.position[1] as { number: number }).number, 20);
        });

        it('circle closest-side', () => {
            const image = parsePrefix('-webkit-radial-gradient(center, circle closest-side, #000, #fff)');
            strictEqual(image.shape, CSSRadialShape.CIRCLE);
            strictEqual(image.size, CSSRadialExtent.CLOSEST_SIDE);
        });

        it('ellipse farthest-side', () => {
            const image = parsePrefix('-webkit-radial-gradient(center, ellipse farthest-side, #000, #fff)');
            strictEqual(image.shape, CSSRadialShape.ELLIPSE);
            strictEqual(image.size, CSSRadialExtent.FARTHEST_SIDE);
        });

        it('closest-corner', () => {
            const image = parsePrefix('-webkit-radial-gradient(center, circle closest-corner, #000, #fff)');
            strictEqual(image.size, CSSRadialExtent.CLOSEST_CORNER);
        });

        it('cover maps to farthest-corner', () => {
            const image = parsePrefix('-webkit-radial-gradient(center, circle cover, #000, #fff)');
            strictEqual(image.size, CSSRadialExtent.FARTHEST_CORNER);
        });

        it('contain maps to closest-side', () => {
            const image = parsePrefix('-webkit-radial-gradient(center, ellipse contain, #000, #fff)');
            strictEqual(image.size, CSSRadialExtent.CLOSEST_SIDE);
        });

        it('farthest-corner default keyword', () => {
            const image = parsePrefix('-webkit-radial-gradient(center, circle farthest-corner, #000, #fff)');
            strictEqual(image.size, CSSRadialExtent.FARTHEST_CORNER);
        });

        it('explicit ellipse size', () => {
            const image = parsePrefix('-webkit-radial-gradient(50% 50%, ellipse 100px 50px, #000, #fff)');
            strictEqual(image.shape, CSSRadialShape.ELLIPSE);
            const size = image.size as unknown[];
            strictEqual((size[0] as { number: number }).number, 100);
            strictEqual((size[1] as { number: number }).number, 50);
            strictEqual(image.position.length, 2);
            strictEqual((image.position[0] as { number: number }).number, 50);
        });

        it('color stops', () => {
            const image = parsePrefix('-webkit-radial-gradient(center, circle, #000 10px, #fff)');
            strictEqual(image.stops.length, 2);
            strictEqual((image.stops[0]?.stop as { number: number }).number, 10);
            strictEqual(image.stops[1]?.stop, null);
        });
    });

    describe('-webkit-gradient', () => {
        it('linear with from/to stops', () => {
            const image = parse(webkitGradient, '-webkit-gradient(linear, from(rgb(255,0,0)), to(rgb(0,0,255)))') as {
                type: CSSImageType;
                angle: number;
                stops: { stop: unknown; color: number }[];
            };
            strictEqual(image.type, CSSImageType.LINEAR_GRADIENT);
            strictEqual(image.angle, 0);
            strictEqual(image.stops[0]?.stop, ZERO_LENGTH);
            strictEqual(image.stops[0]?.color, colorOf('rgb(255,0,0)'));
            strictEqual(image.stops[1]?.stop, HUNDRED_PERCENT);
            strictEqual(image.stops[1]?.color, colorOf('rgb(0,0,255)'));
        });

        it('radial defaults to circle farthest-corner', () => {
            const image = parse(webkitGradient, '-webkit-gradient(radial, from(#000), to(#fff))') as {
                type: CSSImageType;
                shape: CSSRadialShape;
                size: CSSRadialExtent;
                position: unknown[];
                stops: unknown[];
            };
            strictEqual(image.type, CSSImageType.RADIAL_GRADIENT);
            strictEqual(image.shape, CSSRadialShape.CIRCLE);
            strictEqual(image.size, CSSRadialExtent.FARTHEST_CORNER);
            strictEqual(image.position.length, 0);
            strictEqual(image.stops.length, 2);
        });

        it('color-stop with numeric position', () => {
            const image = parse(
                webkitGradient,
                '-webkit-gradient(linear, color-stop(0.25, rgb(255,0,0)), to(rgb(0,0,255)))'
            ) as { stops: { stop: { type: TokenType; number: number } }[] };
            strictEqual(image.stops[0]?.stop.type, TokenType.PERCENTAGE_TOKEN);
            strictEqual(image.stops[0]?.stop.number, 25);
        });

        it('ignores unrecognized arguments', () => {
            const image = parse(webkitGradient, '-webkit-gradient(linear, red, blue)') as { stops: unknown[] };
            strictEqual(image.stops.length, 0);
        });

        it('ignores color-stop without a numeric position', () => {
            const image = parse(
                webkitGradient,
                '-webkit-gradient(linear, color-stop(#000), color-stop(#000, #fff, #fff), to(#fff))'
            ) as { stops: unknown[] };
            strictEqual(image.stops.length, 1);
        });
    });

    describe('parseColorStop', () => {
        it('keeps a length stop', () => {
            const stop = parseColorStop({} as Context, [colorOf('#000'), px(10)] as never);
            strictEqual((stop.stop as { number: number }).number, 10);
        });

        it('drops non-length stops', () => {
            const ident = { type: TokenType.IDENT_TOKEN, value: 'foo', flags: 0 };
            strictEqual(parseColorStop({} as Context, [colorOf('#000'), ident] as never).stop, null);
            strictEqual(parseColorStop({} as Context, [colorOf('#000')] as never).stop, null);
        });
    });

    describe('calculateRadius', () => {
        const image = (shape: CSSRadialShape, size: unknown): CSSRadialGradientImage =>
            ({
                shape,
                size,
                position: [],
                stops: [],
                type: CSSImageType.RADIAL_GRADIENT
            }) as unknown as CSSRadialGradientImage;
        // 100x50 box, center at (50, 25)
        const w = 100;
        const h = 50;
        const x = 50;
        const y = 25;

        it('circle closest-side', () => {
            const [rx, ry] = calculateRadius(image(CSSRadialShape.CIRCLE, CSSRadialExtent.CLOSEST_SIDE), x, y, w, h);
            strictEqual(rx, 25);
            strictEqual(ry, 25);
        });

        it('circle farthest-side', () => {
            const [rx, ry] = calculateRadius(image(CSSRadialShape.CIRCLE, CSSRadialExtent.FARTHEST_SIDE), x, y, w, h);
            strictEqual(rx, 50);
            strictEqual(ry, 50);
        });

        it('ellipse closest-side', () => {
            const [rx, ry] = calculateRadius(image(CSSRadialShape.ELLIPSE, CSSRadialExtent.CLOSEST_SIDE), x, y, w, h);
            strictEqual(rx, 50);
            strictEqual(ry, 25);
        });

        it('ellipse farthest-side', () => {
            const [rx, ry] = calculateRadius(image(CSSRadialShape.ELLIPSE, CSSRadialExtent.FARTHEST_SIDE), x, y, w, h);
            strictEqual(rx, 50);
            strictEqual(ry, 25);
        });

        it('circle closest-corner', () => {
            const [rx, ry] = calculateRadius(image(CSSRadialShape.CIRCLE, CSSRadialExtent.CLOSEST_CORNER), x, y, w, h);
            strictEqual(rx, Math.sqrt(50 * 50 + 25 * 25));
            strictEqual(ry, rx);
        });

        it('circle farthest-corner', () => {
            const [rx, ry] = calculateRadius(image(CSSRadialShape.CIRCLE, CSSRadialExtent.FARTHEST_CORNER), x, y, w, h);
            strictEqual(rx, Math.sqrt(50 * 50 + 25 * 25));
            strictEqual(ry, rx);
        });

        it('ellipse closest-corner keeps closest-side ratio', () => {
            const [rx, ry] = calculateRadius(image(CSSRadialShape.ELLIPSE, CSSRadialExtent.CLOSEST_CORNER), x, y, w, h);
            strictEqual(rx, Math.sqrt(5000));
            strictEqual(ry, rx * 0.5);
        });

        it('ellipse farthest-corner keeps farthest-side ratio', () => {
            const [rx, ry] = calculateRadius(
                image(CSSRadialShape.ELLIPSE, CSSRadialExtent.FARTHEST_CORNER),
                x,
                y,
                w,
                h
            );
            strictEqual(rx, Math.sqrt(5000));
            strictEqual(ry, rx * 0.5);
        });

        it('explicit sizes override the extent', () => {
            const [rx, ry] = calculateRadius(image(CSSRadialShape.ELLIPSE, [px(100), px(50)]), x, y, w, h);
            strictEqual(rx, 100);
            strictEqual(ry, 50);
        });

        it('single explicit size applies to both radii', () => {
            const [rx, ry] = calculateRadius(image(CSSRadialShape.CIRCLE, [px(80)]), x, y, w, h);
            strictEqual(rx, 80);
            strictEqual(ry, 80);
        });
    });

    describe('calculateGradientDirection', () => {
        it('angle 0 runs along the height', () => {
            const [lineLength, x0, x1, y0, y1] = calculateGradientDirection(0, 100, 50);
            strictEqual(lineLength, 50);
            strictEqual(x0, 50);
            strictEqual(x1, 50);
            strictEqual(y0, 50);
            strictEqual(y1, 0);
        });

        it('angle 90deg runs along the width', () => {
            const [lineLength, , , y0, y1] = calculateGradientDirection(Math.PI / 2, 100, 50);
            strictEqual(lineLength, 100);
            strictEqual(y0, 25);
            strictEqual(y1, 25);
        });

        it('corner tuples resolve through atan2', () => {
            const corner = [
                { type: TokenType.PERCENTAGE_TOKEN, number: 0, flags: FLAG_INTEGER },
                { type: TokenType.PERCENTAGE_TOKEN, number: 0, flags: FLAG_INTEGER }
            ] as never;
            const expected = (Math.atan2(25, -50) + Math.PI * 2) % (Math.PI * 2);
            const lineLength = calculateGradientDirection(corner, 100, 50)[0];
            const expectedLength = Math.abs(100 * Math.sin(expected)) + Math.abs(50 * Math.cos(expected));
            strictEqual(Math.abs(lineLength - expectedLength) < 1e-9, true);
        });
    });
});
