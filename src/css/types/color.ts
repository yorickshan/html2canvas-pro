import {CSSValue, isDimensionToken, isNumberToken, nonFunctionArgSeparator, Parser} from '../syntax/parser';
import {TokenType} from '../syntax/tokenizer';
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
            if (value.value.length === 3) {
                const r = value.value.substring(0, 1);
                const g = value.value.substring(1, 2);
                const b = value.value.substring(2, 3);
                return pack(parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16), 1);
            }

            if (value.value.length === 4) {
                const r = value.value.substring(0, 1);
                const g = value.value.substring(1, 2);
                const b = value.value.substring(2, 3);
                const a = value.value.substring(3, 4);
                return pack(parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16), parseInt(a + a, 16) / 255);
            }

            if (value.value.length === 6) {
                const r = value.value.substring(0, 2);
                const g = value.value.substring(2, 4);
                const b = value.value.substring(4, 6);
                return pack(parseInt(r, 16), parseInt(g, 16), parseInt(b, 16), 1);
            }

            if (value.value.length === 8) {
                const r = value.value.substring(0, 2);
                const g = value.value.substring(2, 4);
                const b = value.value.substring(4, 6);
                const a = value.value.substring(6, 8);
                return pack(parseInt(r, 16), parseInt(g, 16), parseInt(b, 16), parseInt(a, 16) / 255);
            }
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

export const isTransparent = (color: Color): boolean => (0xff & color) === 0;

export const asString = (color: Color): string => {
    const alpha = 0xff & color;
    const blue = 0xff & (color >> 8);
    const green = 0xff & (color >> 16);
    const red = 0xff & (color >> 24);
    return alpha < 255 ? `rgba(${red},${green},${blue},${alpha / 255})` : `rgb(${red},${green},${blue})`;
};

export const isRelativeTransform = (tokens: CSSValue[]): boolean =>
    (tokens[0].type === TokenType.IDENT_TOKEN ? tokens[0].value : 'unknown') !== 'from';

export const pack = (r: number, g: number, b: number, a: number): Color =>
    ((r << 24) | (g << 16) | (b << 8) | (Math.round(a * 255) << 0)) >>> 0;

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

const hsl = (context: Context, args: CSSValue[]): number => {
    const tokens = args.filter(nonFunctionArgSeparator);
    const [hue, saturation, lightness, alpha] = tokens;

    const h = (hue.type === TokenType.NUMBER_TOKEN ? deg(hue.number) : angle.parse(context, hue)) / (Math.PI * 2);
    const s = isLengthPercentage(saturation) ? saturation.number / 100 : 0;
    const l = isLengthPercentage(lightness) ? lightness.number / 100 : 0;
    const a = typeof alpha !== 'undefined' && isLengthPercentage(alpha) ? getAbsoluteValue(alpha, 1) : 1;

    if (s === 0) {
        return pack(l * 255, l * 255, l * 255, 1);
    }

    const t2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;

    const t1 = l * 2 - t2;
    const r = hue2rgb(t1, t2, h + 1 / 3);
    const g = hue2rgb(t1, t2, h);
    const b = hue2rgb(t1, t2, h - 1 / 3);
    return pack(r * 255, g * 255, b * 255, a);
};

const lch = (_context: Context, args: CSSValue[]) => {
    const tokens = args.filter(nonFunctionArgSeparator),
        is_absolute = isRelativeTransform(tokens);
    if (!is_absolute) {
        return _color(_context, args);
    }
    const L = tokens[0],
        C = tokens[1],
        H = tokens[2],
        A = tokens[4],
        l = isLengthPercentage(L) ? L.number : 0,
        c = isLengthPercentage(C) ? C.number : 0,
        h = isNumberToken(H) || isDimensionToken(H) ? H.number : 0,
        a = typeof A !== 'undefined' && isLengthPercentage(A) ? getAbsoluteValue(A, 1) : 1,
        rgb = _srgbLinear2rgb(_xyz2rgbLinear(_lab2xyz(_lch2lab([l, c, h]))));

    return pack(
        clamp(Math.round(rgb[0] * 255), 0, 255),
        clamp(Math.round(rgb[1] * 255), 0, 255),
        clamp(Math.round(rgb[2] * 255), 0, 255),
        a
    );
};

const lab = (_context: Context, args: CSSValue[]) => {
    const tokens = args.filter(nonFunctionArgSeparator),
        is_absolute = isRelativeTransform(tokens);
    if (!is_absolute) {
        return _color(_context, args);
    }
    const L = tokens[0],
        A = tokens[1],
        B = tokens[2],
        Alpha = tokens[4],
        // eslint-disable-next-line prettier/prettier
        l = L.type === TokenType.PERCENTAGE_TOKEN ? L.number / 100 : (isNumberToken(L) ? L.number : 0),
        // eslint-disable-next-line prettier/prettier
        a = A.type === TokenType.PERCENTAGE_TOKEN ? A.number / 100 : (isNumberToken(A) ? A.number : 0),
        b = isNumberToken(B) || isDimensionToken(B) ? B.number : 0,
        alpha = typeof Alpha !== 'undefined' && isLengthPercentage(Alpha) ? getAbsoluteValue(Alpha, 1) : 1,
        rgb = _srgbLinear2rgb(_xyz2rgbLinear(_lab2xyz([l, a, b])));

    return pack(
        clamp(Math.round(rgb[0] * 255), 0, 255),
        clamp(Math.round(rgb[1] * 255), 0, 255),
        clamp(Math.round(rgb[2] * 255), 0, 255),
        alpha
    );
};

const oklab = (_context: Context, args: CSSValue[]) => {
    const tokens = args.filter(nonFunctionArgSeparator),
        is_absolute = isRelativeTransform(tokens);
    if (!is_absolute) {
        return _color(_context, args);
    }
    const L = tokens[0],
        A = tokens[1],
        B = tokens[2],
        Alpha = tokens[4],
        // eslint-disable-next-line prettier/prettier
        l = L.type === TokenType.PERCENTAGE_TOKEN ? L.number / 100 : isNumberToken(L) ? L.number : 0,
        // eslint-disable-next-line prettier/prettier
        a = A.type === TokenType.PERCENTAGE_TOKEN ? A.number / 100 : isNumberToken(A) ? A.number : 0,
        b = isNumberToken(B) ? B.number : isDimensionToken(B) ? B.number : 0,
        alpha = typeof Alpha !== 'undefined' && isLengthPercentage(Alpha) ? getAbsoluteValue(Alpha, 1) : 1,
        rgb = _srgbLinear2rgb(_xyz2rgbLinear(_oklab2xyz([l, a, b])));

    return pack(
        clamp(Math.round(rgb[0] * 255), 0, 255),
        clamp(Math.round(rgb[1] * 255), 0, 255),
        clamp(Math.round(rgb[2] * 255), 0, 255),
        alpha
    );
};

const oklch = (_context: Context, args: CSSValue[]) => {
    const tokens = args.filter(nonFunctionArgSeparator),
        is_absolute = isRelativeTransform(tokens);
    if (!is_absolute) {
        return _color(_context, args);
    }
    const L = tokens[0],
        C = tokens[1],
        H = tokens[2],
        Alpha = tokens[4],
        // eslint-disable-next-line prettier/prettier
        l = L.type === TokenType.PERCENTAGE_TOKEN ? L.number / 100 : isNumberToken(L) ? L.number : 0,
        // eslint-disable-next-line prettier/prettier
        c = C.type === TokenType.PERCENTAGE_TOKEN ? C.number / 100 : isNumberToken(C) ? C.number : 0,
        h = isNumberToken(H) ? H.number : isDimensionToken(H) ? H.number : 0,
        alpha = typeof Alpha !== 'undefined' && isLengthPercentage(Alpha) ? getAbsoluteValue(Alpha, 1) : 1,
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
const _lch2lab = ([l, c, h]: [number, number, number]): [number, number, number] => [
    l,
    isNaN(h) ? 0 : c * Math.cos((h * Math.PI) / 180),
    isNaN(h) ? 0 : c * Math.sin((h * Math.PI) / 180)
];

/**
 * Convert sRGB to RGB
 *
 * @param rgb
 */
const _srgbLinear2rgb = (rgb: [number, number, number]) => {
    return rgb.map((c: number) => {
        const sign = c < 0 ? -1 : 1,
            abs = Math.abs(c);
        return abs > 0.0031308 ? sign * (1.055 * abs ** (1 / 2.4) - 0.055) : 12.92 * c;
    });
};

/**
 * Convert A98 RGB to rgb linear
 *
 * @param rgb
 */
const _a982rgbLinear = (rgb: [number, number, number]) => {
    return rgb.map((c: number) => {
        const sign = c < 0 ? -1 : 1,
            abs = Math.abs(c);
        return sign * abs ** (563 / 256);
    });
};

/**
 * Convert A98 RGB to rgb linear
 *
 * @param rgb
 */
const _rec2rec2Linear = (rgb: [number, number, number]) => {
    const a = 1.09929682680944;
    const b = 0.018053968510807;
    return rgb.map(function (val) {
        if (val < b * 4.5) {
            return val / 4.5;
        }

        return Math.pow((val + a - 1) / a, 1 / 0.45);
    });
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
 * Convert P3 to rgb linear
 *
 * @param p3
 */
const _prophoto2prophotoLinear = (p3: [number, number, number]) => {
    return p3.map((c: number) => {
        return c < 16 / 512 ? c / 16 : c ** 1.8;
    });
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
    const fy = (lab[0] + 16.0) / 116.0,
        fx = lab[1] / 500.0 + fy,
        fz = fy - lab[2] / 200.0,
        k = 903.2962963,
        e = 0.00885645167;

    return [
        (fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k) * (0.3127 / 0.329),
        lab[0] > k * e ? fy ** 3 : lab[0] / k,
        (fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k) * ((1.0 - 0.3127 - 0.329) / 0.329)
    ];
};

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
 * Convert P3 Linear to xyz
 *
 * @param p3l
 */
const _p3Linear2xyz = (p3l: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            0.4865709486482162, 0.26566769316909306, 0.1982172852343625,
            // eslint-disable-next-line prettier/prettier
            0.2289745640697488, 0.6917385218365064,  0.079286914093745,
            // eslint-disable-next-line prettier/prettier
            0.0000000000000000, 0.04511338185890264, 1.043944368900976
        ],
        p3l
    );
};

/**
 * Convert linear-light display-p3 to XYZ D65
 *
 * @param p3
 */
const _proPhotoLinear2xyz = (p3: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            0.79776664490064230,  0.13518129740053308,  0.03134773412839220,
            // eslint-disable-next-line prettier/prettier
            0.28807482881940130,  0.71183523424187300,  0.00008993693872564,
            // eslint-disable-next-line prettier/prettier
            0.00000000000000000,  0.00000000000000000,  0.82510460251046020
        ],
        p3
    );
};

/**
 * Convert linear-light rec2020 to XYZ D65
 *
 * @param rec
 */
const _rec2020Linear2xyz = (rec: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            0.6369580483012914, 0.14461690358620832,  0.1688809751641721,
            // eslint-disable-next-line prettier/prettier
            0.2627002120112671, 0.6779980715188708,   0.05930171646986196,
            // eslint-disable-next-line prettier/prettier
            0.000000000000000,  0.028072693049087428, 1.060985057710791
        ],
        rec
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

const _color = (_context: Context, args: CSSValue[]) => {
    const _srgb = (args: number[]) => {
        return pack(args[0], args[1], args[2], args[3]);
    };

    const _packSrgbLinear = ([r, g, b, a]: [number, number, number, number]) => {
        const rgb = _srgbLinear2rgb([r, g, b]);
        return pack(
            clamp(Math.round(rgb[0] * 255), 0, 255),
            clamp(Math.round(rgb[1] * 255), 0, 255),
            clamp(Math.round(rgb[2] * 255), 0, 255),
            a
        );
    };

    const _srgbLinear = (args: number[]) => {
        return _packSrgbLinear([args[0], args[1], args[2], args[3]]);
    };

    const _xyz = (args: number[]) => {
        const srgb_linear = _xyz2rgbLinear([args[0], args[1], args[2]]);
        return _packSrgbLinear([srgb_linear[0], srgb_linear[1], srgb_linear[2], args[3]]);
    };

    const _xyz50 = (args: number[]) => {
        const srgb_linear = _xyz2rgbLinear(_d50toD65([args[0], args[1], args[2]]));
        return _packSrgbLinear([srgb_linear[0], srgb_linear[1], srgb_linear[2], args[3]]);
    };

    const _p3 = (args: number[]) => {
        const p3Linear = _p32p3Linear([args[0], args[1], args[2]]),
            srgb_linear = _xyz2rgbLinear(_p3Linear2xyz([p3Linear[0], p3Linear[1], p3Linear[2]]));
        return _packSrgbLinear([srgb_linear[0], srgb_linear[1], srgb_linear[2], args[3]]);
    };

    const _a98rgb = (args: number[]) => {
        const srgb_linear = _a982rgbLinear([args[0], args[1], args[2]]);
        return _packSrgbLinear([srgb_linear[0], srgb_linear[1], srgb_linear[2], args[3]]);
    };

    const _proPhoto = (args: number[]) => {
        const prophoto_linear = _prophoto2prophotoLinear([args[0], args[1], args[2]]),
            srgb_linear = _xyz2rgbLinear(
                _d50toD65(_proPhotoLinear2xyz([prophoto_linear[0], prophoto_linear[1], prophoto_linear[2]]))
            );
        return _packSrgbLinear([srgb_linear[0], srgb_linear[1], srgb_linear[2], args[3]]);
    };

    const _rec2020 = (args: number[]) => {
        const rec2020_linear = _rec2rec2Linear([args[0], args[1], args[2]]),
            srgb_linear = _xyz2rgbLinear(_rec2020Linear2xyz([rec2020_linear[0], rec2020_linear[1], rec2020_linear[2]]));
        return _packSrgbLinear([srgb_linear[0], srgb_linear[1], srgb_linear[2], args[3]]);
    };

    const SUPPORTED_COLOR_SPACES: {
        [key: string]: (args: number[]) => number;
    } = {
        srgb: _srgb,
        'srgb-linear': _srgbLinear,
        'display-p3': _p3,
        'a98-rgb': _a98rgb,
        'prophoto-rgb': _proPhoto,
        xyz: _xyz,
        'xyz-d50': _xyz50,
        'xyz-d65': _xyz,
        rec2020: _rec2020
    };

    const tokens = args.filter(nonFunctionArgSeparator),
        token_1_value = tokens[0].type === TokenType.IDENT_TOKEN ? tokens[0].value : 'unknown',
        is_absolute = isRelativeTransform(tokens);

    if (is_absolute) {
        const color_space = token_1_value,
            colorSpaceFunction = SUPPORTED_COLOR_SPACES[color_space];
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
        throw new Error(`Attempting to use relative color function which is not yet supported`);
    }
};

const SUPPORTED_COLOR_FUNCTIONS: {
    [key: string]: (context: Context, args: CSSValue[]) => number;
} = {
    hsl: hsl,
    hsla: hsl,
    rgb: rgb,
    rgba: rgb,
    lch: lch,
    oklch: oklch,
    oklab: oklab,
    lab: lab,
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
