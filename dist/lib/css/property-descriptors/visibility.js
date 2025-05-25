"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visibility = void 0;
exports.visibility = {
    name: 'visible',
    initialValue: 'none',
    prefix: false,
    type: 2 /* PropertyDescriptorParsingType.IDENT_VALUE */,
    parse: function (_context, visibility) {
        switch (visibility) {
            case 'hidden':
                return 1 /* VISIBILITY.HIDDEN */;
            case 'collapse':
                return 2 /* VISIBILITY.COLLAPSE */;
            case 'visible':
            default:
                return 0 /* VISIBILITY.VISIBLE */;
        }
    }
};
//# sourceMappingURL=visibility.js.map