"use strict";
/**
 * A98-RGB related functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertA98rgb = exports.a98FromXYZ = exports.a98Linear2a98 = exports.a982a98Linear = exports.a98Linear2xyz = exports.xyz2a98Linear = void 0;
var color_utilities_1 = require("../color-utilities");
var srgb_1 = require("./srgb");
/**
 * Convert XYZ to a98 linear
 *
 * @param xyz
 */
var xyz2a98Linear = function (xyz) {
    return (0, color_utilities_1.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        2.0415879038107465, -0.5650069742788596, -0.34473135077832956, -0.9692436362808795, 1.8759675015077202,
        0.04155505740717557, 0.013444280632031142, -0.11836239223101838, 1.0151749943912054
    ], xyz);
};
exports.xyz2a98Linear = xyz2a98Linear;
/**
 * Convert XYZ to a98 linear
 *
 * @param a98
 */
var a98Linear2xyz = function (a98) {
    return (0, color_utilities_1.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        0.5766690429101305, 0.1855582379065463, 0.1882286462349947, 0.29734497525053605, 0.6273635662554661,
        0.0752914584939978, 0.02703136138641234, 0.07068885253582723, 0.9913375368376388
    ], a98);
};
exports.a98Linear2xyz = a98Linear2xyz;
/**
 * Convert A98 RGB to rgb linear
 *
 * @param rgb
 */
var a982a98Linear = function (rgb) {
    var mapped = rgb.map(function (c) {
        var sign = c < 0 ? -1 : 1, abs = Math.abs(c);
        return sign * Math.pow(abs, (563 / 256));
    });
    return [mapped[0], mapped[1], mapped[2]];
};
exports.a982a98Linear = a982a98Linear;
/**
 * Convert A98 RGB Linear to A98
 *
 * @param rgb
 */
var a98Linear2a98 = function (rgb) {
    var mapped = rgb.map(function (c) {
        var sign = c < 0 ? -1 : 1, abs = Math.abs(c);
        return sign * Math.pow(abs, (256 / 563));
    });
    return [mapped[0], mapped[1], mapped[2]];
};
exports.a98Linear2a98 = a98Linear2a98;
/**
 * Convert XYZ to A98
 *
 * @param args
 */
var a98FromXYZ = function (args) {
    var _a = (0, exports.a98Linear2a98)((0, exports.xyz2a98Linear)([args[0], args[1], args[2]])), r = _a[0], g = _a[1], b = _a[2];
    return [r, g, b, args[3]];
};
exports.a98FromXYZ = a98FromXYZ;
/**
 * Convert A98 to XYZ and Pack
 *
 * @param args
 */
var convertA98rgb = function (args) {
    var srgb_linear = (0, srgb_1.xyz2rgbLinear)((0, exports.a98Linear2xyz)((0, exports.a982a98Linear)([args[0], args[1], args[2]])));
    return (0, color_utilities_1.packSrgbLinear)([srgb_linear[0], srgb_linear[1], srgb_linear[2], args[3]]);
};
exports.convertA98rgb = convertA98rgb;
//# sourceMappingURL=a98.js.map