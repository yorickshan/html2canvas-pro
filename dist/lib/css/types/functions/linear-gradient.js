"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linearGradient = void 0;
var parser_1 = require("../../syntax/parser");
var angle_1 = require("../angle");
var gradient_1 = require("./gradient");
var linearGradient = function (context, tokens) {
    var angle = (0, angle_1.deg)(180);
    var stops = [];
    (0, parser_1.parseFunctionArgs)(tokens).forEach(function (arg, i) {
        if (i === 0) {
            var firstToken = arg[0];
            if (firstToken.type === 20 /* TokenType.IDENT_TOKEN */ && firstToken.value === 'to') {
                angle = (0, angle_1.parseNamedSide)(arg);
                return;
            }
            else if ((0, angle_1.isAngle)(firstToken)) {
                angle = angle_1.angle.parse(context, firstToken);
                return;
            }
        }
        var colorStop = (0, gradient_1.parseColorStop)(context, arg);
        stops.push(colorStop);
    });
    return { angle: angle, stops: stops, type: 1 /* CSSImageType.LINEAR_GRADIENT */ };
};
exports.linearGradient = linearGradient;
//# sourceMappingURL=linear-gradient.js.map