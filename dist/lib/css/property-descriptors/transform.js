"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = void 0;
exports.transform = {
    name: 'transform',
    initialValue: 'none',
    prefix: true,
    type: 0 /* PropertyDescriptorParsingType.VALUE */,
    parse: function (_context, token) {
        if (token.type === 20 /* TokenType.IDENT_TOKEN */ && token.value === 'none') {
            return null;
        }
        if (token.type === 18 /* TokenType.FUNCTION */) {
            var transformFunction = SUPPORTED_TRANSFORM_FUNCTIONS[token.name];
            if (typeof transformFunction === 'undefined') {
                throw new Error("Attempting to parse an unsupported transform function \"".concat(token.name, "\""));
            }
            return transformFunction(token.values);
        }
        return null;
    }
};
var matrix = function (args) {
    var values = args.filter(function (arg) { return arg.type === 17 /* TokenType.NUMBER_TOKEN */; }).map(function (arg) { return arg.number; });
    return values.length === 6 ? values : null;
};
// doesn't support 3D transforms at the moment
var matrix3d = function (args) {
    var values = args.filter(function (arg) { return arg.type === 17 /* TokenType.NUMBER_TOKEN */; }).map(function (arg) { return arg.number; });
    var a1 = values[0], b1 = values[1], _a = values[2], _b = values[3], a2 = values[4], b2 = values[5], _c = values[6], _d = values[7], _e = values[8], _f = values[9], _g = values[10], _h = values[11], a4 = values[12], b4 = values[13], _j = values[14], _k = values[15];
    return values.length === 16 ? [a1, b1, a2, b2, a4, b4] : null;
};
var SUPPORTED_TRANSFORM_FUNCTIONS = {
    matrix: matrix,
    matrix3d: matrix3d
};
//# sourceMappingURL=transform.js.map