"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backgroundRepeat = void 0;
var parser_1 = require("../syntax/parser");
exports.backgroundRepeat = {
    name: 'background-repeat',
    initialValue: 'repeat',
    prefix: false,
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    parse: function (_context, tokens) {
        return (0, parser_1.parseFunctionArgs)(tokens)
            .map(function (values) {
            return values
                .filter(parser_1.isIdentToken)
                .map(function (token) { return token.value; })
                .join(' ');
        })
            .map(parseBackgroundRepeat);
    }
};
var parseBackgroundRepeat = function (value) {
    switch (value) {
        case 'no-repeat':
            return 1 /* BACKGROUND_REPEAT.NO_REPEAT */;
        case 'repeat-x':
        case 'repeat no-repeat':
            return 2 /* BACKGROUND_REPEAT.REPEAT_X */;
        case 'repeat-y':
        case 'no-repeat repeat':
            return 3 /* BACKGROUND_REPEAT.REPEAT_Y */;
        case 'repeat':
        default:
            return 0 /* BACKGROUND_REPEAT.REPEAT */;
    }
};
//# sourceMappingURL=background-repeat.js.map