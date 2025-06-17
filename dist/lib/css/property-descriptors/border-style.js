"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.borderLeftStyle = exports.borderBottomStyle = exports.borderRightStyle = exports.borderTopStyle = void 0;
var borderStyleForSide = function (side) { return ({
    name: "border-".concat(side, "-style"),
    initialValue: 'solid',
    prefix: false,
    type: 2 /* PropertyDescriptorParsingType.IDENT_VALUE */,
    parse: function (_context, style) {
        switch (style) {
            case 'none':
                return 0 /* BORDER_STYLE.NONE */;
            case 'dashed':
                return 2 /* BORDER_STYLE.DASHED */;
            case 'dotted':
                return 3 /* BORDER_STYLE.DOTTED */;
            case 'double':
                return 4 /* BORDER_STYLE.DOUBLE */;
        }
        return 1 /* BORDER_STYLE.SOLID */;
    }
}); };
exports.borderTopStyle = borderStyleForSide('top');
exports.borderRightStyle = borderStyleForSide('right');
exports.borderBottomStyle = borderStyleForSide('bottom');
exports.borderLeftStyle = borderStyleForSide('left');
//# sourceMappingURL=border-style.js.map