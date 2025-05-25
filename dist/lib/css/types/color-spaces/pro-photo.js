"use strict";
/**
 * Pro Photo related functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertProPhoto = exports.proPhotoFromXYZ = exports.proPhotoToXYZ = exports.proPhotoLinearToProPhoto = exports.proPhotoToProPhotoLinear = exports.xyzToProPhotoLinear = exports.proPhotoLinearToXyz = void 0;
var color_utilities_1 = require("../color-utilities");
/**
 * Convert linear-light display-p3 to XYZ D65
 *
 * @param p3
 */
var proPhotoLinearToXyz = function (p3) {
    return (0, color_utilities_1.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        0.7977666449006423, 0.13518129740053308, 0.0313477341283922, 0.2880748288194013, 0.711835234241873,
        0.00008993693872564, 0.0, 0.0, 0.8251046025104602
    ], p3);
};
exports.proPhotoLinearToXyz = proPhotoLinearToXyz;
/**
 * Convert XYZ D65 to linear-light display-p3
 *
 * @param xyz
 */
var xyzToProPhotoLinear = function (xyz) {
    return (0, color_utilities_1.multiplyMatrices)(
    // eslint-disable-next-line prettier/prettier
    [
        1.3457868816471583, -0.25557208737979464, -0.05110186497554526, -0.5446307051249019, 1.5082477428451468,
        0.02052744743642139, 0.0, 0.0, 1.2119675456389452
    ], xyz);
};
exports.xyzToProPhotoLinear = xyzToProPhotoLinear;
/**
 * Convert Pro-Photo to Pro-Photo Linear
 *
 * @param p3
 */
var proPhotoToProPhotoLinear = function (p3) {
    return p3.map(function (c) {
        return c < 16 / 512 ? c / 16 : Math.pow(c, 1.8);
    });
};
exports.proPhotoToProPhotoLinear = proPhotoToProPhotoLinear;
/**
 * Convert Pro-Photo Linear to Pro-Photo
 *
 * @param p3
 */
var proPhotoLinearToProPhoto = function (p3) {
    return p3.map(function (c) {
        return c > 1 / 512 ? Math.pow(c, (1 / 1.8)) : c * 16;
    });
};
exports.proPhotoLinearToProPhoto = proPhotoLinearToProPhoto;
/**
 * Convert Pro-Photo to XYZ
 *
 * @param args
 */
var proPhotoToXYZ = function (args) {
    var prophoto_linear = (0, exports.proPhotoToProPhotoLinear)([args[0], args[1], args[2]]);
    return (0, color_utilities_1.d50toD65)((0, exports.proPhotoLinearToXyz)([prophoto_linear[0], prophoto_linear[1], prophoto_linear[2]]));
};
exports.proPhotoToXYZ = proPhotoToXYZ;
/**
 * Convert XYZ to Pro-Photo
 *
 * @param args
 */
var proPhotoFromXYZ = function (args) {
    var _a = (0, exports.proPhotoLinearToProPhoto)((0, exports.xyzToProPhotoLinear)((0, color_utilities_1.d65toD50)([args[0], args[1], args[2]]))), r = _a[0], g = _a[1], b = _a[2];
    return [r, g, b, args[3]];
};
exports.proPhotoFromXYZ = proPhotoFromXYZ;
/**
 * Convert Pro-Photo to XYZ and Pack
 *
 * @param args
 */
var convertProPhoto = function (args) {
    var xyz = (0, exports.proPhotoToXYZ)([args[0], args[1], args[2]]);
    return (0, color_utilities_1.packXYZ)([xyz[0], xyz[1], xyz[2], args[3]]);
};
exports.convertProPhoto = convertProPhoto;
//# sourceMappingURL=pro-photo.js.map