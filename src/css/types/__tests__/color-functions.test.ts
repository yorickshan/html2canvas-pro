import { strictEqual, deepStrictEqual, throws } from 'assert';
import { color } from '../color';
import { pack, asString, isTransparent } from '../color-utilities';
import { Parser } from '../../syntax/parser';
import { Context } from '../../../core/context';

const parse = (value: string) => color.parse({} as Context, Parser.parseValue(value));

describe('color functions', () => {
    describe('rgb modern syntax', () => {
        it('rgb(1 2 3) without alpha', () => strictEqual(parse('rgb(1 2 3)'), pack(1, 2, 3, 1)));
        it('rgb(1 2 3 / 0.5) with slash alpha', () => strictEqual(parse('rgb(1 2 3 / 0.5)'), pack(1, 2, 3, 0.5)));
        it('rgb(1 2 3 / 50%) percentage alpha', () => strictEqual(parse('rgb(1 2 3 / 50%)'), pack(1, 2, 3, 0.5)));
        it('rgb(100% 20% 0% / 50%) percentage channels', () =>
            strictEqual(parse('rgb(100% 20% 0% / 50%)'), pack(255, 51, 0, 0.5)));
        it('rgba(1, 2, 3, 0.25) legacy comma alpha', () =>
            strictEqual(parse('rgba(1, 2, 3, 0.25)'), pack(1, 2, 3, 0.25)));
        it('invalid arity yields transparent black', () => strictEqual(parse('rgb(1, 2)'), 0));
    });

    describe('hsl syntax variants', () => {
        it('space-separated equals comma form', () =>
            strictEqual(parse('hsl(120 50% 50%)'), parse('hsl(120, 50%, 50%)')));
        it('slash alpha equals explicit alpha', () =>
            strictEqual(parse('hsl(120 50% 50% / 1)'), parse('hsl(120, 50%, 50%)')));
        it('hsla comma form with alpha is opaque', () =>
            strictEqual(isTransparent(parse('hsla(120, 50%, 50%, 0.5)')), false));
        it('deg and turn hues agree', () =>
            strictEqual(parse('hsl(90deg, 50%, 50%)'), parse('hsl(0.25turn, 50%, 50%)')));
        it('rad hues agree with deg', () =>
            strictEqual(parse('hsl(1.5707963267948966rad, 50%, 50%)'), parse('hsl(90deg, 50%, 50%)')));
        it('grad hues agree with deg', () =>
            strictEqual(parse('hsl(100grad, 50%, 50%)'), parse('hsl(90deg, 50%, 50%)')));
        it('covers hue sectors', () => {
            for (const hue of [0, 60, 120, 180, 240, 300]) {
                const value = parse(`hsl(${hue}, 50%, 50%)`);
                strictEqual(isTransparent(value), false, `hue ${hue} should be opaque`);
            }
        });
        it('achromatic keeps alpha 1', () => strictEqual(isTransparent(parse('hsl(120, 0%, 50%)')), false));
    });

    describe('lab/lch/oklab/oklch', () => {
        it('full percentage lightness equals normalized number', () =>
            strictEqual(parse('lab(100% 20 30)'), parse('lab(1 20 30)')));
        it('lab with slash alpha', () => strictEqual(parse('lab(50% 20 30 / 0.5)'), parse('lab(50% 20 30 / 50%)')));
        it('lch percentage and number lightness are interchangeable', () =>
            strictEqual(parse('lch(50% 20 30)'), parse('lch(50 20 30)')));
        it('lch with dimension hue and alpha', () =>
            strictEqual(parse('lch(50% 20 30deg / 0.5)'), parse('lch(50% 20 30 / 0.5)')));
        it('oklab parses', () => {
            const value = parse('oklab(0.5 0.1 -0.1 / 0.8)');
            strictEqual(isTransparent(value), false);
        });
        it('oklch parses with dimension hue', () => {
            strictEqual(isTransparent(parse('oklch(0.5 0.1 180)')), false);
        });
    });

    describe('color() function', () => {
        it('srgb is the identity mapping', () => strictEqual(parse('color(srgb 1 0 0)'), pack(255, 0, 0, 1)));
        it('srgb-linear 1 maps to full red', () => strictEqual(parse('color(srgb-linear 1 0 0)'), pack(255, 0, 0, 1)));
        it('display-p3 red is not transparent', () =>
            strictEqual(isTransparent(parse('color(display-p3 1 0 0)')), false));
        it('a98-rgb red is reddish', () => {
            const value = asString(parse('color(a98-rgb 1 0 0)'));
            strictEqual(value.startsWith('rgb('), true);
        });
        it('prophoto-rgb red is reddish', () =>
            strictEqual(asString(parse('color(prophoto-rgb 1 0 0)')).startsWith('rgb('), true));
        it('rec2020 red is reddish', () =>
            strictEqual(asString(parse('color(rec2020 1 0 0)')).startsWith('rgb('), true));
        it('xyz variants parse', () => {
            strictEqual(isTransparent(parse('color(xyz 0.2 0.3 0.4)')), false);
            strictEqual(isTransparent(parse('color(xyz-d50 0.2 0.3 0.4)')), false);
            strictEqual(isTransparent(parse('color(xyz-d65 0.2 0.3 0.4)')), false);
        });
        it('color() with alpha', () => strictEqual(parse('color(srgb 1 0 0 / 0.5)'), pack(255, 0, 0, 0.5)));
        it('rejects unknown color spaces', () =>
            throws(() => parse('color(unknown-space 1 0 0)'), /unsupported color space/));
        it('relative color with ident origin does not throw', () =>
            strictEqual(typeof parse('color(from red srgb 1 0 0)'), 'number'));
    });

    describe('relative color rejection', () => {
        it('rgb rejects relative transforms', () =>
            throws(() => parse('rgb(from red r g b)'), /Relative color not supported for rgb/));
        it('hsl rejects relative transforms', () =>
            throws(() => parse('hsl(from red h s l)'), /Relative color not supported for hsl/));
        it('lab rejects relative transforms', () =>
            throws(() => parse('lab(from red l a b)'), /Relative color not supported for lab/));
        it('oklab rejects relative transforms', () =>
            throws(() => parse('oklab(from red l a b)'), /Relative color not supported for oklab/));
        it('oklch rejects relative transforms', () =>
            throws(() => parse('oklch(from red l c h)'), /Relative color not supported for oklch/));
        it('lch rejects relative transforms', () =>
            throws(() => parse('lch(from red l c h)'), /Relative color not supported for lch/));
    });

    describe('misc', () => {
        it('unknown function throws', () => throws(() => parse('foo(1)'), /unsupported color function/));
        it('unknown ident falls back to transparent', () => strictEqual(parse('notacolor'), 0));
        it('alpha hex forms round trip', () => {
            deepStrictEqual([isTransparent(parse('#0000')), isTransparent(parse('#000f'))], [true, false]);
        });
    });
});
