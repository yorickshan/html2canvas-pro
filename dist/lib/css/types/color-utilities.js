"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertXyz50 = exports.convertXyz = exports.xyz50FromXYZ = exports.xyzFromXYZ = exports.xyz50ToXYZ = exports.oklabToXyz = exports.oklchToXyz = exports.lchToXyz = exports.labToXyz = exports.hslToXyz = exports.rgbToXyz = exports.hue2rgb = exports.d50toD65 = exports.d65toD50 = exports.extractOkLchComponents = exports.extractLabComponents = exports.extractLchComponents = exports.packHSL = exports.extractHslComponents = exports.packLch = exports.packOkLch = exports.packOkLab = exports.packLab = exports.packXYZ = exports.packSrgbLinear = exports.packSrgb = exports.multiplyMatrices = exports.clamp = exports.isRelativeTransform = exports.getTokenColorValue = exports.pack = exports.asString = exports.isTransparent = void 0;
var parser_1 = require("../syntax/parser");
var srgb_1 = require("./color-spaces/srgb");
var angle_1 = require("./angle");
var length_percentage_1 = require("./length-percentage");
var isTransparent = function (color) { return (0xff & color) === 0; };
exports.isTransparent = isTransparent;
var asString = function (color) {
    var alpha = 0xff & color;
    var blue = 0xff & (color >> 8);
    var green = 0xff & (color >> 16);
    var red = 0xff & (color >> 24);
    return alpha < 255 ? "rgba(".concat(red, ",").concat(green, ",").concat(blue, ",").concat(alpha / 255, ")") : "rgb(".concat(red, ",").concat(green, ",").concat(blue, ")");
};
exports.asString = asString;
var pack = function (r, g, b, a) {
    return ((r << 24) | (g << 16) | (b << 8) | (Math.round(a * 255) << 0)) >>> 0;
};
exports.pack = pack;
var getTokenColorValue = function (token, i) {
    if (token.type === 17 /* TokenType.NUMBER_TOKEN */) {
        return token.number;
    }
    if (token.type === 16 /* TokenType.PERCENTAGE_TOKEN */) {
        var max = i === 3 ? 1 : 255;
        return i === 3 ? (token.number / 100) * max : Math.round((token.number / 100) * max);
    }
    return 0;
};
exports.getTokenColorValue = getTokenColorValue;
var isRelativeTransform = function (tokens) {
    return (tokens[0].type === 20 /* TokenType.IDENT_TOKEN */ ? tokens[0].value : 'unknown') === 'from';
};
exports.isRelativeTransform = isRelativeTransform;
var clamp = function (value, min, max) {
    return Math.min(Math.max(value, min), max);
};
exports.clamp = clamp;
var multiplyMatrices = function (A, B) {
    return [
        A[0] * B[0] + A[1] * B[1] + A[2] * B[2],
        A[3] * B[0] + A[4] * B[1] + A[5] * B[2],
        A[6] * B[0] + A[7] * B[1] + A[8] * B[2]
    ];
};
exports.multiplyMatrices = multiplyMatrices;
var packSrgb = function (args) {
    return (0, exports.pack)((0, exports.clamp)(Math.round(args[0] * 255), 0, 255), (0, exports.clamp)(Math.round(args[1] * 255), 0, 255), (0, exports.clamp)(Math.round(args[2] * 255), 0, 255), (0, exports.clamp)(args[3], 0, 1));
};
exports.packSrgb = packSrgb;
var packSrgbLinear = function (_a) {
    var r = _a[0], g = _a[1], b = _a[2], a = _a[3];
    var rgb = (0, srgb_1.srgbLinear2rgb)([r, g, b]);
    return (0, exports.pack)((0, exports.clamp)(Math.round(rgb[0] * 255), 0, 255), (0, exports.clamp)(Math.round(rgb[1] * 255), 0, 255), (0, exports.clamp)(Math.round(rgb[2] * 255), 0, 255), a);
};
exports.packSrgbLinear = packSrgbLinear;
var packXYZ = function (args) {
    var srgb_linear = (0, srgb_1.xyz2rgbLinear)([args[0], args[1], args[2]]);
    return (0, exports.packSrgbLinear)([srgb_linear[0], srgb_linear[1], srgb_linear[2], args[3]]);
};
exports.packXYZ = packXYZ;
var packLab = function (_context, args) {
    if ((0, exports.isRelativeTransform)(args.filter(parser_1.nonFunctionArgSeparator))) {
        throw new Error('Relative color not supported for lab()');
    }
    var _a = (0, exports.extractLabComponents)(args), l = _a[0], a = _a[1], b = _a[2], alpha = _a[3], rgb = (0, srgb_1.srgbLinear2rgb)((0, srgb_1.xyz2rgbLinear)(lab2xyz([l, a, b])));
    return (0, exports.pack)((0, exports.clamp)(Math.round(rgb[0] * 255), 0, 255), (0, exports.clamp)(Math.round(rgb[1] * 255), 0, 255), (0, exports.clamp)(Math.round(rgb[2] * 255), 0, 255), alpha);
};
exports.packLab = packLab;
var packOkLab = function (_context, args) {
    if ((0, exports.isRelativeTransform)(args.filter(parser_1.nonFunctionArgSeparator))) {
        throw new Error('Relative color not supported for oklab()');
    }
    var _a = (0, exports.extractLabComponents)(args), l = _a[0], a = _a[1], b = _a[2], alpha = _a[3], rgb = (0, srgb_1.srgbLinear2rgb)((0, srgb_1.xyz2rgbLinear)(oklab2xyz([l, a, b])));
    return (0, exports.pack)((0, exports.clamp)(Math.round(rgb[0] * 255), 0, 255), (0, exports.clamp)(Math.round(rgb[1] * 255), 0, 255), (0, exports.clamp)(Math.round(rgb[2] * 255), 0, 255), alpha);
};
exports.packOkLab = packOkLab;
var packOkLch = function (_context, args) {
    if ((0, exports.isRelativeTransform)(args.filter(parser_1.nonFunctionArgSeparator))) {
        throw new Error('Relative color not supported for oklch()');
    }
    var _a = (0, exports.extractOkLchComponents)(args), l = _a[0], c = _a[1], h = _a[2], alpha = _a[3], rgb = (0, srgb_1.srgbLinear2rgb)((0, srgb_1.xyz2rgbLinear)(oklab2xyz(lch2lab([l, c, h]))));
    return (0, exports.pack)((0, exports.clamp)(Math.round(rgb[0] * 255), 0, 255), (0, exports.clamp)(Math.round(rgb[1] * 255), 0, 255), (0, exports.clamp)(Math.round(rgb[2] * 255), 0, 255), alpha);
};
exports.packOkLch = packOkLch;
var packLch = function (_context, args) {
    if ((0, exports.isRelativeTransform)(args.filter(parser_1.nonFunctionArgSeparator))) {
        throw new Error('Relative color not supported for lch()');
    }
    var _a = (0, exports.extractLchComponents)(args), l = _a[0], c = _a[1], h = _a[2], a = _a[3], rgb = (0, srgb_1.srgbLinear2rgb)((0, srgb_1.xyz2rgbLinear)(lab2xyz(lch2lab([l, c, h]))));
    return (0, exports.pack)((0, exports.clamp)(Math.round(rgb[0] * 255), 0, 255), (0, exports.clamp)(Math.round(rgb[1] * 255), 0, 255), (0, exports.clamp)(Math.round(rgb[2] * 255), 0, 255), a);
};
exports.packLch = packLch;
var extractHslComponents = function (context, args) {
    var tokens = args.filter(parser_1.nonFunctionArgSeparator), hue = tokens[0], saturation = tokens[1], lightness = tokens[2], alpha = tokens[3], h = (hue.type === 17 /* TokenType.NUMBER_TOKEN */ ? (0, angle_1.deg)(hue.number) : angle_1.angle.parse(context, hue)) / (Math.PI * 2), s = (0, length_percentage_1.isLengthPercentage)(saturation) ? saturation.number / 100 : 0, l = (0, length_percentage_1.isLengthPercentage)(lightness) ? lightness.number / 100 : 0, a = typeof alpha !== 'undefined' && (0, length_percentage_1.isLengthPercentage)(alpha) ? (0, length_percentage_1.getAbsoluteValue)(alpha, 1) : 1;
    return [h, s, l, a];
};
exports.extractHslComponents = extractHslComponents;
var packHSL = function (context, args) {
    if ((0, exports.isRelativeTransform)(args)) {
        throw new Error('Relative color not supported for hsl()');
    }
    var _a = (0, exports.extractHslComponents)(context, args), h = _a[0], s = _a[1], l = _a[2], a = _a[3], rgb = hsl2rgb([h, s, l]);
    return (0, exports.pack)(rgb[0] * 255, rgb[1] * 255, rgb[2] * 255, s === 0 ? 1 : a);
};
exports.packHSL = packHSL;
var extractLchComponents = function (args) {
    var tokens = args.filter(parser_1.nonFunctionArgSeparator), l = (0, length_percentage_1.isLengthPercentage)(tokens[0]) ? tokens[0].number : 0, c = (0, length_percentage_1.isLengthPercentage)(tokens[1]) ? tokens[1].number : 0, h = (0, parser_1.isNumberToken)(tokens[2]) || (0, parser_1.isDimensionToken)(tokens[2]) ? tokens[2].number : 0, a = typeof tokens[4] !== 'undefined' && (0, length_percentage_1.isLengthPercentage)(tokens[4]) ? (0, length_percentage_1.getAbsoluteValue)(tokens[4], 1) : 1;
    return [l, c, h, a];
};
exports.extractLchComponents = extractLchComponents;
var extractLabComponents = function (args) {
    var tokens = args.filter(parser_1.nonFunctionArgSeparator), 
    // eslint-disable-next-line prettier/prettier
    l = tokens[0].type === 16 /* TokenType.PERCENTAGE_TOKEN */
        ? tokens[0].number / 100
        : (0, parser_1.isNumberToken)(tokens[0])
            ? tokens[0].number
            : 0, 
    // eslint-disable-next-line prettier/prettier
    a = tokens[1].type === 16 /* TokenType.PERCENTAGE_TOKEN */
        ? tokens[1].number / 100
        : (0, parser_1.isNumberToken)(tokens[1])
            ? tokens[1].number
            : 0, b = (0, parser_1.isNumberToken)(tokens[2]) || (0, parser_1.isDimensionToken)(tokens[2]) ? tokens[2].number : 0, alpha = typeof tokens[4] !== 'undefined' && (0, length_percentage_1.isLengthPercentage)(tokens[4]) ? (0, length_percentage_1.getAbsoluteValue)(tokens[4], 1) : 1;
    return [l, a, b, alpha];
};
exports.extractLabComponents = extractLabComponents;
var extractOkLchComponents = function (args) {
    var tokens = args.filter(parser_1.nonFunctionArgSeparator), 
    // eslint-disable-next-line prettier/prettier
    l = tokens[0].type === 16 /* TokenType.PERCENTAGE_TOKEN */
        ? tokens[0].number / 100
        : (0, parser_1.isNumberToken)(tokens[0])
            ? tokens[0].number
            : 0, 
    // eslint-disable-next-line prettier/prettier
    c = tokens[1].type === 16 /* TokenType.PERCENTAGE_TOKEN */
        ? tokens[1].number / 100
        : (0, parser_1.isNumberToken)(tokens[1])
            ? tokens[1].number
            : 0, h = (0, parser_1.isNumberToken)(tokens[2]) || (0, parser_1.isDimensionToken)(tokens[2]) ? tokens[2].number : 0, a = typeof tokens[4] !== 'undefined' && (0, length_percentage_1.isLengthPercentage)(tokens[4]) ? (0, length_percentage_1.getAbsoluteValue)(tokens[4], 1) : 1;
    return [l, c, h, a];
};
exports.extractOkLchComponents = extractOkLchComponents;
/**
 * Convert D65 to D50
 *
 * @param xyz
 */
var d65toD50 = function (xyz) {
    return (0, exports.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        1.0479297925449969, 0.022946870601609652, -0.05019226628920524, 0.02962780877005599, 0.9904344267538799,
        -0.017073799063418826, -0.009243040646204504, 0.015055191490298152, 0.7518742814281371
    ], xyz);
};
exports.d65toD50 = d65toD50;
/**
 * Convert D50 to D65
 *
 * @param xyz
 */
var d50toD65 = function (xyz) {
    return (0, exports.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        0.955473421488075, -0.02309845494876471, 0.06325924320057072, -0.0283697093338637, 1.0099953980813041,
        0.021041441191917323, 0.012314014864481998, -0.020507649298898964, 1.330365926242124
    ], xyz);
};
exports.d50toD65 = d50toD65;
var hue2rgb = function (t1, t2, hue) {
    if (hue < 0) {
        hue += 1;
    }
    if (hue >= 1) {
        hue -= 1;
    }
    if (hue < 1 / 6) {
        return (t2 - t1) * hue * 6 + t1;
    }
    else if (hue < 1 / 2) {
        return t2;
    }
    else if (hue < 2 / 3) {
        return (t2 - t1) * 6 * (2 / 3 - hue) + t1;
    }
    else {
        return t1;
    }
};
exports.hue2rgb = hue2rgb;
var hsl2rgb = function (_a) {
    var h = _a[0], s = _a[1], l = _a[2];
    if (s === 0) {
        return [l * 255, l * 255, l * 255];
    }
    var t2 = l <= 0.5 ? l * (s + 1) : l + s - l * s, t1 = l * 2 - t2, r = (0, exports.hue2rgb)(t1, t2, h + 1 / 3), g = (0, exports.hue2rgb)(t1, t2, h), b = (0, exports.hue2rgb)(t1, t2, h - 1 / 3);
    return [r, g, b];
};
/**
 * Convert lch to OKLab
 *
 * @param l
 * @param c
 * @param h
 */
var lch2lab = function (_a) {
    var l = _a[0], c = _a[1], h = _a[2];
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
var oklab2xyz = function (lab) {
    var LMSg = (0, exports.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        1, 0.3963377773761749, 0.2158037573099136, 1, -0.1055613458156586, -0.0638541728258133, 1,
        -0.0894841775298119, -1.2914855480194092
    ], lab), LMS = LMSg.map(function (val) { return Math.pow(val, 3); });
    return (0, exports.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        1.2268798758459243, -0.5578149944602171, 0.2813910456659647, -0.0405757452148008, 1.112286803280317,
        -0.0717110580655164, -0.0763729366746601, -0.4214933324022432, 1.5869240198367816
    ], LMS);
};
/**
 * Convert Lab to D50-adapted XYZ
 *
 * @param lab
 */
var lab2xyz = function (lab) {
    var fy = (lab[0] + 16) / 116, fx = lab[1] / 500 + fy, fz = fy - lab[2] / 200, k = 24389 / 27, e = 24 / 116, xyz = [
        ((fx > e ? Math.pow(fx, 3) : (116 * fx - 16) / k) * 0.3457) / 0.3585,
        lab[0] > 8 ? Math.pow(fy, 3) : lab[0] / k,
        ((fz > e ? Math.pow(fz, 3) : (116 * fz - 16) / k) * (1.0 - 0.3457 - 0.3585)) / 0.3585
    ];
    return (0, exports.d50toD65)([xyz[0], xyz[1], xyz[2]]);
};
/**
 * Convert RGB to XYZ
 *
 * @param _context
 * @param args
 */
var rgbToXyz = function (_context, args) {
    var tokens = args.filter(parser_1.nonFunctionArgSeparator);
    if (tokens.length === 3) {
        var _a = tokens.map(exports.getTokenColorValue), r = _a[0], g = _a[1], b = _a[2], rgb_linear = (0, srgb_1.rgb2rgbLinear)([r / 255, g / 255, b / 255]), _b = (0, srgb_1.rgbLinear2xyz)([rgb_linear[0], rgb_linear[1], rgb_linear[2]]), x = _b[0], y = _b[1], z = _b[2];
        return [x, y, z, 1];
    }
    if (tokens.length === 4) {
        var _c = tokens.map(exports.getTokenColorValue), r = _c[0], g = _c[1], b = _c[2], a = _c[3], rgb_linear = (0, srgb_1.rgb2rgbLinear)([r / 255, g / 255, b / 255]), _d = (0, srgb_1.rgbLinear2xyz)([rgb_linear[0], rgb_linear[1], rgb_linear[2]]), x = _d[0], y = _d[1], z = _d[2];
        return [x, y, z, a];
    }
    return [0, 0, 0, 1];
};
exports.rgbToXyz = rgbToXyz;
/**
 * HSL to XYZ
 *
 * @param context
 * @param args
 */
var hslToXyz = function (context, args) {
    var _a = (0, exports.extractHslComponents)(context, args), h = _a[0], s = _a[1], l = _a[2], a = _a[3], rgb_linear = (0, srgb_1.rgb2rgbLinear)(hsl2rgb([h, s, l])), _b = (0, srgb_1.rgbLinear2xyz)([rgb_linear[0], rgb_linear[1], rgb_linear[2]]), x = _b[0], y = _b[1], z = _b[2];
    return [x, y, z, a];
};
exports.hslToXyz = hslToXyz;
/**
 * LAB to XYZ
 *
 * @param _context
 * @param args
 */
var labToXyz = function (_context, args) {
    var _a = (0, exports.extractLabComponents)(args), l = _a[0], a = _a[1], b = _a[2], alpha = _a[3], _b = lab2xyz([l, a, b]), x = _b[0], y = _b[1], z = _b[2];
    return [x, y, z, alpha];
};
exports.labToXyz = labToXyz;
/**
 * LCH to XYZ
 *
 * @param _context
 * @param args
 */
var lchToXyz = function (_context, args) {
    var _a = (0, exports.extractLchComponents)(args), l = _a[0], c = _a[1], h = _a[2], alpha = _a[3], _b = lab2xyz(lch2lab([l, c, h])), x = _b[0], y = _b[1], z = _b[2];
    return [x, y, z, alpha];
};
exports.lchToXyz = lchToXyz;
/**
 * OKLch to XYZ
 *
 * @param _context
 * @param args
 */
var oklchToXyz = function (_context, args) {
    var _a = (0, exports.extractOkLchComponents)(args), l = _a[0], c = _a[1], h = _a[2], alpha = _a[3], _b = oklab2xyz(lch2lab([l, c, h])), x = _b[0], y = _b[1], z = _b[2];
    return [x, y, z, alpha];
};
exports.oklchToXyz = oklchToXyz;
/**
 * OKLab to XYZ
 *
 * @param _context
 * @param args
 */
var oklabToXyz = function (_context, args) {
    var _a = (0, exports.extractLabComponents)(args), l = _a[0], c = _a[1], h = _a[2], alpha = _a[3], _b = oklab2xyz([l, c, h]), x = _b[0], y = _b[1], z = _b[2];
    return [x, y, z, alpha];
};
exports.oklabToXyz = oklabToXyz;
/**
 * XYZ-50 to XYZ
 *
 * @param args
 */
var xyz50ToXYZ = function (args) {
    return (0, exports.d50toD65)([args[0], args[1], args[2]]);
};
exports.xyz50ToXYZ = xyz50ToXYZ;
/**
 * Does nothing, required for SUPPORTED_COLOR_SPACES_FROM_XYZ in the _color() function
 *
 * @param args
 */
var xyzFromXYZ = function (args) {
    return args;
};
exports.xyzFromXYZ = xyzFromXYZ;
/**
 * XYZ-65 to XYZ-50
 *
 * @param args
 */
var xyz50FromXYZ = function (args) {
    var _a = (0, exports.d65toD50)([args[0], args[2], args[3]]), x = _a[0], y = _a[1], z = _a[2];
    return [x, y, z, args[3]];
};
exports.xyz50FromXYZ = xyz50FromXYZ;
/**
 * Convert XYZ to SRGB and Pack
 *
 * @param args
 */
var convertXyz = function (args) {
    return (0, exports.packXYZ)([args[0], args[1], args[2], args[3]]);
};
exports.convertXyz = convertXyz;
/**
 * Convert XYZ-50 to SRGB and Pack
 *
 * @param args
 */
var convertXyz50 = function (args) {
    var xyz = (0, exports.xyz50ToXYZ)([args[0], args[1], args[2]]);
    return (0, exports.packXYZ)([xyz[0], xyz[1], xyz[2], args[3]]);
};
exports.convertXyz50 = convertXyz50;
//# sourceMappingURL=color-utilities.js.map