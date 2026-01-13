"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overflow = void 0;
var parser_1 = require("../syntax/parser");
exports.overflow = {
    name: 'overflow',
    initialValue: 'visible',
    prefix: false,
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    parse: function (_context, tokens) {
        return tokens.filter(parser_1.isIdentToken).map(function (overflow) {
            switch (overflow.value) {
                case 'hidden':
                    return 1 /* OVERFLOW.HIDDEN */;
                case 'scroll':
                    return 2 /* OVERFLOW.SCROLL */;
                case 'clip':
                    return 3 /* OVERFLOW.CLIP */;
                case 'auto':
                    return 4 /* OVERFLOW.AUTO */;
                case 'visible':
                default:
                    return 0 /* OVERFLOW.VISIBLE */;
            }
        });
    }
};
//# sourceMappingURL=overflow.js.map