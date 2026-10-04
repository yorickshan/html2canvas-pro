import { describe, it, expect } from 'vitest';
import { color as colorType, parseColor } from '../color';
import { Parser } from '../../syntax/parser';
import { interpolateHue } from '../functions/color-mix';
import { Context } from '../../../core/context';
import { Html2CanvasConfig } from '../../../config';
import { Bounds } from '../../layout/bounds';

const context = new Context(
    { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
    new Bounds(0, 0, 800, 600),
    new Html2CanvasConfig({ window: window })
);

const parse = (value: string) => colorType.parse(context, Parser.parseValue(value));

const rgba = (packed: number): [number, number, number, number] => [
    0xff & (packed >> 24),
    0xff & (packed >> 16),
    0xff & (packed >> 8),
    0xff & packed
];

const expectCloseTo = (packed: number, expected: [number, number, number, number]): void => {
    const [r, g, b, a] = rgba(packed);
    expect(Math.abs(r - expected[0])).toBeLessThanOrEqual(1);
    expect(Math.abs(g - expected[1])).toBeLessThanOrEqual(1);
    expect(Math.abs(b - expected[2])).toBeLessThanOrEqual(1);
    expect(Math.abs(a - expected[3])).toBeLessThanOrEqual(1);
};

describe('color-mix()', () => {
    it('mixes two colors 50/50 in srgb', () => {
        expectCloseTo(parse('color-mix(in srgb, red, blue)'), [128, 0, 128, 255]);
    });

    it('honors a single percentage', () => {
        expectCloseTo(parse('color-mix(in srgb, red 75%, blue)'), [191, 0, 64, 255]);
    });

    it('normalizes percentages that do not sum to 100', () => {
        // 30% + 90% → normalized weights 0.25 / 0.75
        expectCloseTo(parse('color-mix(in srgb, red 30%, blue 90%)'), [64, 0, 191, 255]);
    });

    it('premultiplies by alpha', () => {
        // red with alpha 0 mixed with blue: result keeps blue channels at
        // full intensity and lands on 0.5 alpha
        expectCloseTo(parse('color-mix(in srgb, rgb(255 0 0 / 0), blue)'), [0, 0, 255, 128]);
        expectCloseTo(parse('color-mix(in srgb, red, transparent)'), [255, 0, 0, 128]);
    });

    it('mixing a color with itself returns that color in every supported space', () => {
        const spaces = ['srgb', 'srgb-linear', 'lab', 'oklab', 'lch', 'oklch', 'hsl', 'xyz', 'xyz-d50', 'xyz-d65'];
        const original = rgba(parse('mediumseagreen'));
        for (const space of spaces) {
            expectCloseTo(parse(`color-mix(in ${space}, mediumseagreen, mediumseagreen)`), original);
        }
    });

    it('produces a mid-gray for white/black mixed in oklab', () => {
        const [r, g, b, a] = rgba(parse('color-mix(in oklab, white, black)'));
        expect(r).toBe(g);
        expect(g).toBe(b);
        expect(r).toBeGreaterThan(90);
        expect(r).toBeLessThan(110);
        expect(a).toBe(255);
    });

    it('degrades unsupported forms to transparent instead of throwing', () => {
        expect(parse('color-mix(in hwb, red, blue)')).toBe(0x00000000);
        expect(parse('color-mix(in oklch longer hue, red, blue)')).not.toBeUndefined();
        expect(parse('color-mix(red, blue)')).toBe(0x00000000);
    });

    it('does not break the parse cache for repeated values', () => {
        const first = parse('color-mix(in srgb, red, blue)');
        const second = parse('color-mix(in srgb, red, blue)');
        expect(second).toBe(first);
    });

    it('matches Chromium-rasterized ground truth for lab/oklab', () => {
        // Values sampled by rasterizing the same declarations on a canvas in
        // Chromium — an end-to-end check of the lab/oklab conversion chain.
        expectCloseTo(parse('lab(50% 20 30)'), [161, 105, 69, 255]);
        expectCloseTo(parse('lab(100% 0 0)'), [255, 255, 255, 255]);
        expectCloseTo(parse('oklab(0.4 0.11 0.05)'), [124, 37, 37, 255]);
        expectCloseTo(parse('color-mix(in oklab, red, blue)'), [140, 83, 162, 255]);
    });

    it('is reachable through parseColor (option overrides)', () => {
        expectCloseTo(parseColor(context, 'color-mix(in srgb, red, blue)'), [128, 0, 128, 255]);
    });
});

describe('interpolateHue (css-color-4 §12.4)', () => {
    it('interpolates along the shorter arc by default', () => {
        expect(interpolateHue(0, 90, 0.5, 0.5)).toBeCloseTo(45, 5);
        // 350 → 10 wraps through 0
        expect(interpolateHue(350, 10, 0.5, 0.5, 'shorter')).toBeCloseTo(360, 5);
    });

    it('interpolates along the longer arc when requested', () => {
        // 350 → 10 via the long way round lands at 180
        expect(interpolateHue(350, 10, 0.5, 0.5, 'longer')).toBeCloseTo(180, 5);
    });

    it('supports increasing and decreasing directions', () => {
        expect(interpolateHue(0, 90, 0.5, 0.5, 'increasing')).toBeCloseTo(45, 5);
        expect(interpolateHue(0, 90, 0.5, 0.5, 'decreasing')).toBeCloseTo(-135, 5);
    });
});
