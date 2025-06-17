"use strict";
/**
 * Display-P3 related functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertP3 = exports.p3FromXYZ = exports.p3ToXYZ = exports.p3Linear2p3 = exports.p32p3Linear = exports.xyzToP3Linear = exports.p3LinearToXyz = void 0;
var srgb_1 = require("./srgb");
var color_utilities_1 = require("../color-utilities");
/**
 * Convert P3 Linear to xyz
 *
 * @param p3l
 */
var p3LinearToXyz = function (p3l) {
    return (0, color_utilities_1.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        0.4865709486482162, 0.26566769316909306, 0.1982172852343625, 0.2289745640697488, 0.6917385218365064,
        0.079286914093745, 0.0, 0.04511338185890264, 1.043944368900976
    ], p3l);
};
exports.p3LinearToXyz = p3LinearToXyz;
/**
 * Convert XYZ to P3 Linear
 *
 * @param xyz
 */
var xyzToP3Linear = function (xyz) {
    return (0, color_utilities_1.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        2.493496911941425, -0.9313836179191239, -0.40271078445071684, -0.8294889695615747, 1.7626640603183463,
        0.023624685841943577, 0.03584583024378447, -0.07617238926804182, 0.9568845240076872
    ], xyz);
};
exports.xyzToP3Linear = xyzToP3Linear;
/**
 * Convert P3 to P3 linear
 *
 * @param p3
 */
var p32p3Linear = function (p3) {
    return p3.map(function (c) {
        var sign = c < 0 ? -1 : 1, abs = c * sign;
        if (abs <= 0.04045) {
            return c / 12.92;
        }
        // eslint-disable-next-line prettier/prettier
        return sign * Math.pow(((c + 0.055) / 1.055), 2.4) || 0;
    });
};
exports.p32p3Linear = p32p3Linear;
/**
 * Convert P3 Linear to P3
 *
 * @param p3l
 */
var p3Linear2p3 = function (p3l) {
    return (0, srgb_1.srgbLinear2rgb)(p3l);
};
exports.p3Linear2p3 = p3Linear2p3;
/**
 * Convert P3 to XYZ
 *
 * @param args
 */
var p3ToXYZ = function (args) {
    var p3_linear = (0, exports.p32p3Linear)([args[0], args[1], args[2]]);
    return (0, exports.p3LinearToXyz)([p3_linear[0], p3_linear[1], p3_linear[2]]);
};
exports.p3ToXYZ = p3ToXYZ;
/**
 * Convert XYZ to P3
 *
 * @param args
 */
var p3FromXYZ = function (args) {
    var _a = (0, exports.p3Linear2p3)((0, exports.xyzToP3Linear)([args[0], args[1], args[2]])), r = _a[0], g = _a[1], b = _a[2];
    return [r, g, b, args[3]];
};
exports.p3FromXYZ = p3FromXYZ;
/**
 * Convert P3 to SRGB and Pack
 *
 * @param args
 */
var convertP3 = function (args) {
    var xyz = (0, exports.p3ToXYZ)([args[0], args[1], args[2]]);
    return (0, color_utilities_1.packXYZ)([xyz[0], xyz[1], xyz[2], args[3]]);
};
exports.convertP3 = convertP3;
//# sourceMappingURL=p3.js.map