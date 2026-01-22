"use strict";
/**
 * SRGB related functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.srgbLinearFromXYZ = exports.srgbFromXYZ = exports.rgb2rgbLinear = exports.srgbLinear2rgb = exports.rgbLinear2xyz = exports.xyz2rgbLinear = void 0;
var color_utilities_1 = require("../color-utilities");
/**
 * Convert XYZ to linear-light sRGB
 *
 * @param xyz
 */
var xyz2rgbLinear = function (xyz) {
    return (0, color_utilities_1.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        3.2409699419045226, -1.537383177570094, -0.4986107602930034, -0.9692436362808796, 1.8759675015077202,
        0.04155505740717559, 0.05563007969699366, -0.20397695888897652, 1.0569715142428786
    ], xyz);
};
exports.xyz2rgbLinear = xyz2rgbLinear;
/**
 * Convert XYZ to linear-light sRGB
 *
 * @param xyz
 */
var rgbLinear2xyz = function (xyz) {
    return (0, color_utilities_1.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        0.41239079926595934, 0.357584339383878, 0.1804807884018343, 0.21263900587151027, 0.715168678767756,
        0.07219231536073371, 0.01933081871559182, 0.11919477979462598, 0.9505321522496607
    ], xyz);
};
exports.rgbLinear2xyz = rgbLinear2xyz;
/**
 * Convert sRGB to RGB
 *
 * @param rgb
 */
var srgbLinear2rgb = function (rgb) {
    return rgb.map(function (c) {
        var sign = c < 0 ? -1 : 1, abs = Math.abs(c);
        // eslint-disable-next-line prettier/prettier
        return abs > 0.0031308 ? sign * (1.055 * Math.pow(abs, (1 / 2.4)) - 0.055) : 12.92 * c;
    });
};
exports.srgbLinear2rgb = srgbLinear2rgb;
/**
 * Convert RGB to sRGB
 *
 * @param rgb
 */
var rgb2rgbLinear = function (rgb) {
    return rgb.map(function (c) {
        var sign = c < 0 ? -1 : 1, abs = Math.abs(c);
        // eslint-disable-next-line prettier/prettier
        return abs <= 0.04045 ? c / 12.92 : sign * Math.pow(((abs + 0.055) / 1.055), 2.4);
    });
};
exports.rgb2rgbLinear = rgb2rgbLinear;
/**
 * XYZ to SRGB
 *
 * @param args
 */
var srgbFromXYZ = function (args) {
    var _a = (0, exports.srgbLinear2rgb)((0, exports.xyz2rgbLinear)([args[0], args[1], args[2]])), r = _a[0], g = _a[1], b = _a[2];
    return [r, g, b, args[3]];
};
exports.srgbFromXYZ = srgbFromXYZ;
/**
 * XYZ to SRGB-Linear
 * @param args
 */
var srgbLinearFromXYZ = function (args) {
    var _a = (0, exports.xyz2rgbLinear)([args[0], args[1], args[2]]), r = _a[0], g = _a[1], b = _a[2];
    return [
        (0, color_utilities_1.clamp)(Math.round(r * 255), 0, 255),
        (0, color_utilities_1.clamp)(Math.round(g * 255), 0, 255),
        (0, color_utilities_1.clamp)(Math.round(b * 255), 0, 255),
        args[3]
    ];
};
exports.srgbLinearFromXYZ = srgbLinearFromXYZ;
//# sourceMappingURL=srgb.js.map