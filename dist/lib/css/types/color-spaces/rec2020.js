"use strict";
/**
 * REC2020 related functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertRec2020 = exports.rec2020FromXYZ = exports.rec2020ToXYZ = exports.xyzToRec2020Linear = exports.rec2020LinearToXyz = exports.rec2020Linear2rec2020 = exports.rec20202rec2020Linear = void 0;
var color_utilities_1 = require("../color-utilities");
var _a = 1.09929682680944;
var _b = 0.018053968510807;
/**
 * Convert rec2020 to rec2020 linear
 *
 * @param rgb
 */
var rec20202rec2020Linear = function (rgb) {
    return rgb.map(function (c) {
        return c < _b * 4.5 ? c / 4.5 : Math.pow((c + _a - 1) / _a, 1 / 0.45);
    });
};
exports.rec20202rec2020Linear = rec20202rec2020Linear;
/**
 * Convert rec2020 linear to rec2020
 *
 * @param rgb
 */
var rec2020Linear2rec2020 = function (rgb) {
    return rgb.map(function (c) {
        return c >= _b ? _a * Math.pow(c, 0.45) - (_a - 1) : 4.5 * c;
    });
};
exports.rec2020Linear2rec2020 = rec2020Linear2rec2020;
/**
 * Convert rec2020 linear to XYZ D65
 *
 * @param rec
 */
var rec2020LinearToXyz = function (rec) {
    return (0, color_utilities_1.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        0.6369580483012914, 0.14461690358620832, 0.1688809751641721, 0.2627002120112671, 0.6779980715188708,
        0.05930171646986196, 0.0, 0.028072693049087428, 1.060985057710791
    ], rec);
};
exports.rec2020LinearToXyz = rec2020LinearToXyz;
/**
 * Convert XYZ D65 to rec2020 linear
 *
 * @param xyz
 */
var xyzToRec2020Linear = function (xyz) {
    return (0, color_utilities_1.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        1.716651187971268, -0.355670783776392, -0.25336628137366, -0.666684351832489, 1.616481236634939,
        0.0157685458139111, 0.017639857445311, -0.042770613257809, 0.942103121235474
    ], xyz);
};
exports.xyzToRec2020Linear = xyzToRec2020Linear;
/**
 * Convert Rec2020 to XYZ
 *
 * @param args
 */
var rec2020ToXYZ = function (args) {
    var rec2020_linear = (0, exports.rec20202rec2020Linear)([args[0], args[1], args[2]]);
    return (0, exports.rec2020LinearToXyz)([rec2020_linear[0], rec2020_linear[1], rec2020_linear[2]]);
};
exports.rec2020ToXYZ = rec2020ToXYZ;
/**
 * Convert XYZ to Rec2020
 *
 * @param args
 */
var rec2020FromXYZ = function (args) {
    var _c = (0, exports.rec2020Linear2rec2020)((0, exports.xyzToRec2020Linear)([args[0], args[1], args[2]])), r = _c[0], g = _c[1], b = _c[2];
    return [r, g, b, args[3]];
};
exports.rec2020FromXYZ = rec2020FromXYZ;
/**
 * Convert Rec2020 to SRGB and Pack
 *
 * @param args
 */
var convertRec2020 = function (args) {
    var xyz = (0, exports.rec2020ToXYZ)([args[0], args[1], args[2]]);
    return (0, color_utilities_1.packXYZ)([xyz[0], xyz[1], xyz[2], args[3]]);
};
exports.convertRec2020 = convertRec2020;
//# sourceMappingURL=rec2020.js.map