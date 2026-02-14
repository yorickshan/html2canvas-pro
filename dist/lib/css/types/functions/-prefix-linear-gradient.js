"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prefixLinearGradient = void 0;
var parser_1 = require("../../syntax/parser");
var angle_1 = require("../angle");
var gradient_1 = require("./gradient");
var prefixLinearGradient = function (context, tokens) {
    var angle = (0, angle_1.deg)(180);
    var stops = [];
    (0, parser_1.parseFunctionArgs)(tokens).forEach(function (arg, i) {
        if (i === 0) {
            var firstToken = arg[0];
            if (firstToken.type === 20 /* TokenType.IDENT_TOKEN */ &&
                ['top', 'left', 'right', 'bottom'].indexOf(firstToken.value) !== -1) {
                angle = (0, angle_1.parseNamedSide)(arg);
                return;
            }
            else if ((0, angle_1.isAngle)(firstToken)) {
                angle = (angle_1.angle.parse(context, firstToken) + (0, angle_1.deg)(270)) % (0, angle_1.deg)(360);
                return;
            }
        }
        var colorStop = (0, gradient_1.parseColorStop)(context, arg);
        stops.push(colorStop);
    });
    return {
        angle: angle,
        stops: stops,
        type: 1 /* CSSImageType.LINEAR_GRADIENT */
    };
};
exports.prefixLinearGradient = prefixLinearGradient;
//# sourceMappingURL=-prefix-linear-gradient.js.map