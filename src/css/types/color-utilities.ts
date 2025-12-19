import { Context } from '../../core/context';
import { CSSValue, isDimensionToken, isNumberToken, nonFunctionArgSeparator } from '../syntax/parser';
import { rgb2rgbLinear, rgbLinear2xyz, srgbLinear2rgb, xyz2rgbLinear } from './color-spaces/srgb';
import { TokenType } from '../syntax/tokenizer';
import { angle, deg } from './angle';
import { getAbsoluteValue, isLengthPercentage } from './length-percentage';

type Color = number;

export const isTransparent = (color: Color): boolean => (0xff & color) === 0;

export const asString = (color: Color): string => {
    const alpha = 0xff & color;
    const blue = 0xff & (color >> 8);
    const green = 0xff & (color >> 16);
    const red = 0xff & (color >> 24);
    return alpha < 255 ? `rgba(${red},${green},${blue},${alpha / 255})` : `rgb(${red},${green},${blue})`;
};

export const pack = (r: number, g: number, b: number, a: number): Color =>
    ((r << 24) | (g << 16) | (b << 8) | (Math.round(a * 255) << 0)) >>> 0;

export const getTokenColorValue = (token: CSSValue, i: number): number => {
    if (token.type === TokenType.NUMBER_TOKEN) {
        return token.number;
    }

    if (token.type === TokenType.PERCENTAGE_TOKEN) {
        const max = i === 3 ? 1 : 255;
        return i === 3 ? (token.number / 100) * max : Math.round((token.number / 100) * max);
    }

    return 0;
};

export const isRelativeTransform = (tokens: CSSValue[]): boolean =>
    (tokens[0].type === TokenType.IDENT_TOKEN ? tokens[0].value : 'unknown') === 'from';

export const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
};

export const multiplyMatrices = (A: number[], B: number[]): [number, number, number] => {
    return [
        A[0] * B[0] + A[1] * B[1] + A[2] * B[2],
        A[3] * B[0] + A[4] * B[1] + A[5] * B[2],
        A[6] * B[0] + A[7] * B[1] + A[8] * B[2]
    ];
};

export const packSrgb = (args: number[]): number => {
    return pack(
        clamp(Math.round(args[0] * 255), 0, 255),
        clamp(Math.round(args[1] * 255), 0, 255),
        clamp(Math.round(args[2] * 255), 0, 255),
        clamp(args[3], 0, 1)
    );
};

export const packSrgbLinear = ([r, g, b, a]: [number, number, number, number]): number => {
    const rgb = srgbLinear2rgb([r, g, b]);
    return pack(
        clamp(Math.round(rgb[0] * 255), 0, 255),
        clamp(Math.round(rgb[1] * 255), 0, 255),
        clamp(Math.round(rgb[2] * 255), 0, 255),
        a
    );
};

export const packXYZ = (args: number[]): number => {
    const srgb_linear = xyz2rgbLinear([args[0], args[1], args[2]]);
    return packSrgbLinear([srgb_linear[0], srgb_linear[1], srgb_linear[2], args[3]]);
};

export const packLab = (_context: Context, args: CSSValue[]): number => {
    if (isRelativeTransform(args.filter(nonFunctionArgSeparator))) {
        throw new Error('Relative color not supported for lab()');
    }
    const [l, a, b, alpha] = extractLabComponents(args),
        rgb = srgbLinear2rgb(xyz2rgbLinear(lab2xyz([l, a, b])));

    return pack(
        clamp(Math.round(rgb[0] * 255), 0, 255),
        clamp(Math.round(rgb[1] * 255), 0, 255),
        clamp(Math.round(rgb[2] * 255), 0, 255),
        alpha
    );
};

export const packOkLab = (_context: Context, args: CSSValue[]): number => {
    if (isRelativeTransform(args.filter(nonFunctionArgSeparator))) {
        throw new Error('Relative color not supported for oklab()');
    }
    const [l, a, b, alpha] = extractLabComponents(args),
        rgb = srgbLinear2rgb(xyz2rgbLinear(oklab2xyz([l, a, b])));

    return pack(
        clamp(Math.round(rgb[0] * 255), 0, 255),
        clamp(Math.round(rgb[1] * 255), 0, 255),
        clamp(Math.round(rgb[2] * 255), 0, 255),
        alpha
    );
};

export const packOkLch = (_context: Context, args: CSSValue[]): number => {
    if (isRelativeTransform(args.filter(nonFunctionArgSeparator))) {
        throw new Error('Relative color not supported for oklch()');
    }
    const [l, c, h, alpha] = extractOkLchComponents(args),
        rgb = srgbLinear2rgb(xyz2rgbLinear(oklab2xyz(lch2lab([l, c, h]))));

    return pack(
        clamp(Math.round(rgb[0] * 255), 0, 255),
        clamp(Math.round(rgb[1] * 255), 0, 255),
        clamp(Math.round(rgb[2] * 255), 0, 255),
        alpha
    );
};

export const packLch = (_context: Context, args: CSSValue[]): number => {
    if (isRelativeTransform(args.filter(nonFunctionArgSeparator))) {
        throw new Error('Relative color not supported for lch()');
    }
    const [l, c, h, a] = extractLchComponents(args),
        rgb = srgbLinear2rgb(xyz2rgbLinear(lab2xyz(lch2lab([l, c, h]))));

    return pack(
        clamp(Math.round(rgb[0] * 255), 0, 255),
        clamp(Math.round(rgb[1] * 255), 0, 255),
        clamp(Math.round(rgb[2] * 255), 0, 255),
        a
    );
};

export const extractHslComponents = (context: Context, args: CSSValue[]): [number, number, number, number] => {
    const tokens = args.filter(nonFunctionArgSeparator),
        [hue, saturation, lightness, alpha] = tokens,
        h = (hue.type === TokenType.NUMBER_TOKEN ? deg(hue.number) : angle.parse(context, hue)) / (Math.PI * 2),
        s = isLengthPercentage(saturation) ? saturation.number / 100 : 0,
        l = isLengthPercentage(lightness) ? lightness.number / 100 : 0,
        a = typeof alpha !== 'undefined' && isLengthPercentage(alpha) ? getAbsoluteValue(alpha, 1) : 1;
    return [h, s, l, a];
};

export const packHSL = (context: Context, args: CSSValue[]): number => {
    if (isRelativeTransform(args)) {
        throw new Error('Relative color not supported for hsl()');
    }
    const [h, s, l, a] = extractHslComponents(context, args),
        rgb = hsl2rgb([h, s, l]);
    return pack(rgb[0] * 255, rgb[1] * 255, rgb[2] * 255, s === 0 ? 1 : a);
};

export const extractLchComponents = (args: CSSValue[]): [number, number, number, number] => {
    const tokens = args.filter(nonFunctionArgSeparator),
        l = isLengthPercentage(tokens[0]) ? tokens[0].number : 0,
        c = isLengthPercentage(tokens[1]) ? tokens[1].number : 0,
        h = isNumberToken(tokens[2]) || isDimensionToken(tokens[2]) ? tokens[2].number : 0,
        a = typeof tokens[4] !== 'undefined' && isLengthPercentage(tokens[4]) ? getAbsoluteValue(tokens[4], 1) : 1;

    return [l, c, h, a];
};

export const extractLabComponents = (args: CSSValue[]): [number, number, number, number] => {
    const tokens = args.filter(nonFunctionArgSeparator),
        l =
            tokens[0].type === TokenType.PERCENTAGE_TOKEN
                ? tokens[0].number / 100
                : isNumberToken(tokens[0])
                  ? tokens[0].number
                  : 0,
        a =
            tokens[1].type === TokenType.PERCENTAGE_TOKEN
                ? tokens[1].number / 100
                : isNumberToken(tokens[1])
                  ? tokens[1].number
                  : 0,
        b = isNumberToken(tokens[2]) || isDimensionToken(tokens[2]) ? tokens[2].number : 0,
        alpha = typeof tokens[4] !== 'undefined' && isLengthPercentage(tokens[4]) ? getAbsoluteValue(tokens[4], 1) : 1;

    return [l, a, b, alpha];
};

export const extractOkLchComponents = (args: CSSValue[]): [number, number, number, number] => {
    const tokens = args.filter(nonFunctionArgSeparator),
        l =
            tokens[0].type === TokenType.PERCENTAGE_TOKEN
                ? tokens[0].number / 100
                : isNumberToken(tokens[0])
                  ? tokens[0].number
                  : 0,
        c =
            tokens[1].type === TokenType.PERCENTAGE_TOKEN
                ? tokens[1].number / 100
                : isNumberToken(tokens[1])
                  ? tokens[1].number
                  : 0,
        h = isNumberToken(tokens[2]) || isDimensionToken(tokens[2]) ? tokens[2].number : 0,
        a = typeof tokens[4] !== 'undefined' && isLengthPercentage(tokens[4]) ? getAbsoluteValue(tokens[4], 1) : 1;

    return [l, c, h, a];
};

/**
 * Convert D65 to D50
 *
 * @param xyz
 */
export const d65toD50 = (xyz: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        [
            1.0479297925449969, 0.022946870601609652, -0.05019226628920524, 0.02962780877005599, 0.9904344267538799,
            -0.017073799063418826, -0.009243040646204504, 0.015055191490298152, 0.7518742814281371
        ],
        xyz
    );
};

/**
 * Convert D50 to D65
 *
 * @param xyz
 */
export const d50toD65 = (xyz: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        [
            0.955473421488075, -0.02309845494876471, 0.06325924320057072, -0.0283697093338637, 1.0099953980813041,
            0.021041441191917323, 0.012314014864481998, -0.020507649298898964, 1.330365926242124
        ],
        xyz
    );
};

export const hue2rgb = (t1: number, t2: number, hue: number): number => {
    if (hue < 0) {
        hue += 1;
    }
    if (hue >= 1) {
        hue -= 1;
    }

    if (hue < 1 / 6) {
        return (t2 - t1) * hue * 6 + t1;
    } else if (hue < 1 / 2) {
        return t2;
    } else if (hue < 2 / 3) {
        return (t2 - t1) * 6 * (2 / 3 - hue) + t1;
    } else {
        return t1;
    }
};

const hsl2rgb = ([h, s, l]: [number, number, number]): [number, number, number] => {
    if (s === 0) {
        return [l * 255, l * 255, l * 255];
    }
    const t2 = l <= 0.5 ? l * (s + 1) : l + s - l * s,
        t1 = l * 2 - t2,
        r = hue2rgb(t1, t2, h + 1 / 3),
        g = hue2rgb(t1, t2, h),
        b = hue2rgb(t1, t2, h - 1 / 3);

    return [r, g, b];
};

/**
 * Convert lch to OKLab
 *
 * @param l
 * @param c
 * @param h
 */
const lch2lab = ([l, c, h]: [number, number, number]): [number, number, number] => {
    if (c < 0) {
        c = 0;
    }
    if (isNaN(h)) {
        h = 0;
    }
    return [l, c * Math.cos((h * Math.PI) / 180), c * Math.sin((h * Math.PI) / 180)];
};

/**
 * Convert OKLab to XYZ relative to D65
 *
 * @param lab
 */
const oklab2xyz = (lab: [number, number, number]): [number, number, number] => {
    const LMSg = multiplyMatrices(
            [
                1, 0.3963377773761749, 0.2158037573099136, 1, -0.1055613458156586, -0.0638541728258133, 1,
                -0.0894841775298119, -1.2914855480194092
            ],
            lab
        ),
        LMS = LMSg.map((val: number) => val ** 3);

    return multiplyMatrices(
        [
            1.2268798758459243, -0.5578149944602171, 0.2813910456659647, -0.0405757452148008, 1.112286803280317,
            -0.0717110580655164, -0.0763729366746601, -0.4214933324022432, 1.5869240198367816
        ],
        LMS
    );
};

/**
 * Convert Lab to D50-adapted XYZ
 *
 * @param lab
 */
const lab2xyz = (lab: [number, number, number]): [number, number, number] => {
    const fy = (lab[0] + 16) / 116,
        fx = lab[1] / 500 + fy,
        fz = fy - lab[2] / 200,
        k = 24389 / 27,
        e = 24 / 116,
        xyz = [
            ((fx > e ? fx ** 3 : (116 * fx - 16) / k) * 0.3457) / 0.3585,
            lab[0] > 8 ? fy ** 3 : lab[0] / k,
            ((fz > e ? fz ** 3 : (116 * fz - 16) / k) * (1.0 - 0.3457 - 0.3585)) / 0.3585
        ];

    return d50toD65([xyz[0], xyz[1], xyz[2]]);
};

/**
 * Convert RGB to XYZ
 *
 * @param _context
 * @param args
 */
export const rgbToXyz = (_context: Context, args: CSSValue[]): [number, number, number, number] => {
    const tokens = args.filter(nonFunctionArgSeparator);

    if (tokens.length === 3) {
        const [r, g, b] = tokens.map(getTokenColorValue),
            rgb_linear = rgb2rgbLinear([r / 255, g / 255, b / 255]),
            [x, y, z] = rgbLinear2xyz([rgb_linear[0], rgb_linear[1], rgb_linear[2]]);
        return [x, y, z, 1];
    }

    if (tokens.length === 4) {
        const [r, g, b, a] = tokens.map(getTokenColorValue),
            rgb_linear = rgb2rgbLinear([r / 255, g / 255, b / 255]),
            [x, y, z] = rgbLinear2xyz([rgb_linear[0], rgb_linear[1], rgb_linear[2]]);
        return [x, y, z, a];
    }

    return [0, 0, 0, 1];
};

/**
 * HSL to XYZ
 *
 * @param context
 * @param args
 */
export const hslToXyz = (context: Context, args: CSSValue[]): [number, number, number, number] => {
    const [h, s, l, a] = extractHslComponents(context, args),
        rgb_linear = rgb2rgbLinear(hsl2rgb([h, s, l])),
        [x, y, z] = rgbLinear2xyz([rgb_linear[0], rgb_linear[1], rgb_linear[2]]);

    return [x, y, z, a];
};

/**
 * LAB to XYZ
 *
 * @param _context
 * @param args
 */
export const labToXyz = (_context: Context, args: CSSValue[]): [number, number, number, number] => {
    const [l, a, b, alpha] = extractLabComponents(args),
        [x, y, z] = lab2xyz([l, a, b]);
    return [x, y, z, alpha];
};

/**
 * LCH to XYZ
 *
 * @param _context
 * @param args
 */
export const lchToXyz = (_context: Context, args: CSSValue[]): [number, number, number, number] => {
    const [l, c, h, alpha] = extractLchComponents(args),
        [x, y, z] = lab2xyz(lch2lab([l, c, h]));
    return [x, y, z, alpha];
};

/**
 * OKLch to XYZ
 *
 * @param _context
 * @param args
 */
export const oklchToXyz = (_context: Context, args: CSSValue[]): [number, number, number, number] => {
    const [l, c, h, alpha] = extractOkLchComponents(args),
        [x, y, z] = oklab2xyz(lch2lab([l, c, h]));
    return [x, y, z, alpha];
};

/**
 * OKLab to XYZ
 *
 * @param _context
 * @param args
 */
export const oklabToXyz = (_context: Context, args: CSSValue[]): [number, number, number, number] => {
    const [l, c, h, alpha] = extractLabComponents(args),
        [x, y, z] = oklab2xyz([l, c, h]);
    return [x, y, z, alpha];
};

/**
 * XYZ-50 to XYZ
 *
 * @param args
 */
export const xyz50ToXYZ = (args: number[]): [number, number, number] => {
    return d50toD65([args[0], args[1], args[2]]);
};

/**
 * Does nothing, required for SUPPORTED_COLOR_SPACES_FROM_XYZ in the _color() function
 *
 * @param args
 */
export const xyzFromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    return args;
};

/**
 * XYZ-65 to XYZ-50
 *
 * @param args
 */
export const xyz50FromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [x, y, z] = d65toD50([args[0], args[2], args[3]]);
    return [x, y, z, args[3]];
};

/**
 * Convert XYZ to SRGB and Pack
 *
 * @param args
 */
export const convertXyz = (args: number[]): number => {
    return packXYZ([args[0], args[1], args[2], args[3]]);
};

/**
 * Convert XYZ-50 to SRGB and Pack
 *
 * @param args
 */
export const convertXyz50 = (args: number[]): number => {
    const xyz = xyz50ToXYZ([args[0], args[1], args[2]]);
    return packXYZ([xyz[0], xyz[1], xyz[2], args[3]]);
};
