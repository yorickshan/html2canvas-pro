import {
    CSSValue,
    isDimensionToken,
    isIdentToken,
    isNumberToken,
    nonFunctionArgSeparator,
    Parser
} from '../syntax/parser';
import {HashToken, TokenType} from '../syntax/tokenizer';
import {ITypeDescriptor} from '../ITypeDescriptor';
import {angle, deg} from './angle';
import {getAbsoluteValue, isLengthPercentage} from './length-percentage';
import {Context} from '../../core/context';

export type Color = number;

export const color: ITypeDescriptor<Color> = {
    name: 'color',
    parse: (context: Context, value: CSSValue): Color => {
        if (value.type === TokenType.FUNCTION) {
            const colorFunction = SUPPORTED_COLOR_FUNCTIONS[value.name];
            if (typeof colorFunction === 'undefined') {
                throw new Error(`Attempting to parse an unsupported color function "${value.name}"`);
            }
            return colorFunction(context, value.values);
        }

        if (value.type === TokenType.HASH_TOKEN) {
            const [r, g, b, a] = hash2rgb(value);
            return pack(r, g, b, a);
        }

        if (value.type === TokenType.IDENT_TOKEN) {
            const namedColor = COLORS[value.value.toUpperCase()];
            if (typeof namedColor !== 'undefined') {
                return namedColor;
            }
        }

        return COLORS.TRANSPARENT;
    }
};

const hash2rgb = (token: HashToken): [number, number, number, number] => {
    if (token.value.length === 3) {
        const r = token.value.substring(0, 1);
        const g = token.value.substring(1, 2);
        const b = token.value.substring(2, 3);
        return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16), 1];
    }

    if (token.value.length === 4) {
        const r = token.value.substring(0, 1);
        const g = token.value.substring(1, 2);
        const b = token.value.substring(2, 3);
        const a = token.value.substring(3, 4);
        return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16), parseInt(a + a, 16) / 255];
    }

    if (token.value.length === 6) {
        const r = token.value.substring(0, 2);
        const g = token.value.substring(2, 4);
        const b = token.value.substring(4, 6);
        return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16), 1];
    }

    if (token.value.length === 8) {
        const r = token.value.substring(0, 2);
        const g = token.value.substring(2, 4);
        const b = token.value.substring(4, 6);
        const a = token.value.substring(6, 8);
        return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16), parseInt(a, 16) / 255];
    }

    return [0, 0, 0, 1];
};

export const isTransparent = (color: Color): boolean => (0xff & color) === 0;

export const asString = (color: Color): string => {
    const alpha = 0xff & color;
    const blue = 0xff & (color >> 8);
    const green = 0xff & (color >> 16);
    const red = 0xff & (color >> 24);
    return alpha < 255 ? `rgba(${red},${green},${blue},${alpha / 255})` : `rgb(${red},${green},${blue})`;
};

export const isRelativeTransform = (tokens: CSSValue[]): boolean =>
    (tokens[0].type === TokenType.IDENT_TOKEN ? tokens[0].value : 'unknown') === 'from';

export const pack = (r: number, g: number, b: number, a: number): Color =>
    ((r << 24) | (g << 16) | (b << 8) | (Math.round(a * 255) << 0)) >>> 0;

const packSrgb = (args: number[]) => {
    return pack(
        clamp(Math.round(args[0] * 255), 0, 255),
        clamp(Math.round(args[1] * 255), 0, 255),
        clamp(Math.round(args[2] * 255), 0, 255),
        clamp(args[3], 0, 1)
    );
};

const packSrgbLinear = ([r, g, b, a]: [number, number, number, number]) => {
    const rgb = _srgbLinear2rgb([r, g, b]);
    return pack(
        clamp(Math.round(rgb[0] * 255), 0, 255),
        clamp(Math.round(rgb[1] * 255), 0, 255),
        clamp(Math.round(rgb[2] * 255), 0, 255),
        a
    );
};

const packXYZ = (args: number[]) => {
    const srgb_linear = _xyz2rgbLinear([args[0], args[1], args[2]]);
    return packSrgbLinear([srgb_linear[0], srgb_linear[1], srgb_linear[2], args[3]]);
};

const getTokenColorValue = (token: CSSValue, i: number): number => {
    if (token.type === TokenType.NUMBER_TOKEN) {
        return token.number;
    }

    if (token.type === TokenType.PERCENTAGE_TOKEN) {
        const max = i === 3 ? 1 : 255;
        return i === 3 ? (token.number / 100) * max : Math.round((token.number / 100) * max);
    }

    return 0;
};

const rgb = (_context: Context, args: CSSValue[]): number => {
    const tokens = args.filter(nonFunctionArgSeparator);

    if (isRelativeTransform(tokens)) {
        throw new Error('Relative color not supported for rgb()');
    }

    if (tokens.length === 3) {
        const [r, g, b] = tokens.map(getTokenColorValue);
        return pack(r, g, b, 1);
    }

    if (tokens.length === 4) {
        const [r, g, b, a] = tokens.map(getTokenColorValue);
        return pack(r, g, b, a);
    }

    return 0;
};

function hue2rgb(t1: number, t2: number, hue: number): number {
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
}

const _hsl2rgb = ([h, s, l]: [number, number, number]): [number, number, number] => {
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

const _extractHslComponents = (context: Context, args: CSSValue[]): [number, number, number, number] => {
    const tokens = args.filter(nonFunctionArgSeparator),
        [hue, saturation, lightness, alpha] = tokens,
        h = (hue.type === TokenType.NUMBER_TOKEN ? deg(hue.number) : angle.parse(context, hue)) / (Math.PI * 2),
        s = isLengthPercentage(saturation) ? saturation.number / 100 : 0,
        l = isLengthPercentage(lightness) ? lightness.number / 100 : 0,
        a = typeof alpha !== 'undefined' && isLengthPercentage(alpha) ? getAbsoluteValue(alpha, 1) : 1;
    return [h, s, l, a];
};

const packHSL = (context: Context, args: CSSValue[]) => {
    if (isRelativeTransform(args)) {
        throw new Error('Relative color not supported for hsl()');
    }
    const [h, s, l, a] = _extractHslComponents(context, args),
        rgb = _hsl2rgb([h, s, l]);
    return pack(rgb[0] * 255, rgb[1] * 255, rgb[2] * 255, s === 0 ? 1 : a);
};

const _extractLchComponents = (args: CSSValue[]): [number, number, number, number] => {
    const tokens = args.filter(nonFunctionArgSeparator),
        l = isLengthPercentage(tokens[0]) ? tokens[0].number : 0,
        c = isLengthPercentage(tokens[1]) ? tokens[1].number : 0,
        h = isNumberToken(tokens[2]) || isDimensionToken(tokens[2]) ? tokens[2].number : 0,
        a = typeof tokens[4] !== 'undefined' && isLengthPercentage(tokens[4]) ? getAbsoluteValue(tokens[4], 1) : 1;

    return [l, c, h, a];
};

const packLch = (_context: Context, args: CSSValue[]) => {
    if (isRelativeTransform(args.filter(nonFunctionArgSeparator))) {
        throw new Error('Relative color not supported for lch()');
    }
    const [l, c, h, a] = _extractLchComponents(args),
        rgb = _srgbLinear2rgb(_xyz2rgbLinear(_lab2xyz(_lch2lab([l, c, h]))));

    return pack(
        clamp(Math.round(rgb[0] * 255), 0, 255),
        clamp(Math.round(rgb[1] * 255), 0, 255),
        clamp(Math.round(rgb[2] * 255), 0, 255),
        a
    );
};

const _extractLabComponents = (args: CSSValue[]): [number, number, number, number] => {
    const tokens = args.filter(nonFunctionArgSeparator),
        // eslint-disable-next-line prettier/prettier
        l = tokens[0].type === TokenType.PERCENTAGE_TOKEN ? tokens[0].number / 100 : (isNumberToken(tokens[0]) ? tokens[0].number : 0),
        // eslint-disable-next-line prettier/prettier
        a = tokens[1].type === TokenType.PERCENTAGE_TOKEN ? tokens[1].number / 100 : (isNumberToken(tokens[1]) ? tokens[1].number : 0),
        b = isNumberToken(tokens[2]) || isDimensionToken(tokens[2]) ? tokens[2].number : 0,
        alpha = typeof tokens[4] !== 'undefined' && isLengthPercentage(tokens[4]) ? getAbsoluteValue(tokens[4], 1) : 1;

    return [l, a, b, alpha];
};

const packLab = (_context: Context, args: CSSValue[]) => {
    if (isRelativeTransform(args.filter(nonFunctionArgSeparator))) {
        throw new Error('Relative color not supported for lab()');
    }
    const [l, a, b, alpha] = _extractLabComponents(args),
        rgb = _srgbLinear2rgb(_xyz2rgbLinear(_lab2xyz([l, a, b])));

    return pack(
        clamp(Math.round(rgb[0] * 255), 0, 255),
        clamp(Math.round(rgb[1] * 255), 0, 255),
        clamp(Math.round(rgb[2] * 255), 0, 255),
        alpha
    );
};

const packOkLab = (_context: Context, args: CSSValue[]) => {
    if (isRelativeTransform(args.filter(nonFunctionArgSeparator))) {
        throw new Error('Relative color not supported for oklab()');
    }
    const [l, a, b, alpha] = _extractLabComponents(args),
        rgb = _srgbLinear2rgb(_xyz2rgbLinear(_oklab2xyz([l, a, b])));

    return pack(
        clamp(Math.round(rgb[0] * 255), 0, 255),
        clamp(Math.round(rgb[1] * 255), 0, 255),
        clamp(Math.round(rgb[2] * 255), 0, 255),
        alpha
    );
};

const _extractOkLchComponents = (args: CSSValue[]): [number, number, number, number] => {
    const tokens = args.filter(nonFunctionArgSeparator),
        // eslint-disable-next-line prettier/prettier
        l = tokens[0].type === TokenType.PERCENTAGE_TOKEN ? tokens[0].number / 100 : isNumberToken(tokens[0]) ? tokens[0].number : 0,
        // eslint-disable-next-line prettier/prettier
        c = tokens[1].type === TokenType.PERCENTAGE_TOKEN ? tokens[1].number / 100 : isNumberToken(tokens[1]) ? tokens[1].number : 0,
        h = isNumberToken(tokens[2]) || isDimensionToken(tokens[2]) ? tokens[2].number : 0,
        a = typeof tokens[4] !== 'undefined' && isLengthPercentage(tokens[4]) ? getAbsoluteValue(tokens[4], 1) : 1;

    return [l, c, h, a];
};

const packOkLch = (_context: Context, args: CSSValue[]) => {
    if (isRelativeTransform(args.filter(nonFunctionArgSeparator))) {
        throw new Error('Relative color not supported for oklch()');
    }
    const [l, c, h, alpha] = _extractOkLchComponents(args),
        rgb = _srgbLinear2rgb(_xyz2rgbLinear(_oklab2xyz(_lch2lab([l, c, h]))));

    return pack(
        clamp(Math.round(rgb[0] * 255), 0, 255),
        clamp(Math.round(rgb[1] * 255), 0, 255),
        clamp(Math.round(rgb[2] * 255), 0, 255),
        alpha
    );
};

const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
};

const multiplyMatrices = (A: number[], B: number[]): [number, number, number] => {
    return [
        A[0] * B[0] + A[1] * B[1] + A[2] * B[2],
        A[3] * B[0] + A[4] * B[1] + A[5] * B[2],
        A[6] * B[0] + A[7] * B[1] + A[8] * B[2]
    ];
};

/**
 * Convert oklch to OKLab
 *
 * @param l
 * @param c
 * @param h
 */
const _lch2lab = ([l, c, h]: [number, number, number]): [number, number, number] => {
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
const _oklab2xyz = (lab: [number, number, number]) => {
    const LMSg = multiplyMatrices(
            [
                // eslint-disable-next-line prettier/prettier
                1, 0.3963377773761749, 0.2158037573099136,
                // eslint-disable-next-line prettier/prettier
                1, -0.1055613458156586, -0.0638541728258133,
                // eslint-disable-next-line prettier/prettier
                1, -0.0894841775298119, -1.2914855480194092
            ],
            lab
        ),
        LMS = LMSg.map((val: number) => val ** 3);

    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            1.2268798758459243, -0.5578149944602171, 0.2813910456659647,
            // eslint-disable-next-line prettier/prettier
            -0.0405757452148008, 1.112286803280317, -0.0717110580655164,
            // eslint-disable-next-line prettier/prettier
            -0.0763729366746601, -0.4214933324022432, 1.5869240198367816
        ],
        LMS
    );
};

/**
 * Convert Lab to D50-adapted XYZ
 *
 * @param lab
 */
const _lab2xyz = (lab: [number, number, number]): [number, number, number] => {
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

    return _d50toD65([xyz[0], xyz[1], xyz[2]]);
};

/**
 * Convert D65 to D50
 *
 * @param xyz
 */
const _d65toD50 = (xyz: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            1.0479297925449969, 0.022946870601609652, -0.05019226628920524,
            // eslint-disable-next-line prettier/prettier
            0.02962780877005599, 0.9904344267538799, -0.017073799063418826,
            // eslint-disable-next-line prettier/prettier
            -0.009243040646204504, 0.015055191490298152, 0.7518742814281371
        ],
        xyz
    );
};

/**
 * Convert D50 to D65
 *
 * @param xyz
 */
const _d50toD65 = (xyz: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            0.955473421488075, -0.02309845494876471, 0.06325924320057072,
            // eslint-disable-next-line prettier/prettier
            -0.0283697093338637, 1.0099953980813041, 0.021041441191917323,
            // eslint-disable-next-line prettier/prettier
            0.012314014864481998, -0.020507649298898964, 1.330365926242124
        ],
        xyz
    );
};

/**
 * SRGB related functions
 */

/**
 * Convert XYZ to linear-light sRGB
 *
 * @param xyz
 */
const _xyz2rgbLinear = (xyz: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            3.2409699419045226, -1.537383177570094, -0.4986107602930034,
            // eslint-disable-next-line prettier/prettier
            -0.9692436362808796, 1.8759675015077202, 0.04155505740717559,
            // eslint-disable-next-line prettier/prettier
            0.05563007969699366, -0.20397695888897652, 1.0569715142428786
        ],
        xyz
    );
};

/**
 * Convert XYZ to linear-light sRGB
 *
 * @param xyz
 */
const _rgbLinear2xyz = (xyz: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            0.41239079926595934, 0.357584339383878, 0.1804807884018343,
            // eslint-disable-next-line prettier/prettier
            0.21263900587151027, 0.715168678767756, 0.07219231536073371,
            // eslint-disable-next-line prettier/prettier
            0.01933081871559182, 0.11919477979462598, 0.9505321522496607
        ],
        xyz
    );
};

/**
 * Convert sRGB to RGB
 *
 * @param rgb
 */
const _srgbLinear2rgb = (rgb: [number, number, number]) => {
    return rgb.map((c: number) => {
        const sign = c < 0 ? -1 : 1,
            abs = Math.abs(c);
        // eslint-disable-next-line prettier/prettier
        return abs > 0.0031308 ? sign * (1.055 * (abs ** (1 / 2.4)) - 0.055) : (12.92 * c);
    });
};

/**
 * Convert RGB to sRGB
 *
 * @param rgb
 */
const _rgb2rgbLinear = (rgb: [number, number, number]) => {
    return rgb.map((c: number) => {
        const sign = c < 0 ? -1 : 1,
            abs = Math.abs(c);
        // eslint-disable-next-line prettier/prettier
        return abs <= 0.04045 ? c / 12.92 : sign * (((abs + 0.055) / 1.055) ** 2.4);
    });
};

/**
 * XYZ to SRGB
 *
 * @param args
 */
const _srgbFromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [r, g, b] = _srgbLinear2rgb(_xyz2rgbLinear([args[0], args[1], args[2]]));
    return [r, g, b, args[3]];
};

/**
 * XYZ to SRGB-Linear
 * @param args
 */
const _srgbLinearFromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [r, g, b] = _xyz2rgbLinear([args[0], args[1], args[2]]);
    return [
        clamp(Math.round(r * 255), 0, 255),
        clamp(Math.round(g * 255), 0, 255),
        clamp(Math.round(b * 255), 0, 255),
        args[3]
    ];
};

/**
 * XYZ 50/65 related functions
 */

const _rgbToXyz = (_context: Context, args: CSSValue[]): [number, number, number, number] => {
    const tokens = args.filter(nonFunctionArgSeparator);

    if (tokens.length === 3) {
        const [r, g, b] = tokens.map(getTokenColorValue),
            rgb_linear = _rgb2rgbLinear([r / 255, g / 255, b / 255]),
            [x, y, z] = _rgbLinear2xyz([rgb_linear[0], rgb_linear[1], rgb_linear[2]]);
        return [x, y, z, 1];
    }

    if (tokens.length === 4) {
        const [r, g, b, a] = tokens.map(getTokenColorValue),
            rgb_linear = _rgb2rgbLinear([r / 255, g / 255, b / 255]),
            [x, y, z] = _rgbLinear2xyz([rgb_linear[0], rgb_linear[1], rgb_linear[2]]);
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
const _hslToXyz = (context: Context, args: CSSValue[]): [number, number, number, number] => {
    const [h, s, l, a] = _extractHslComponents(context, args),
        rgb_linear = _rgb2rgbLinear(_hsl2rgb([h, s, l])),
        [x, y, z] = _rgbLinear2xyz([rgb_linear[0], rgb_linear[1], rgb_linear[2]]);

    return [x, y, z, a];
};

/**
 * LAB to XYZ
 *
 * @param _context
 * @param args
 */
const _labToXyz = (_context: Context, args: CSSValue[]): [number, number, number, number] => {
    const [l, a, b, alpha] = _extractLabComponents(args),
        [x, y, z] = _lab2xyz([l, a, b]);
    return [x, y, z, alpha];
};

/**
 * LCH to XYZ
 *
 * @param _context
 * @param args
 */
const _lchToXyz = (_context: Context, args: CSSValue[]): [number, number, number, number] => {
    const [l, c, h, alpha] = _extractLchComponents(args),
        [x, y, z] = _lab2xyz(_lch2lab([l, c, h]));
    return [x, y, z, alpha];
};

/**
 * OKLch to XYZ
 *
 * @param _context
 * @param args
 */
const _oklchToXyz = (_context: Context, args: CSSValue[]): [number, number, number, number] => {
    const [l, c, h, alpha] = _extractOkLchComponents(args),
        [x, y, z] = _oklab2xyz(_lch2lab([l, c, h]));
    return [x, y, z, alpha];
};

/**
 * OKLab to XYZ
 *
 * @param _context
 * @param args
 */
const _oklabToXyz = (_context: Context, args: CSSValue[]): [number, number, number, number] => {
    const [l, c, h, alpha] = _extractLabComponents(args),
        [x, y, z] = _oklab2xyz([l, c, h]);
    return [x, y, z, alpha];
};

/**
 * XYZ-50 to XYZ
 *
 * @param args
 */
const _xyz50ToXYZ = (args: number[]) => {
    return _d50toD65([args[0], args[1], args[2]]);
};

/**
 * Does nothing, required for SUPPORTED_COLOR_SPACES_FROM_XYZ in the _color() function
 *
 * @param args
 */
const _xyzFromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    return args;
};

/**
 * XYZ-65 to XYZ-50
 *
 * @param args
 */
const _xyz50FromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [x, y, z] = _d65toD50([args[0], args[2], args[3]]);
    return [x, y, z, args[3]];
};

/**
 * Convert XYZ to SRGB and Pack
 *
 * @param args
 */
const _convertXyz = (args: number[]) => {
    return packXYZ([args[0], args[1], args[2], args[3]]);
};

/**
 * Convert XYZ-50 to SRGB and Pack
 *
 * @param args
 */
const _convertXyz50 = (args: number[]) => {
    const xyz = _xyz50ToXYZ([args[0], args[1], args[2]]);
    return packXYZ([xyz[0], xyz[1], xyz[2], args[3]]);
};

/**
 * P3 related functions
 */

/**
 * Convert P3 Linear to xyz
 *
 * @param p3l
 */
const _p3LinearToXyz = (p3l: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            0.4865709486482162, 0.26566769316909306, 0.1982172852343625,
            // eslint-disable-next-line prettier/prettier
            0.2289745640697488, 0.6917385218365064, 0.079286914093745,
            // eslint-disable-next-line prettier/prettier
            0.0000000000000000, 0.04511338185890264, 1.043944368900976
        ],
        p3l
    );
};
/**
 * Convert XYZ to P3 Linear
 *
 * @param xyz
 */
const _xyzToP3Linear = (xyz: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            2.493496911941425, -0.9313836179191239, -0.40271078445071684,
            // eslint-disable-next-line prettier/prettier
            -0.8294889695615747, 1.7626640603183463, 0.023624685841943577,
            // eslint-disable-next-line prettier/prettier
            0.03584583024378447, -0.07617238926804182, 0.9568845240076872
        ],
        xyz
    );
};

/**
 * Convert P3 to P3 linear
 *
 * @param p3
 */
const _p32p3Linear = (p3: [number, number, number]) => {
    return p3.map((c: number) => {
        const sign = c < 0 ? -1 : 1,
            abs = c * sign;

        if (abs <= 0.04045) {
            return c / 12.92;
        }

        // eslint-disable-next-line prettier/prettier
        return sign * (((c + 0.055) / 1.055) ** 2.4) || 0;
    });
};

/**
 * Convert P3 Linear to P3
 *
 * @param p3l
 */
const _p3Linear2p3 = (p3l: [number, number, number]) => {
    return _srgbLinear2rgb(p3l);
};

/**
 * Convert P3 to XYZ
 *
 * @param args
 */
const _p3ToXYZ = (args: number[]) => {
    const p3_linear = _p32p3Linear([args[0], args[1], args[2]]);
    return _p3LinearToXyz([p3_linear[0], p3_linear[1], p3_linear[2]]);
};

/**
 * Convert XYZ to P3
 *
 * @param args
 */
const _p3FromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [r, g, b] = _p3Linear2p3(_xyzToP3Linear([args[0], args[1], args[2]]));
    return [r, g, b, args[3]];
};

/**
 * Convert P3 to SRGB and Pack
 *
 * @param args
 */
const _convertP3 = (args: number[]) => {
    const xyz = _p3ToXYZ([args[0], args[1], args[2]]);
    return packXYZ([xyz[0], xyz[1], xyz[2], args[3]]);
};

/**
 * A98-RGB related functions
 */

/**
 * Convert XYZ to a98 linear
 *
 * @param xyz
 */
const _xyz2a98Linear = (xyz: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            2.0415879038107465, -0.5650069742788596, -0.34473135077832956,
            // eslint-disable-next-line prettier/prettier
            -0.9692436362808795, 1.8759675015077202, 0.04155505740717557,
            // eslint-disable-next-line prettier/prettier
            0.013444280632031142, -0.11836239223101838, 1.0151749943912054
        ],
        xyz
    );
};

/**
 * Convert XYZ to a98 linear
 *
 * @param a98
 */
const _a98Linear2xyz = (a98: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            0.5766690429101305, 0.1855582379065463, 0.1882286462349947,
            // eslint-disable-next-line prettier/prettier
            0.29734497525053605, 0.6273635662554661, 0.0752914584939978,
            // eslint-disable-next-line prettier/prettier
            0.02703136138641234, 0.07068885253582723, 0.9913375368376388
        ],
        a98
    );
};

/**
 * Convert A98 RGB to rgb linear
 *
 * @param rgb
 */
const _a982a98Linear = (rgb: [number, number, number]): [number, number, number] => {
    const mapped = rgb.map((c: number) => {
        const sign = c < 0 ? -1 : 1,
            abs = Math.abs(c);
        return sign * abs ** (563 / 256);
    });

    return [mapped[0], mapped[1], mapped[2]];
};

/**
 * Convert A98 RGB Linear to A98
 *
 * @param rgb
 */
const _a98Linear2a98 = (rgb: [number, number, number]): [number, number, number] => {
    const mapped = rgb.map((c: number) => {
        const sign = c < 0 ? -1 : 1,
            abs = Math.abs(c);
        return sign * abs ** (256 / 563);
    });

    return [mapped[0], mapped[1], mapped[2]];
};

/**
 * Convert XYZ to A98
 *
 * @param args
 */
const _a98FromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [r, g, b] = _a98Linear2a98(_xyz2a98Linear([args[0], args[1], args[2]]));
    return [r, g, b, args[3]];
};

/**
 * Convert A98 to XYZ and Pack
 *
 * @param args
 */
const _convertA98rgb = (args: number[]) => {
    const srgb_linear = _xyz2rgbLinear(_a98Linear2xyz(_a982a98Linear([args[0], args[1], args[2]])));
    return packSrgbLinear([srgb_linear[0], srgb_linear[1], srgb_linear[2], args[3]]);
};

/**
 * Pro Photo related functions
 */

/**
 * Convert linear-light display-p3 to XYZ D65
 *
 * @param p3
 */
const _proPhotoLinearToXyz = (p3: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            0.79776664490064230, 0.13518129740053308, 0.03134773412839220,
            // eslint-disable-next-line prettier/prettier
            0.28807482881940130, 0.71183523424187300, 0.00008993693872564,
            // eslint-disable-next-line prettier/prettier
            0.00000000000000000, 0.00000000000000000, 0.82510460251046020
        ],
        p3
    );
};

/**
 * Convert XYZ D65 to linear-light display-p3
 *
 * @param xyz
 */
const _xyzToProPhotoLinear = (xyz: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            1.34578688164715830, -0.25557208737979464, -0.05110186497554526,
            // eslint-disable-next-line prettier/prettier
            -0.54463070512490190, 1.50824774284514680, 0.02052744743642139,
            // eslint-disable-next-line prettier/prettier
            0.00000000000000000, 0.00000000000000000, 1.21196754563894520
        ],
        xyz
    );
};

/**
 * Convert Pro-Photo to Pro-Photo Linear
 *
 * @param p3
 */
const _proPhotoToProPhotoLinear = (p3: [number, number, number]) => {
    return p3.map((c: number) => {
        return c < 16 / 512 ? c / 16 : c ** 1.8;
    });
};

/**
 * Convert Pro-Photo Linear to Pro-Photo
 *
 * @param p3
 */
const _proPhotoLinearToProPhoto = (p3: [number, number, number]) => {
    return p3.map((c: number) => {
        return c > 1 / 512 ? c ** (1 / 1.8) : c * 16;
    });
};

/**
 * Convert Pro-Photo to XYZ
 *
 * @param args
 */
const _proPhotoToXYZ = (args: number[]) => {
    const prophoto_linear = _proPhotoToProPhotoLinear([args[0], args[1], args[2]]);
    return _d50toD65(_proPhotoLinearToXyz([prophoto_linear[0], prophoto_linear[1], prophoto_linear[2]]));
};

/**
 * Convert XYZ to Pro-Photo
 *
 * @param args
 */
const _proPhotoFromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [r, g, b] = _proPhotoLinearToProPhoto(_xyzToProPhotoLinear(_d65toD50([args[0], args[1], args[2]])));
    return [r, g, b, args[3]];
};

/**
 * Convert Pro-Photo to XYZ and Pack
 *
 * @param args
 */
const _convertProPhoto = (args: number[]) => {
    const xyz = _proPhotoToXYZ([args[0], args[1], args[2]]);
    return packXYZ([xyz[0], xyz[1], xyz[2], args[3]]);
};

/**
 * REC2020 related functions
 */

/**
 * Convert rec2020 to rec2020 linear
 *
 * @param rgb
 */
const _rec20202rec2020Linear = (rgb: [number, number, number]) => {
    const a = 1.09929682680944;
    const b = 0.018053968510807;
    return rgb.map(function (c) {
        return c < b * 4.5 ? c / 4.5 : Math.pow((c + a - 1) / a, 1 / 0.45);
    });
};

/**
 * Convert rec2020 linear to rec2020
 *
 * @param rgb
 */
const _rec2020Linear2rec2020 = (rgb: [number, number, number]) => {
    const a = 1.09929682680944;
    const b = 0.018053968510807;
    return rgb.map(function (c) {
        return c >= b ? a * Math.pow(c, 0.45) - (a - 1) : 4.5 * c;
    });
};

/**
 * Convert rec2020 linear to XYZ D65
 *
 * @param rec
 */
const _rec2020LinearToXyz = (rec: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            0.6369580483012914, 0.14461690358620832, 0.1688809751641721,
            // eslint-disable-next-line prettier/prettier
            0.2627002120112671, 0.6779980715188708, 0.05930171646986196,
            // eslint-disable-next-line prettier/prettier
            0.000000000000000, 0.028072693049087428, 1.060985057710791
        ],
        rec
    );
};

/**
 * Convert XYZ D65 to rec2020 linear
 *
 * @param xyz
 */
const _xyzToRec2020Linear = (xyz: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            1.716651187971268, -0.355670783776392, -0.253366281373660,
            // eslint-disable-next-line prettier/prettier
            -0.666684351832489, 1.616481236634939, 0.0157685458139111,
            // eslint-disable-next-line prettier/prettier
            0.017639857445311, -0.042770613257809, 0.942103121235474
        ],
        xyz
    );
};

/**
 * Convert Rec2020 to XYZ
 *
 * @param args
 */
const _rec2020ToXYZ = (args: number[]) => {
    const rec2020_linear = _rec20202rec2020Linear([args[0], args[1], args[2]]);
    return _rec2020LinearToXyz([rec2020_linear[0], rec2020_linear[1], rec2020_linear[2]]);
};

/**
 * Convert XYZ to Rec2020
 *
 * @param args
 */
const _rec2020FromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [r, g, b] = _rec2020Linear2rec2020(_xyzToRec2020Linear([args[0], args[1], args[2]]));
    return [r, g, b, args[3]];
};

/**
 * Convert Rec2020 to SRGB and Pack
 *
 * @param args
 */
const _convertRec2020 = (args: number[]) => {
    const xyz = _rec2020ToXYZ([args[0], args[1], args[2]]);
    return packXYZ([xyz[0], xyz[1], xyz[2], args[3]]);
};

/**
 * Handle the CSS color() function
 *
 * @param context
 * @param args
 */
const _color = (context: Context, args: CSSValue[]) => {
    const SUPPORTED_COLOR_SPACES_ABSOLUTE: {
        [key: string]: (args: number[]) => number;
    } = {
        srgb: packSrgb,
        'srgb-linear': packSrgbLinear,
        'display-p3': _convertP3,
        'a98-rgb': _convertA98rgb,
        'prophoto-rgb': _convertProPhoto,
        xyz: _convertXyz,
        'xyz-d50': _convertXyz50,
        'xyz-d65': _convertXyz,
        rec2020: _convertRec2020
    };

    const SUPPORTED_COLOR_SPACES_TO_XYZ: {
        [key: string]: (context: Context, args: CSSValue[]) => [number, number, number, number];
    } = {
        rgb: _rgbToXyz,
        hsl: _hslToXyz,
        lab: _labToXyz,
        lch: _lchToXyz,
        oklab: _oklabToXyz,
        oklch: _oklchToXyz
    };

    const SUPPORTED_COLOR_SPACES_FROM_XYZ: {
        [key: string]: (args: [number, number, number, number]) => [number, number, number, number];
    } = {
        srgb: _srgbFromXYZ,
        'srgb-linear': _srgbLinearFromXYZ,
        'display-p3': _p3FromXYZ,
        'a98-rgb': _a98FromXYZ,
        'prophoto-rgb': _proPhotoFromXYZ,
        xyz: _xyzFromXYZ,
        'xyz-d50': _xyz50FromXYZ,
        'xyz-d65': _xyzFromXYZ,
        rec2020: _rec2020FromXYZ
    };

    const tokens = args.filter(nonFunctionArgSeparator),
        token_1_value = tokens[0].type === TokenType.IDENT_TOKEN ? tokens[0].value : 'unknown',
        is_absolute = !isRelativeTransform(tokens);

    if (is_absolute) {
        const color_space = token_1_value,
            colorSpaceFunction = SUPPORTED_COLOR_SPACES_ABSOLUTE[color_space];
        if (typeof colorSpaceFunction === 'undefined') {
            throw new Error(`Attempting to parse an unsupported color space "${color_space}" for color() function`);
        }
        const c1 = isNumberToken(tokens[1]) ? tokens[1].number : 0,
            c2 = isNumberToken(tokens[2]) ? tokens[2].number : 0,
            c3 = isNumberToken(tokens[3]) ? tokens[3].number : 0,
            a =
                tokens.length > 4 &&
                tokens[4].type === TokenType.DELIM_TOKEN &&
                tokens[4].value === '/' &&
                isNumberToken(tokens[5])
                    ? tokens[5].number
                    : 1;

        return colorSpaceFunction([c1, c2, c3, a]);
    } else {
        const extractComponent = (color: [number, number, number, number], token: CSSValue) => {
            if (isNumberToken(token)) {
                return token.number;
            }

            const posFromVal = (value: string): number => {
                return value === 'r' || value === 'x' ? 0 : value === 'g' || value === 'y' ? 1 : 2;
            };

            if (isIdentToken(token)) {
                const position = posFromVal(token.value);
                return color[position];
            }

            const parseCalc = (args: CSSValue[]): string => {
                const parts = args.filter(nonFunctionArgSeparator);
                let expression = '(';
                for (const part of parts) {
                    expression +=
                        part.type === TokenType.FUNCTION && part.name === 'calc'
                            ? parseCalc(part.values)
                            : isNumberToken(part)
                            ? part.number
                            : part.type === TokenType.DELIM_TOKEN || isIdentToken(part)
                            ? part.value
                            : '';
                }
                expression += ')';
                return expression;
            };

            if (token.type === TokenType.FUNCTION) {
                const args = token.values.filter(nonFunctionArgSeparator);
                if (token.name === 'calc') {
                    const expression = parseCalc(args)
                        .replace(/r|x/, color[0].toString())
                        .replace(/g|y/, color[1].toString())
                        .replace(/b|z/, color[2].toString());

                    return eval(expression);
                }
            }

            return null;
        };

        const from_colorspace =
                tokens[1].type === TokenType.FUNCTION
                    ? tokens[1].name
                    : isIdentToken(tokens[1]) || tokens[1].type === TokenType.HASH_TOKEN
                    ? 'rgb'
                    : 'unknown',
            to_colorspace = isIdentToken(tokens[2]) ? tokens[2].value : 'unknown';

        let from =
            tokens[1].type === TokenType.FUNCTION ? tokens[1].values : isIdentToken(tokens[1]) ? [tokens[1]] : [];

        if (isIdentToken(tokens[1])) {
            const named_color = COLORS[tokens[1].value.toUpperCase()];
            if (typeof named_color === 'undefined') {
                throw new Error(`Attempting to use unknown color in relative color 'from'`);
            } else {
                const _c = parseColor(context, tokens[1].value),
                    alpha = 0xff & _c,
                    blue = 0xff & (_c >> 8),
                    green = 0xff & (_c >> 16),
                    red = 0xff & (_c >> 24);
                from = [
                    {type: TokenType.NUMBER_TOKEN, number: red, flags: 1},
                    {type: TokenType.NUMBER_TOKEN, number: green, flags: 1},
                    {type: TokenType.NUMBER_TOKEN, number: blue, flags: 1},
                    {type: TokenType.NUMBER_TOKEN, number: alpha > 1 ? alpha / 255 : alpha, flags: 1}
                ];
            }
        } else if (tokens[1].type === TokenType.HASH_TOKEN) {
            const [red, green, blue, alpha] = hash2rgb(tokens[1]);
            from = [
                {type: TokenType.NUMBER_TOKEN, number: red, flags: 1},
                {type: TokenType.NUMBER_TOKEN, number: green, flags: 1},
                {type: TokenType.NUMBER_TOKEN, number: blue, flags: 1},
                {type: TokenType.NUMBER_TOKEN, number: alpha > 1 ? alpha / 255 : alpha, flags: 1}
            ];
        }

        if (from.length === 0) {
            throw new Error(`Attempting to use unknown color in relative color 'from'`);
        }

        if (to_colorspace === 'unknown') {
            throw new Error(`Attempting to use unknown colorspace in relative color 'to'`);
        }

        const fromColorToXyz = SUPPORTED_COLOR_SPACES_TO_XYZ[from_colorspace],
            toColorFromXyz = SUPPORTED_COLOR_SPACES_FROM_XYZ[to_colorspace],
            toColorPack = SUPPORTED_COLOR_SPACES_ABSOLUTE[to_colorspace];

        if (typeof fromColorToXyz === 'undefined') {
            throw new Error(`Attempting to parse an unsupported color space "${from_colorspace}" for color() function`);
        }
        if (typeof toColorFromXyz === 'undefined') {
            throw new Error(`Attempting to parse an unsupported color space "${to_colorspace}" for color() function`);
        }

        const from_color: [number, number, number, number] = fromColorToXyz(context, from),
            from_final_colorspace: [number, number, number, number] = toColorFromXyz(from_color),
            c1 = extractComponent(from_final_colorspace, tokens[3]),
            c2 = extractComponent(from_final_colorspace, tokens[4]),
            c3 = extractComponent(from_final_colorspace, tokens[5]),
            a =
                tokens.length > 6 &&
                tokens[6].type === TokenType.DELIM_TOKEN &&
                tokens[6].value === '/' &&
                isNumberToken(tokens[7])
                    ? tokens[7].number
                    : 1;
        if (c1 === null || c2 === null || c3 === null) {
            throw new Error(`Invalid relative color in color() function`);
        }

        return toColorPack([c1, c2, c3, a]);
    }
};

const SUPPORTED_COLOR_FUNCTIONS: {
    [key: string]: (context: Context, args: CSSValue[]) => number;
} = {
    hsl: packHSL,
    hsla: packHSL,
    rgb: rgb,
    rgba: rgb,
    lch: packLch,
    oklch: packOkLch,
    oklab: packOkLab,
    lab: packLab,
    color: _color
};

export const parseColor = (context: Context, value: string): Color =>
    color.parse(context, Parser.create(value).parseComponentValue());

export const COLORS: {[key: string]: Color} = {
    ALICEBLUE: 0xf0f8ffff,
    ANTIQUEWHITE: 0xfaebd7ff,
    AQUA: 0x00ffffff,
    AQUAMARINE: 0x7fffd4ff,
    AZURE: 0xf0ffffff,
    BEIGE: 0xf5f5dcff,
    BISQUE: 0xffe4c4ff,
    BLACK: 0x000000ff,
    BLANCHEDALMOND: 0xffebcdff,
    BLUE: 0x0000ffff,
    BLUEVIOLET: 0x8a2be2ff,
    BROWN: 0xa52a2aff,
    BURLYWOOD: 0xdeb887ff,
    CADETBLUE: 0x5f9ea0ff,
    CHARTREUSE: 0x7fff00ff,
    CHOCOLATE: 0xd2691eff,
    CORAL: 0xff7f50ff,
    CORNFLOWERBLUE: 0x6495edff,
    CORNSILK: 0xfff8dcff,
    CRIMSON: 0xdc143cff,
    CYAN: 0x00ffffff,
    DARKBLUE: 0x00008bff,
    DARKCYAN: 0x008b8bff,
    DARKGOLDENROD: 0xb886bbff,
    DARKGRAY: 0xa9a9a9ff,
    DARKGREEN: 0x006400ff,
    DARKGREY: 0xa9a9a9ff,
    DARKKHAKI: 0xbdb76bff,
    DARKMAGENTA: 0x8b008bff,
    DARKOLIVEGREEN: 0x556b2fff,
    DARKORANGE: 0xff8c00ff,
    DARKORCHID: 0x9932ccff,
    DARKRED: 0x8b0000ff,
    DARKSALMON: 0xe9967aff,
    DARKSEAGREEN: 0x8fbc8fff,
    DARKSLATEBLUE: 0x483d8bff,
    DARKSLATEGRAY: 0x2f4f4fff,
    DARKSLATEGREY: 0x2f4f4fff,
    DARKTURQUOISE: 0x00ced1ff,
    DARKVIOLET: 0x9400d3ff,
    DEEPPINK: 0xff1493ff,
    DEEPSKYBLUE: 0x00bfffff,
    DIMGRAY: 0x696969ff,
    DIMGREY: 0x696969ff,
    DODGERBLUE: 0x1e90ffff,
    FIREBRICK: 0xb22222ff,
    FLORALWHITE: 0xfffaf0ff,
    FORESTGREEN: 0x228b22ff,
    FUCHSIA: 0xff00ffff,
    GAINSBORO: 0xdcdcdcff,
    GHOSTWHITE: 0xf8f8ffff,
    GOLD: 0xffd700ff,
    GOLDENROD: 0xdaa520ff,
    GRAY: 0x808080ff,
    GREEN: 0x008000ff,
    GREENYELLOW: 0xadff2fff,
    GREY: 0x808080ff,
    HONEYDEW: 0xf0fff0ff,
    HOTPINK: 0xff69b4ff,
    INDIANRED: 0xcd5c5cff,
    INDIGO: 0x4b0082ff,
    IVORY: 0xfffff0ff,
    KHAKI: 0xf0e68cff,
    LAVENDER: 0xe6e6faff,
    LAVENDERBLUSH: 0xfff0f5ff,
    LAWNGREEN: 0x7cfc00ff,
    LEMONCHIFFON: 0xfffacdff,
    LIGHTBLUE: 0xadd8e6ff,
    LIGHTCORAL: 0xf08080ff,
    LIGHTCYAN: 0xe0ffffff,
    LIGHTGOLDENRODYELLOW: 0xfafad2ff,
    LIGHTGRAY: 0xd3d3d3ff,
    LIGHTGREEN: 0x90ee90ff,
    LIGHTGREY: 0xd3d3d3ff,
    LIGHTPINK: 0xffb6c1ff,
    LIGHTSALMON: 0xffa07aff,
    LIGHTSEAGREEN: 0x20b2aaff,
    LIGHTSKYBLUE: 0x87cefaff,
    LIGHTSLATEGRAY: 0x778899ff,
    LIGHTSLATEGREY: 0x778899ff,
    LIGHTSTEELBLUE: 0xb0c4deff,
    LIGHTYELLOW: 0xffffe0ff,
    LIME: 0x00ff00ff,
    LIMEGREEN: 0x32cd32ff,
    LINEN: 0xfaf0e6ff,
    MAGENTA: 0xff00ffff,
    MAROON: 0x800000ff,
    MEDIUMAQUAMARINE: 0x66cdaaff,
    MEDIUMBLUE: 0x0000cdff,
    MEDIUMORCHID: 0xba55d3ff,
    MEDIUMPURPLE: 0x9370dbff,
    MEDIUMSEAGREEN: 0x3cb371ff,
    MEDIUMSLATEBLUE: 0x7b68eeff,
    MEDIUMSPRINGGREEN: 0x00fa9aff,
    MEDIUMTURQUOISE: 0x48d1ccff,
    MEDIUMVIOLETRED: 0xc71585ff,
    MIDNIGHTBLUE: 0x191970ff,
    MINTCREAM: 0xf5fffaff,
    MISTYROSE: 0xffe4e1ff,
    MOCCASIN: 0xffe4b5ff,
    NAVAJOWHITE: 0xffdeadff,
    NAVY: 0x000080ff,
    OLDLACE: 0xfdf5e6ff,
    OLIVE: 0x808000ff,
    OLIVEDRAB: 0x6b8e23ff,
    ORANGE: 0xffa500ff,
    ORANGERED: 0xff4500ff,
    ORCHID: 0xda70d6ff,
    PALEGOLDENROD: 0xeee8aaff,
    PALEGREEN: 0x98fb98ff,
    PALETURQUOISE: 0xafeeeeff,
    PALEVIOLETRED: 0xdb7093ff,
    PAPAYAWHIP: 0xffefd5ff,
    PEACHPUFF: 0xffdab9ff,
    PERU: 0xcd853fff,
    PINK: 0xffc0cbff,
    PLUM: 0xdda0ddff,
    POWDERBLUE: 0xb0e0e6ff,
    PURPLE: 0x800080ff,
    REBECCAPURPLE: 0x663399ff,
    RED: 0xff0000ff,
    ROSYBROWN: 0xbc8f8fff,
    ROYALBLUE: 0x4169e1ff,
    SADDLEBROWN: 0x8b4513ff,
    SALMON: 0xfa8072ff,
    SANDYBROWN: 0xf4a460ff,
    SEAGREEN: 0x2e8b57ff,
    SEASHELL: 0xfff5eeff,
    SIENNA: 0xa0522dff,
    SILVER: 0xc0c0c0ff,
    SKYBLUE: 0x87ceebff,
    SLATEBLUE: 0x6a5acdff,
    SLATEGRAY: 0x708090ff,
    SLATEGREY: 0x708090ff,
    SNOW: 0xfffafaff,
    SPRINGGREEN: 0x00ff7fff,
    STEELBLUE: 0x4682b4ff,
    TAN: 0xd2b48cff,
    TEAL: 0x008080ff,
    THISTLE: 0xd8bfd8ff,
    TOMATO: 0xff6347ff,
    TRANSPARENT: 0x00000000,
    TURQUOISE: 0x40e0d0ff,
    VIOLET: 0xee82eeff,
    WHEAT: 0xf5deb3ff,
    WHITE: 0xffffffff,
    WHITESMOKE: 0xf5f5f5ff,
    YELLOW: 0xffff00ff,
    YELLOWGREEN: 0x9acd32ff
};
