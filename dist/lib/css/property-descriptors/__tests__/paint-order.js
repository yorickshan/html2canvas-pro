"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var assert_1 = require("assert");
var parser_1 = require("../../syntax/parser");
var paint_order_1 = require("../paint-order");
var paintOrderParse = function (value) { return paint_order_1.paintOrder.parse({}, parser_1.Parser.parseValues(value)); };
describe('property-descriptors', function () {
    describe('paint-order', function () {
        it('none', function () {
            return (0, assert_1.deepStrictEqual)(paintOrderParse('none'), [
                0 /* PAINT_ORDER_LAYER.FILL */,
                1 /* PAINT_ORDER_LAYER.STROKE */,
                2 /* PAINT_ORDER_LAYER.MARKERS */
            ]);
        });
        it('EMPTY', function () {
            return (0, assert_1.deepStrictEqual)(paintOrderParse(''), [
                0 /* PAINT_ORDER_LAYER.FILL */,
                1 /* PAINT_ORDER_LAYER.STROKE */,
                2 /* PAINT_ORDER_LAYER.MARKERS */
            ]);
        });
        it('other values', function () {
            return (0, assert_1.deepStrictEqual)(paintOrderParse('other values'), [
                0 /* PAINT_ORDER_LAYER.FILL */,
                1 /* PAINT_ORDER_LAYER.STROKE */,
                2 /* PAINT_ORDER_LAYER.MARKERS */
            ]);
        });
        it('normal', function () {
            return (0, assert_1.deepStrictEqual)(paintOrderParse('normal'), [
                0 /* PAINT_ORDER_LAYER.FILL */,
                1 /* PAINT_ORDER_LAYER.STROKE */,
                2 /* PAINT_ORDER_LAYER.MARKERS */
            ]);
        });
        it('stroke', function () {
            return (0, assert_1.deepStrictEqual)(paintOrderParse('stroke'), [
                1 /* PAINT_ORDER_LAYER.STROKE */,
                0 /* PAINT_ORDER_LAYER.FILL */,
                2 /* PAINT_ORDER_LAYER.MARKERS */
            ]);
        });
        it('fill', function () {
            return (0, assert_1.deepStrictEqual)(paintOrderParse('fill'), [
                0 /* PAINT_ORDER_LAYER.FILL */,
                1 /* PAINT_ORDER_LAYER.STROKE */,
                2 /* PAINT_ORDER_LAYER.MARKERS */
            ]);
        });
        it('markers', function () {
            return (0, assert_1.deepStrictEqual)(paintOrderParse('markers'), [
                2 /* PAINT_ORDER_LAYER.MARKERS */,
                0 /* PAINT_ORDER_LAYER.FILL */,
                1 /* PAINT_ORDER_LAYER.STROKE */
            ]);
        });
        it('stroke fill', function () {
            return (0, assert_1.deepStrictEqual)(paintOrderParse('stroke fill'), [
                1 /* PAINT_ORDER_LAYER.STROKE */,
                0 /* PAINT_ORDER_LAYER.FILL */,
                2 /* PAINT_ORDER_LAYER.MARKERS */
            ]);
        });
        it('markers stroke', function () {
            return (0, assert_1.deepStrictEqual)(paintOrderParse('markers stroke'), [
                2 /* PAINT_ORDER_LAYER.MARKERS */,
                1 /* PAINT_ORDER_LAYER.STROKE */,
                0 /* PAINT_ORDER_LAYER.FILL */
            ]);
        });
        it('markers stroke fill', function () {
            return (0, assert_1.deepStrictEqual)(paintOrderParse('markers stroke fill'), [
                2 /* PAINT_ORDER_LAYER.MARKERS */,
                1 /* PAINT_ORDER_LAYER.STROKE */,
                0 /* PAINT_ORDER_LAYER.FILL */
            ]);
        });
        it('stroke fill markers', function () {
            return (0, assert_1.deepStrictEqual)(paintOrderParse('stroke fill markers'), [
                1 /* PAINT_ORDER_LAYER.STROKE */,
                0 /* PAINT_ORDER_LAYER.FILL */,
                2 /* PAINT_ORDER_LAYER.MARKERS */
            ]);
        });
    });
});
//# sourceMappingURL=paint-order.js.map