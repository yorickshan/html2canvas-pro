"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textTransform = void 0;
exports.textTransform = {
    name: 'text-transform',
    initialValue: 'none',
    prefix: false,
    type: 2 /* PropertyDescriptorParsingType.IDENT_VALUE */,
    parse: function (_context, textTransform) {
        switch (textTransform) {
            case 'uppercase':
                return 2 /* TEXT_TRANSFORM.UPPERCASE */;
            case 'lowercase':
                return 1 /* TEXT_TRANSFORM.LOWERCASE */;
            case 'capitalize':
                return 3 /* TEXT_TRANSFORM.CAPITALIZE */;
        }
        return 0 /* TEXT_TRANSFORM.NONE */;
    }
};
//# sourceMappingURL=text-transform.js.map