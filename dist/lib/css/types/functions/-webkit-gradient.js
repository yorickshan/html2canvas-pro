"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webkitGradient = void 0;
var parser_1 = require("../../syntax/parser");
var angle_1 = require("../angle");
var color_1 = require("../color");
var length_percentage_1 = require("../length-percentage");
var webkitGradient = function (context, tokens) {
    var angle = (0, angle_1.deg)(180);
    var stops = [];
    var type = 1 /* CSSImageType.LINEAR_GRADIENT */;
    var shape = 0 /* CSSRadialShape.CIRCLE */;
    var size = 3 /* CSSRadialExtent.FARTHEST_CORNER */;
    var position = [];
    (0, parser_1.parseFunctionArgs)(tokens).forEach(function (arg, i) {
        var firstToken = arg[0];
        if (i === 0) {
            if ((0, parser_1.isIdentToken)(firstToken) && firstToken.value === 'linear') {
                type = 1 /* CSSImageType.LINEAR_GRADIENT */;
                return;
            }
            else if ((0, parser_1.isIdentToken)(firstToken) && firstToken.value === 'radial') {
                type = 2 /* CSSImageType.RADIAL_GRADIENT */;
                return;
            }
        }
        if (firstToken.type === 18 /* TokenType.FUNCTION */) {
            if (firstToken.name === 'from') {
                var color = color_1.color.parse(context, firstToken.values[0]);
                stops.push({ stop: length_percentage_1.ZERO_LENGTH, color: color });
            }
            else if (firstToken.name === 'to') {
                var color = color_1.color.parse(context, firstToken.values[0]);
                stops.push({ stop: length_percentage_1.HUNDRED_PERCENT, color: color });
            }
            else if (firstToken.name === 'color-stop') {
                var values = firstToken.values.filter(parser_1.nonFunctionArgSeparator);
                if (values.length === 2) {
                    var color = color_1.color.parse(context, values[1]);
                    var stop_1 = values[0];
                    if ((0, parser_1.isNumberToken)(stop_1)) {
                        stops.push({
                            stop: { type: 16 /* TokenType.PERCENTAGE_TOKEN */, number: stop_1.number * 100, flags: stop_1.flags },
                            color: color
                        });
                    }
                }
            }
        }
    });
    return type === 1 /* CSSImageType.LINEAR_GRADIENT */
        ? {
            angle: (angle + (0, angle_1.deg)(180)) % (0, angle_1.deg)(360),
            stops: stops,
            type: type
        }
        : { size: size, shape: shape, stops: stops, position: position, type: type };
};
exports.webkitGradient = webkitGradient;
//# sourceMappingURL=-webkit-gradient.js.map