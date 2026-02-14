"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectFit = void 0;
var parser_1 = require("../syntax/parser");
exports.objectFit = {
    name: 'objectFit',
    initialValue: 'fill',
    prefix: false,
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    parse: function (_context, tokens) {
        return tokens.filter(parser_1.isIdentToken).reduce(function (bit, token) {
            return bit | parseDisplayValue(token.value);
        }, 0 /* OBJECT_FIT.FILL */);
    }
};
var parseDisplayValue = function (display) {
    switch (display) {
        case 'contain':
            return 2 /* OBJECT_FIT.CONTAIN */;
        case 'cover':
            return 4 /* OBJECT_FIT.COVER */;
        case 'none':
            return 8 /* OBJECT_FIT.NONE */;
        case 'scale-down':
            return 16 /* OBJECT_FIT.SCALE_DOWN */;
    }
    return 0 /* OBJECT_FIT.FILL */;
};
//# sourceMappingURL=object-fit.js.map