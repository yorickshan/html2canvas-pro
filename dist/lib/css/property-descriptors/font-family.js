"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fontFamily = void 0;
exports.fontFamily = {
    name: "font-family",
    initialValue: '',
    prefix: false,
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    parse: function (_context, tokens) {
        var accumulator = [];
        var results = [];
        tokens.forEach(function (token) {
            switch (token.type) {
                case 20 /* TokenType.IDENT_TOKEN */:
                case 0 /* TokenType.STRING_TOKEN */:
                    accumulator.push(token.value);
                    break;
                case 17 /* TokenType.NUMBER_TOKEN */:
                    accumulator.push(token.number.toString());
                    break;
                case 4 /* TokenType.COMMA_TOKEN */:
                    results.push(accumulator.join(' '));
                    accumulator.length = 0;
                    break;
            }
        });
        if (accumulator.length) {
            results.push(accumulator.join(' '));
        }
        return results.map(function (result) { return (result.indexOf(' ') === -1 ? result : "'".concat(result, "'")); });
    }
};
//# sourceMappingURL=font-family.js.map