import { Color, TRANSPARENT_COLOR, color as colorType } from '../color';
import { Context } from '../../../core/context';
import { CSSValue, isIdentToken } from '../../syntax/parser';
import { TokenType } from '../../syntax/tokenizer';
import { at } from '../../../core/util';
import { Matrix3x3, multiplyMatrices, RGB3, RGBA4 } from '../color-math';
import {
    d50toD65,
    d65toD50,
    hsl2rgb,
    lab2xyz,
    lch2lab,
    oklab2xyz,
    packSrgb,
    packSrgbLinear,
    packXYZ
} from '../color-utilities';
import { rgbLinear2xyz, rgb2rgbLinear, srgbLinear2rgb, xyz2rgbLinear } from '../color-spaces/srgb';

/**
 * CSS Color 5 `color-mix(in <space>, <color> <percentage>?, <color> <percentage>?).
 *
 * Modern browsers resolve color-mix() at computed-value time into `color(...)` /
 * `lab()` / `oklab()` forms, which the existing color parser already handles —
 * this parser covers option overrides and engines that keep the raw function.
 *
 * Interpolation follows css-color-4 §12: coordinates are premultiplied by
 * alpha, mixed in the requested space, then un-premultiplied; polar spaces
 * (hsl, lch, oklch) interpolate the hue angle separately with the named hue
 * method (default `shorter`). Unsupported forms degrade to transparent instead
 * of throwing so a single exotic declaration cannot fail the whole capture.
 */

type SpaceName = 'srgb' | 'srgb-linear' | 'lab' | 'oklab' | 'lch' | 'oklch' | 'hsl' | 'xyz' | 'xyz-d50' | 'xyz-d65';

type HueMethod = 'shorter' | 'longer' | 'increasing' | 'decreasing';

const HUE_DEG_INDEX: Partial<Record<SpaceName, number>> = { lch: 2, oklch: 2, hsl: 0 };

// Forward matrices from color-utilities' oklab2xyz, inverted numerically so
// the round-trip stays exact even if the constants are ever updated.
const XYZ_FROM_LMS: Matrix3x3 = [
    1.2268798758459243, -0.5578149944602171, 0.2813910456659647, -0.0405757452148008, 1.112286803280317,
    -0.0717110580655164, -0.0763729366746601, -0.4214933324022432, 1.5869240198367816
];
const LMS_FROM_OKLAB: Matrix3x3 = [
    1, 0.3963377773761749, 0.2158037573099136, 1, -0.1055613458156586, -0.0638541728258133, 1, -0.0894841775298119,
    -1.2914855480194092
];

const matrix3Inverse = (m: Matrix3x3): Matrix3x3 => {
    const a = m[0],
        b = m[1],
        c = m[2],
        d = m[3],
        e = m[4],
        f = m[5],
        g = m[6],
        h = m[7],
        i = m[8];
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    return [
        (e * i - f * h) / det,
        (c * h - b * i) / det,
        (b * f - c * e) / det,
        (f * g - d * i) / det,
        (a * i - c * g) / det,
        (c * d - a * f) / det,
        (d * h - e * g) / det,
        (b * g - a * h) / det,
        (a * e - b * d) / det
    ];
};

const XYZ_TO_LMS = matrix3Inverse(XYZ_FROM_LMS);
const OKLAB_FROM_LMS = matrix3Inverse(LMS_FROM_OKLAB);

// CIE Lab constants (mirroring color-utilities' lab2xyz, which outputs D65 XYZ
// after adapting from D50).
const LAB_K = 24389 / 27;
const LAB_E = 24 / 116;
const LAB_E3 = LAB_E * LAB_E * LAB_E;
const LAB_X_SCALE = 0.3457 / 0.3585;
const LAB_Z_SCALE = (1 - 0.3457 - 0.3585) / 0.3585;

const unpackSrgb = (color: Color): RGB3 => [
    (0xff & (color >> 24)) / 255,
    (0xff & (color >> 16)) / 255,
    (0xff & (color >> 8)) / 255
];

/** Inverse of color-utilities' lab2xyz: D65 XYZ → CIE Lab (0..100 scale). */
export const xyzD65ToLab = (xyz: RGB3): RGB3 => {
    const [x50, y50, z50] = d65toD50([xyz[0], xyz[1], xyz[2]]);
    const xi = x50 / LAB_X_SCALE;
    const yi = y50;
    const zi = z50 / LAB_Z_SCALE;
    const fx = xi > LAB_E3 ? Math.cbrt(xi) : (LAB_K * xi + 16) / 116;
    const fy = yi > LAB_E3 ? Math.cbrt(yi) : (LAB_K * yi + 16) / 116;
    const fz = zi > LAB_E3 ? Math.cbrt(zi) : (LAB_K * zi + 16) / 116;
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

/** D65 XYZ → OKLab via the inverted forward matrices. */
export const xyzD65ToOklab = (xyz: RGB3): RGB3 => {
    const lms = multiplyMatrices(XYZ_TO_LMS, xyz);
    const lmsCbrt: RGB3 = [Math.cbrt(lms[0]), Math.cbrt(lms[1]), Math.cbrt(lms[2])];
    return multiplyMatrices(OKLAB_FROM_LMS, lmsCbrt);
};

/** Lab/Oklab rectangular coordinates → polar LCH (hue in degrees). */
const labToLch = (lab: RGB3): RGB3 => {
    const c = Math.hypot(lab[1], lab[2]);
    const h = (Math.atan2(lab[2], lab[1]) * 180) / Math.PI;
    return [lab[0], c, (h + 360) % 360];
};

/** Gamma sRGB (0..1) → HSL with hue in turns (0..1), matching hsl2rgb input. */
const rgbToHslTurns = (rgb: RGB3): RGB3 => {
    const r = rgb[0],
        g = rgb[1],
        b = rgb[2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) {
        return [0, 0, l];
    }
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h: number;
    if (max === r) {
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
        h = ((b - r) / d + 2) / 6;
    } else {
        h = ((r - g) / d + 4) / 6;
    }
    return [h, s, l];
};

/** Packed color → coordinates in the given space, alpha kept on a 0..1 scale. */
const toCoords = (color: Color, space: SpaceName): RGBA4 => {
    const a = (0xff & color) / 255;
    const rgb = unpackSrgb(color);
    const linear = rgb2rgbLinear(rgb);
    const xyz = rgbLinear2xyz(linear);
    let coords: RGB3;
    switch (space) {
        case 'srgb':
            coords = rgb;
            break;
        case 'srgb-linear':
            coords = linear;
            break;
        case 'xyz':
        case 'xyz-d65':
            coords = xyz;
            break;
        case 'xyz-d50':
            coords = d65toD50(xyz);
            break;
        case 'lab':
            coords = xyzD65ToLab(xyz);
            break;
        case 'oklab':
            coords = xyzD65ToOklab(xyz);
            break;
        case 'lch':
            coords = labToLch(xyzD65ToLab(xyz));
            break;
        case 'oklch':
            coords = labToLch(xyzD65ToOklab(xyz));
            break;
        case 'hsl':
            // hue stored in degrees like the other polar spaces
            coords = [rgbToHslTurns(rgb)[0] * 360, rgbToHslTurns(rgb)[1], rgbToHslTurns(rgb)[2]];
            break;
    }
    return [coords[0], coords[1], coords[2], a];
};

/** Coordinates in the given space → packed color. */
const fromCoords = (coords: RGBA4, space: SpaceName): Color => {
    const c0 = coords[0],
        c1 = coords[1],
        c2 = coords[2],
        a = coords[3];
    switch (space) {
        case 'srgb':
            return packSrgb([c0, c1, c2, a]);
        case 'srgb-linear':
            return packSrgbLinear([c0, c1, c2, a]);
        case 'xyz':
        case 'xyz-d65':
            return packXYZ([c0, c1, c2, a]);
        case 'xyz-d50':
            return packXYZ([...d50toD65([c0, c1, c2]), a]);
        case 'lab':
            return packViaXyz(lab2xyz([c0, c1, c2]), a);
        case 'oklab':
            return packViaXyz(oklab2xyz([c0, c1, c2]), a);
        case 'lch':
            return packViaXyz(lab2xyz(lch2lab([c0, c1, c2])), a);
        case 'oklch':
            return packViaXyz(oklab2xyz(lch2lab([c0, c1, c2])), a);
        case 'hsl': {
            const rgb = hsl2rgb([c0 / 360, c1, c2]);
            return packSrgb([rgb[0], rgb[1], rgb[2], a]);
        }
    }
};

const packViaXyz = (xyz: RGB3, a: number): Color => {
    const rgb = srgbLinear2rgb(xyz2rgbLinear(xyz));
    return packSrgb([rgb[0], rgb[1], rgb[2], a]);
};

/**
 * Interpolate a hue angle in degrees per css-color-4 §12.4. `weight1` and
 * `weight2` are the (normalized) mix weights; the hue travels from h1 towards
 * h2 by the shared fraction. Exported for unit tests.
 */
export const interpolateHue = (
    h1: number,
    h2: number,
    weight1: number,
    weight2: number,
    method: HueMethod = 'shorter'
): number => {
    const wSum = weight1 + weight2;
    if (wSum === 0) {
        return h1;
    }
    let d = (((h2 - h1) % 360) + 360) % 360;
    switch (method) {
        case 'shorter':
            if (d > 180) d -= 360;
            break;
        case 'longer':
            if (d < 180) d -= 360;
            break;
        case 'increasing':
            break;
        case 'decreasing':
            if (d > 0) d -= 360;
            break;
    }
    return h1 + d * (weight2 / wSum);
};

type MixComponent = { color: Color; percentage: number | null };

const parseMixComponent = (context: Context, tokens: CSSValue[]): MixComponent => {
    let colorToken: CSSValue | undefined;
    let percentage: number | null = null;
    for (const token of tokens) {
        if (token.type === TokenType.WHITESPACE_TOKEN || token.type === TokenType.COMMA_TOKEN) {
            continue;
        }
        if (token.type === TokenType.PERCENTAGE_TOKEN) {
            percentage = token.number;
        } else if (isIdentToken(token) && token.value === 'none') {
            // `none` behaves as 0% for the percentage component per spec
            if (percentage === null) percentage = 0;
        } else if (colorToken === undefined) {
            colorToken = token;
        } else {
            throw new Error(`Unexpected token in color-mix() component`);
        }
    }
    if (colorToken === undefined) {
        throw new Error('color-mix() component is missing a color');
    }
    const token: CSSValue = colorToken;
    return { color: colorType.parse(context, token), percentage };
};

const SUPPORTED_SPACES: SpaceName[] = [
    'srgb',
    'srgb-linear',
    'lab',
    'oklab',
    'lch',
    'oklch',
    'hsl',
    'xyz',
    'xyz-d50',
    'xyz-d65'
];

const mixCoords = (
    c1: ReturnType<typeof toCoords>,
    c2: ReturnType<typeof toCoords>,
    w1: number,
    w2: number,
    space: SpaceName,
    hueMethod: HueMethod
): ReturnType<typeof toCoords> => {
    const hueIdx = HUE_DEG_INDEX[space];
    // Hue is not premultiplied; every other coordinate is (css-color-4 §12.3).
    const p1: RGBA4 = [c1[0] * c1[3], c1[1] * c1[3], c1[2] * c1[3], c1[3]];
    const p2: RGBA4 = [c2[0] * c2[3], c2[1] * c2[3], c2[2] * c2[3], c2[3]];
    const alpha = w1 * p1[3] + w2 * p2[3];
    if (alpha <= 0) {
        return [0, 0, 0, 0];
    }
    const out: RGBA4 = [0, 0, 0, alpha];
    for (let i = 0; i < 3; i++) {
        if (i === hueIdx) {
            continue;
        }
        out[i] = (w1 * at(p1, i) + w2 * at(p2, i)) / alpha;
    }
    if (hueIdx !== undefined) {
        let h1 = at(c1, hueIdx);
        let h2 = at(c2, hueIdx);
        // A powerless (zero-chroma/saturation) hue takes the other's hue.
        // For hsl the polar partner is saturation (index 1); for lch/oklch
        // it is chroma (index 1 as well).
        if (c1[1] === 0) h1 = h2;
        if (c2[1] === 0) h2 = h1;
        out[hueIdx] = interpolateHue(h1, h2, w1, w2, hueMethod);
    }
    return out;
};

const computeColorMix = (context: Context, args: CSSValue[]): Color => {
    const groups: CSSValue[][] = [[]];
    for (const token of args) {
        if (token.type === TokenType.COMMA_TOKEN) {
            groups.push([]);
        } else {
            groups[groups.length - 1]!.push(token);
        }
    }
    const meaningful = groups.map((group) => group.filter((t) => t.type !== TokenType.WHITESPACE_TOKEN));
    if (meaningful.length !== 3) {
        throw new Error('color-mix() requires exactly two color components');
    }

    const header = meaningful[0];
    const inKeyword = header ? header[0] : undefined;
    const hasInKeyword = inKeyword !== undefined && isIdentToken(inKeyword) && inKeyword.value === 'in';
    if (!header || header.length < 2 || !hasInKeyword) {
        throw new Error('color-mix() requires an interpolation space after `in`');
    }
    const spaceIdent = header[1];
    if (!spaceIdent || !isIdentToken(spaceIdent)) {
        throw new Error('color-mix() space must be an identifier');
    }
    const space = spaceIdent.value as SpaceName;
    if (SUPPORTED_SPACES.indexOf(space) === -1) {
        throw new Error(`Unsupported color-mix() interpolation space "${space}"`);
    }

    let hueMethod: HueMethod = 'shorter';
    const rest = header.slice(2);
    if (rest.length > 0) {
        const method = rest[0];
        const hueKeyword = rest[1];
        if (
            !method ||
            !hueKeyword ||
            !isIdentToken(method) ||
            !isIdentToken(hueKeyword) ||
            hueKeyword.value !== 'hue'
        ) {
            throw new Error('Unsupported color-mix() hue method syntax');
        }
        if (['shorter', 'longer', 'increasing', 'decreasing'].indexOf(method.value) === -1) {
            throw new Error(`Unsupported color-mix() hue method "${method.value}"`);
        }
        hueMethod = method.value as HueMethod;
    }

    const group1 = meaningful[1];
    const group2 = meaningful[2];
    if (!group1 || !group2) {
        throw new Error('color-mix() requires exactly two color components');
    }
    const component1 = parseMixComponent(context, group1);
    const component2 = parseMixComponent(context, group2);

    let p1 = component1.percentage;
    let p2 = component2.percentage;
    if (p1 === null && p2 === null) {
        p1 = 50;
        p2 = 50;
    } else if (p1 === null) {
        p1 = 100 - (p2 ?? 0);
    } else if (p2 === null) {
        p2 = 100 - p1;
    } else {
        const sum = p1 + p2;
        if (sum > 0) {
            p1 = (p1 / sum) * 100;
            p2 = (p2 / sum) * 100;
        }
    }
    const weight1 = (p1 ?? 0) / 100;
    const weight2 = (p2 ?? 0) / 100;

    const mixed = mixCoords(
        toCoords(component1.color, space),
        toCoords(component2.color, space),
        weight1,
        weight2,
        space,
        hueMethod
    );
    return fromCoords(mixed, space);
};

export const colorMix = (context: Context, args: CSSValue[]): Color => {
    try {
        return computeColorMix(context, args);
    } catch (e) {
        // Unsupported form: degrade to transparent (the spec's "invalid at
        // computed-value time" behavior) instead of failing the capture.
        context.logger.warn(`Unsupported color-mix() value: ${e instanceof Error ? e.message : e}`);
        return TRANSPARENT_COLOR;
    }
};
