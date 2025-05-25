"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zIndex = void 0;
var parser_1 = require("../syntax/parser");
exports.zIndex = {
    name: 'z-index',
    initialValue: 'auto',
    prefix: false,
    type: 0 /* PropertyDescriptorParsingType.VALUE */,
    parse: function (_context, token) {
        if (token.type === 20 /* TokenType.IDENT_TOKEN */) {
            return { auto: true, order: 0 };
        }
        if ((0, parser_1.isNumberToken)(token)) {
            return { auto: false, order: token.number };
        }
        throw new Error("Invalid z-index number parsed");
    }
};
//# sourceMappingURL=z-index.js.map