import { CSSValue, isIdentToken, isNumberToken, nonFunctionArgSeparator, Parser } from '../syntax/parser';
import { HashToken, TokenType } from '../syntax/tokenizer';
import { ITypeDescriptor } from '../ITypeDescriptor';
import { Context } from '../../core/context';
import { srgbFromXYZ, srgbLinearFromXYZ } from './color-spaces/srgb';
import {
    packSrgbLinear,
    packSrgb,
    packHSL,
    packLch,
    packOkLch,
    packOkLab,
    packLab,
    isRelativeTransform,
    pack,
    getTokenColorValue,
    convertXyz,
    convertXyz50,
    rgbToXyz,
    hslToXyz,
    labToXyz,
    lchToXyz,
    oklabToXyz,
    oklchToXyz,
    xyzFromXYZ,
    xyz50FromXYZ
} from './color-utilities';
import { convertP3, p3FromXYZ } from './color-spaces/p3';
import { a98FromXYZ, convertA98rgb } from './color-spaces/a98';
import { convertProPhoto, proPhotoFromXYZ } from './color-spaces/pro-photo';
import { convertRec2020, rec2020FromXYZ } from './color-spaces/rec2020';

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

/**
 * Handle the CSS color() function
 *
 * @param context
 * @param args
 */
const _color = (context: Context, args: CSSValue[]) => {
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

                    return new Function('return ' + expression)();
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
                    { type: TokenType.NUMBER_TOKEN, number: red, flags: 1 },
                    { type: TokenType.NUMBER_TOKEN, number: green, flags: 1 },
                    { type: TokenType.NUMBER_TOKEN, number: blue, flags: 1 },
                    { type: TokenType.NUMBER_TOKEN, number: alpha > 1 ? alpha / 255 : alpha, flags: 1 }
                ];
            }
        } else if (tokens[1].type === TokenType.HASH_TOKEN) {
            const [red, green, blue, alpha] = hash2rgb(tokens[1]);
            from = [
                { type: TokenType.NUMBER_TOKEN, number: red, flags: 1 },
                { type: TokenType.NUMBER_TOKEN, number: green, flags: 1 },
                { type: TokenType.NUMBER_TOKEN, number: blue, flags: 1 },
                { type: TokenType.NUMBER_TOKEN, number: alpha > 1 ? alpha / 255 : alpha, flags: 1 }
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

const SUPPORTED_COLOR_SPACES_ABSOLUTE: {
    [key: string]: (args: number[]) => number;
} = {
    srgb: packSrgb,
    'srgb-linear': packSrgbLinear,
    'display-p3': convertP3,
    'a98-rgb': convertA98rgb,
    'prophoto-rgb': convertProPhoto,
    xyz: convertXyz,
    'xyz-d50': convertXyz50,
    'xyz-d65': convertXyz,
    rec2020: convertRec2020
};

const SUPPORTED_COLOR_SPACES_TO_XYZ: {
    [key: string]: (context: Context, args: CSSValue[]) => [number, number, number, number];
} = {
    rgb: rgbToXyz,
    hsl: hslToXyz,
    lab: labToXyz,
    lch: lchToXyz,
    oklab: oklabToXyz,
    oklch: oklchToXyz
};

const SUPPORTED_COLOR_SPACES_FROM_XYZ: {
    [key: string]: (args: [number, number, number, number]) => [number, number, number, number];
} = {
    srgb: srgbFromXYZ,
    'srgb-linear': srgbLinearFromXYZ,
    'display-p3': p3FromXYZ,
    'a98-rgb': a98FromXYZ,
    'prophoto-rgb': proPhotoFromXYZ,
    xyz: xyzFromXYZ,
    'xyz-d50': xyz50FromXYZ,
    'xyz-d65': xyzFromXYZ,
    rec2020: rec2020FromXYZ
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

export const COLORS: { [key: string]: Color } = {
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
