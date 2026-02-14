"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLength = void 0;
var isLength = function (token) {
    return token.type === 17 /* TokenType.NUMBER_TOKEN */ || token.type === 15 /* TokenType.DIMENSION_TOKEN */;
};
exports.isLength = isLength;
//# sourceMappingURL=length.js.map