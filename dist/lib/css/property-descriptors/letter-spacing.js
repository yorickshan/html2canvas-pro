"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.letterSpacing = void 0;
exports.letterSpacing = {
    name: 'letter-spacing',
    initialValue: '0',
    prefix: false,
    type: 0 /* PropertyDescriptorParsingType.VALUE */,
    parse: function (_context, token) {
        if (token.type === 20 /* TokenType.IDENT_TOKEN */ && token.value === 'normal') {
            return 0;
        }
        if (token.type === 17 /* TokenType.NUMBER_TOKEN */) {
            return token.number;
        }
        if (token.type === 15 /* TokenType.DIMENSION_TOKEN */) {
            return token.number;
        }
        return 0;
    }
};
//# sourceMappingURL=letter-spacing.js.map