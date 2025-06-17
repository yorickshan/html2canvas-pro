"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeLineHeight = exports.lineHeight = void 0;
var parser_1 = require("../syntax/parser");
var length_percentage_1 = require("../types/length-percentage");
exports.lineHeight = {
    name: 'line-height',
    initialValue: 'normal',
    prefix: false,
    type: 4 /* PropertyDescriptorParsingType.TOKEN_VALUE */
};
var computeLineHeight = function (token, fontSize) {
    if ((0, parser_1.isIdentToken)(token) && token.value === 'normal') {
        return 1.2 * fontSize;
    }
    else if (token.type === 17 /* TokenType.NUMBER_TOKEN */) {
        return fontSize * token.number;
    }
    else if ((0, length_percentage_1.isLengthPercentage)(token)) {
        return (0, length_percentage_1.getAbsoluteValue)(token, fontSize);
    }
    return fontSize;
};
exports.computeLineHeight = computeLineHeight;
//# sourceMappingURL=line-height.js.map