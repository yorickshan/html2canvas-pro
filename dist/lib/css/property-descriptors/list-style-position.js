"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStylePosition = void 0;
exports.listStylePosition = {
    name: 'list-style-position',
    initialValue: 'outside',
    prefix: false,
    type: 2 /* PropertyDescriptorParsingType.IDENT_VALUE */,
    parse: function (_context, position) {
        switch (position) {
            case 'inside':
                return 0 /* LIST_STYLE_POSITION.INSIDE */;
            case 'outside':
            default:
                return 1 /* LIST_STYLE_POSITION.OUTSIDE */;
        }
    }
};
//# sourceMappingURL=list-style-position.js.map