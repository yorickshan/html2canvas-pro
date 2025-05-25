"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.radialGradient = exports.CONTAIN = exports.COVER = exports.ELLIPSE = exports.CIRCLE = exports.FARTHEST_CORNER = exports.CLOSEST_CORNER = exports.FARTHEST_SIDE = exports.CLOSEST_SIDE = void 0;
var parser_1 = require("../../syntax/parser");
var gradient_1 = require("./gradient");
var length_percentage_1 = require("../length-percentage");
var length_1 = require("../length");
exports.CLOSEST_SIDE = 'closest-side';
exports.FARTHEST_SIDE = 'farthest-side';
exports.CLOSEST_CORNER = 'closest-corner';
exports.FARTHEST_CORNER = 'farthest-corner';
exports.CIRCLE = 'circle';
exports.ELLIPSE = 'ellipse';
exports.COVER = 'cover';
exports.CONTAIN = 'contain';
var radialGradient = function (context, tokens) {
    var shape = 0 /* CSSRadialShape.CIRCLE */;
    var size = 3 /* CSSRadialExtent.FARTHEST_CORNER */;
    var stops = [];
    var position = [];
    (0, parser_1.parseFunctionArgs)(tokens).forEach(function (arg, i) {
        var isColorStop = true;
        if (i === 0) {
            var isAtPosition_1 = false;
            isColorStop = arg.reduce(function (acc, token) {
                if (isAtPosition_1) {
                    if ((0, parser_1.isIdentToken)(token)) {
                        switch (token.value) {
                            case 'center':
                                position.push(length_percentage_1.FIFTY_PERCENT);
                                return acc;
                            case 'top':
                            case 'left':
                                position.push(length_percentage_1.ZERO_LENGTH);
                                return acc;
                            case 'right':
                            case 'bottom':
                                position.push(length_percentage_1.HUNDRED_PERCENT);
                                return acc;
                        }
                    }
                    else if ((0, length_percentage_1.isLengthPercentage)(token) || (0, length_1.isLength)(token)) {
                        position.push(token);
                    }
                }
                else if ((0, parser_1.isIdentToken)(token)) {
                    switch (token.value) {
                        case exports.CIRCLE:
                            shape = 0 /* CSSRadialShape.CIRCLE */;
                            return false;
                        case exports.ELLIPSE:
                            shape = 1 /* CSSRadialShape.ELLIPSE */;
                            return false;
                        case 'at':
                            isAtPosition_1 = true;
                            return false;
                        case exports.CLOSEST_SIDE:
                            size = 0 /* CSSRadialExtent.CLOSEST_SIDE */;
                            return false;
                        case exports.COVER:
                        case exports.FARTHEST_SIDE:
                            size = 1 /* CSSRadialExtent.FARTHEST_SIDE */;
                            return false;
                        case exports.CONTAIN:
                        case exports.CLOSEST_CORNER:
                            size = 2 /* CSSRadialExtent.CLOSEST_CORNER */;
                            return false;
                        case exports.FARTHEST_CORNER:
                            size = 3 /* CSSRadialExtent.FARTHEST_CORNER */;
                            return false;
                    }
                }
                else if ((0, length_1.isLength)(token) || (0, length_percentage_1.isLengthPercentage)(token)) {
                    if (!Array.isArray(size)) {
                        size = [];
                    }
                    size.push(token);
                    return false;
                }
                return acc;
            }, isColorStop);
        }
        if (isColorStop) {
            var colorStop = (0, gradient_1.parseColorStop)(context, arg);
            stops.push(colorStop);
        }
    });
    return { size: size, shape: shape, stops: stops, position: position, type: 2 /* CSSImageType.RADIAL_GRADIENT */ };
};
exports.radialGradient = radialGradient;
//# sourceMappingURL=radial-gradient.js.map