"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.float = void 0;
exports.float = {
    name: 'float',
    initialValue: 'none',
    prefix: false,
    type: 2 /* PropertyDescriptorParsingType.IDENT_VALUE */,
    parse: function (_context, float) {
        switch (float) {
            case 'left':
                return 1 /* FLOAT.LEFT */;
            case 'right':
                return 2 /* FLOAT.RIGHT */;
            case 'inline-start':
                return 3 /* FLOAT.INLINE_START */;
            case 'inline-end':
                return 4 /* FLOAT.INLINE_END */;
        }
        return 0 /* FLOAT.NONE */;
    }
};
//# sourceMappingURL=float.js.map