"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.display = void 0;
var parser_1 = require("../syntax/parser");
exports.display = {
    name: 'display',
    initialValue: 'inline-block',
    prefix: false,
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    parse: function (_context, tokens) {
        return tokens.filter(parser_1.isIdentToken).reduce(function (bit, token) {
            return bit | parseDisplayValue(token.value);
        }, 0 /* DISPLAY.NONE */);
    }
};
var parseDisplayValue = function (display) {
    switch (display) {
        case 'block':
        case '-webkit-box':
            return 2 /* DISPLAY.BLOCK */;
        case 'inline':
            return 4 /* DISPLAY.INLINE */;
        case 'run-in':
            return 8 /* DISPLAY.RUN_IN */;
        case 'flow':
            return 16 /* DISPLAY.FLOW */;
        case 'flow-root':
            return 32 /* DISPLAY.FLOW_ROOT */;
        case 'table':
            return 64 /* DISPLAY.TABLE */;
        case 'flex':
        case '-webkit-flex':
            return 128 /* DISPLAY.FLEX */;
        case 'grid':
        case '-ms-grid':
            return 256 /* DISPLAY.GRID */;
        case 'ruby':
            return 512 /* DISPLAY.RUBY */;
        case 'subgrid':
            return 1024 /* DISPLAY.SUBGRID */;
        case 'list-item':
            return 2048 /* DISPLAY.LIST_ITEM */;
        case 'table-row-group':
            return 4096 /* DISPLAY.TABLE_ROW_GROUP */;
        case 'table-header-group':
            return 8192 /* DISPLAY.TABLE_HEADER_GROUP */;
        case 'table-footer-group':
            return 16384 /* DISPLAY.TABLE_FOOTER_GROUP */;
        case 'table-row':
            return 32768 /* DISPLAY.TABLE_ROW */;
        case 'table-cell':
            return 65536 /* DISPLAY.TABLE_CELL */;
        case 'table-column-group':
            return 131072 /* DISPLAY.TABLE_COLUMN_GROUP */;
        case 'table-column':
            return 262144 /* DISPLAY.TABLE_COLUMN */;
        case 'table-caption':
            return 524288 /* DISPLAY.TABLE_CAPTION */;
        case 'ruby-base':
            return 1048576 /* DISPLAY.RUBY_BASE */;
        case 'ruby-text':
            return 2097152 /* DISPLAY.RUBY_TEXT */;
        case 'ruby-base-container':
            return 4194304 /* DISPLAY.RUBY_BASE_CONTAINER */;
        case 'ruby-text-container':
            return 8388608 /* DISPLAY.RUBY_TEXT_CONTAINER */;
        case 'contents':
            return 16777216 /* DISPLAY.CONTENTS */;
        case 'inline-block':
            return 33554432 /* DISPLAY.INLINE_BLOCK */;
        case 'inline-list-item':
            return 67108864 /* DISPLAY.INLINE_LIST_ITEM */;
        case 'inline-table':
            return 134217728 /* DISPLAY.INLINE_TABLE */;
        case 'inline-flex':
            return 268435456 /* DISPLAY.INLINE_FLEX */;
        case 'inline-grid':
            return 536870912 /* DISPLAY.INLINE_GRID */;
    }
    return 0 /* DISPLAY.NONE */;
};
//# sourceMappingURL=display.js.map