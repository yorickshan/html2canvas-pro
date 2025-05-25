"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var assert_1 = require("assert");
var color_1 = require("../color");
var color_utilities_1 = require("../color-utilities");
var parser_1 = require("../../syntax/parser");
var parse = function (value) { return color_1.color.parse({}, parser_1.Parser.parseValue(value)); };
describe('types', function () {
    describe('<color>', function () {
        describe('parsing', function () {
            it('#000', function () { return (0, assert_1.strictEqual)(parse('#000'), (0, color_utilities_1.pack)(0, 0, 0, 1)); });
            it('#0000', function () { return (0, assert_1.strictEqual)(parse('#0000'), (0, color_utilities_1.pack)(0, 0, 0, 0)); });
            it('#000f', function () { return (0, assert_1.strictEqual)(parse('#000f'), (0, color_utilities_1.pack)(0, 0, 0, 1)); });
            it('#fff', function () { return (0, assert_1.strictEqual)(parse('#fff'), (0, color_utilities_1.pack)(255, 255, 255, 1)); });
            it('#000000', function () { return (0, assert_1.strictEqual)(parse('#000000'), (0, color_utilities_1.pack)(0, 0, 0, 1)); });
            it('#00000000', function () { return (0, assert_1.strictEqual)(parse('#00000000'), (0, color_utilities_1.pack)(0, 0, 0, 0)); });
            it('#ffffff', function () { return (0, assert_1.strictEqual)(parse('#ffffff'), (0, color_utilities_1.pack)(255, 255, 255, 1)); });
            it('#ffffffff', function () { return (0, assert_1.strictEqual)(parse('#ffffffff'), (0, color_utilities_1.pack)(255, 255, 255, 1)); });
            it('#7FFFD4', function () { return (0, assert_1.strictEqual)(parse('#7FFFD4'), (0, color_utilities_1.pack)(127, 255, 212, 1)); });
            it('#f0ffff', function () { return (0, assert_1.strictEqual)(parse('#f0ffff'), (0, color_utilities_1.pack)(240, 255, 255, 1)); });
            it('transparent', function () { return (0, assert_1.strictEqual)(parse('transparent'), (0, color_utilities_1.pack)(0, 0, 0, 0)); });
            it('bisque', function () { return (0, assert_1.strictEqual)(parse('bisque'), (0, color_utilities_1.pack)(255, 228, 196, 1)); });
            it('BLUE', function () { return (0, assert_1.strictEqual)(parse('BLUE'), (0, color_utilities_1.pack)(0, 0, 255, 1)); });
            it('rgb(1, 3, 5)', function () { return (0, assert_1.strictEqual)(parse('rgb(1, 3, 5)'), (0, color_utilities_1.pack)(1, 3, 5, 1)); });
            it('rgb(0% 0% 0%)', function () { return (0, assert_1.strictEqual)(parse('rgb(0% 0% 0%)'), (0, color_utilities_1.pack)(0, 0, 0, 1)); });
            it('rgb(50% 50% 50%)', function () { return (0, assert_1.strictEqual)(parse('rgb(50% 50% 50%)'), (0, color_utilities_1.pack)(128, 128, 128, 1)); });
            it('rgba(50% 50% 50% 50%)', function () { return (0, assert_1.strictEqual)(parse('rgba(50% 50% 50% 50%)'), (0, color_utilities_1.pack)(128, 128, 128, 0.5)); });
            it('rgb(100% 100% 100%)', function () { return (0, assert_1.strictEqual)(parse('rgb(100% 100% 100%)'), (0, color_utilities_1.pack)(255, 255, 255, 1)); });
            it('rgb(222 111 50)', function () { return (0, assert_1.strictEqual)(parse('rgb(222 111 50)'), (0, color_utilities_1.pack)(222, 111, 50, 1)); });
            it('rgba(200, 3, 5, 1)', function () { return (0, assert_1.strictEqual)(parse('rgba(200, 3, 5, 1)'), (0, color_utilities_1.pack)(200, 3, 5, 1)); });
            it('rgba(222, 111, 50, 0.22)', function () {
                return (0, assert_1.strictEqual)(parse('rgba(222, 111, 50, 0.22)'), (0, color_utilities_1.pack)(222, 111, 50, 0.22));
            });
            it('rgba(222 111 50 0.123)', function () { return (0, assert_1.strictEqual)(parse('rgba(222 111 50 0.123)'), (0, color_utilities_1.pack)(222, 111, 50, 0.123)); });
            it('hsl(270,60%,70%)', function () { return (0, assert_1.strictEqual)(parse('hsl(270,60%,70%)'), parse('rgb(178,132,224)')); });
            it('hsl(270, 60%, 70%)', function () { return (0, assert_1.strictEqual)(parse('hsl(270, 60%, 70%)'), parse('rgb(178,132,224)')); });
            it('hsl(270 60% 70%)', function () { return (0, assert_1.strictEqual)(parse('hsl(270 60% 70%)'), parse('rgb(178,132,224)')); });
            it('hsl(270deg, 60%, 70%)', function () { return (0, assert_1.strictEqual)(parse('hsl(270deg, 60%, 70%)'), parse('rgb(178,132,224)')); });
            it('hsl(4.71239rad, 60%, 70%)', function () {
                return (0, assert_1.strictEqual)(parse('hsl(4.71239rad, 60%, 70%)'), parse('rgb(178,132,224)'));
            });
            it('hsl(.75turn, 60%, 70%)', function () { return (0, assert_1.strictEqual)(parse('hsl(.75turn, 60%, 70%)'), parse('rgb(178,132,224)')); });
            it('hsla(.75turn, 60%, 70%, 50%)', function () {
                return (0, assert_1.strictEqual)(parse('hsl(.75turn, 60%, 70%, 50%)'), parse('rgba(178,132,224, 0.5)'));
            });
            it('oklch(0.93 0.39 28deg)', function () { return (0, assert_1.strictEqual)(parse('oklch(0.93 0.39 28deg)'), (0, color_utilities_1.pack)(255, 0, 23, 1)); });
            it('oklch(0.93 0.39 28)', function () { return (0, assert_1.strictEqual)(parse('oklch(0.93 0.39 28)'), (0, color_utilities_1.pack)(255, 0, 23, 1)); });
            it('oklch(0.63 0.26 27.65)', function () { return (0, assert_1.strictEqual)(parse('oklch(0.63 0.26 27.65)'), (0, color_utilities_1.pack)(255, 0, 20, 1)); });
            it('oklch(0.57 0.23 145.62)', function () { return (0, assert_1.strictEqual)(parse('oklch(0.57 0.23 145.62)'), (0, color_utilities_1.pack)(0, 151, 0, 1)); });
            it('oklch(0.57 0.23 145.62 / 0.5)', function () {
                return (0, assert_1.strictEqual)(parse('oklch(0.57 0.23 145.62 / 0.5)'), (0, color_utilities_1.pack)(0, 151, 0, 0.5));
            });
            it('oklab(0.4 0.11 0.05)', function () { return (0, assert_1.strictEqual)(parse('oklab(0.4 0.11 0.05)'), (0, color_utilities_1.pack)(124, 37, 37, 1)); });
            it('oklab(0.57 -0.19 0.13)', function () { return (0, assert_1.strictEqual)(parse('oklab(0.57 -0.19 0.13)'), (0, color_utilities_1.pack)(0, 151, 0, 1)); });
            it('oklab(0.57 -0.19 0.13 / 50%)', function () {
                return (0, assert_1.strictEqual)(parse('oklab(0.57 -0.19 0.13 / 50%)'), (0, color_utilities_1.pack)(0, 151, 0, 0.5));
            });
            it('lab(53 -66.2 60.96)', function () { return (0, assert_1.strictEqual)(parse('lab(53 -66.2 60.96)'), (0, color_utilities_1.pack)(0, 151, 0, 1)); });
            it('lab(63 -41.52 -25.36)', function () { return (0, assert_1.strictEqual)(parse('lab(63 -41.52 -25.36)'), (0, color_utilities_1.pack)(0, 173, 196, 1)); });
            it('lab(63 -41.52 -25.36 / 0.5)', function () {
                return (0, assert_1.strictEqual)(parse('lab(63 -41.52 -25.36 / 0.5)'), (0, color_utilities_1.pack)(0, 173, 196, 0.5));
            });
            it('lch(29.2345% 44.2 27)', function () { return (0, assert_1.strictEqual)(parse('lch(29.2345% 44.2 27)'), (0, color_utilities_1.pack)(125, 35, 41, 1)); });
            it('lch(52.2345% 72.2 56.2)', function () { return (0, assert_1.strictEqual)(parse('lch(52.2345% 72.2 56.2)'), (0, color_utilities_1.pack)(198, 93, 6, 1)); });
            it('color(srgb 1 0 0)', function () { return (0, assert_1.strictEqual)(parse('color(srgb 1 0 0)'), (0, color_utilities_1.pack)(255, 0, 0, 1)); });
            it('color(srgb 1 0 0 / .5)', function () { return (0, assert_1.strictEqual)(parse('color(srgb 1 0 0 / .5)'), (0, color_utilities_1.pack)(255, 0, 0, 0.5)); });
            it('color(srgb 0.5 0 0.5)', function () { return (0, assert_1.strictEqual)(parse('color(srgb 0.5 0 0.5)'), (0, color_utilities_1.pack)(128, 0, 128, 1)); });
            it('color(xyz 0.11 0.17 0.24)', function () {
                return (0, assert_1.strictEqual)(parse('color(xyz 0.11 0.17 0.24)'), (0, color_utilities_1.pack)(0, 130, 131, 1));
            });
            it('color(xyz-d65 0.11 0.17 0.24)', function () {
                return (0, assert_1.strictEqual)(parse('color(xyz-d65 0.11 0.17 0.24)'), (0, color_utilities_1.pack)(0, 130, 131, 1));
            });
            it('color(xyz-d50 0.11 0.17 0.24)', function () {
                return (0, assert_1.strictEqual)(parse('color(xyz-d50 0.11 0.17 0.24)'), (0, color_utilities_1.pack)(0, 131, 150, 1));
            });
            it('color(srgb-linear 0.23 0.59 0.13)', function () {
                return (0, assert_1.strictEqual)(parse('color(srgb-linear 0.23 0.59 0.13)'), (0, color_utilities_1.pack)(132, 202, 101, 1));
            });
            it('color(display-p3 0.47 0.47 0.47)', function () {
                return (0, assert_1.strictEqual)(parse('color(display-p3 0.47 0.47 0.47)'), (0, color_utilities_1.pack)(120, 120, 120, 1));
            });
            it('color(display-p3 1 1 1)', function () { return (0, assert_1.strictEqual)(parse('color(display-p3 1 1 1)'), (0, color_utilities_1.pack)(255, 255, 255, 1)); });
            it('color(display-p3 -0.1 -0.1 -0.1) ', function () {
                return (0, assert_1.strictEqual)(parse('color(display-p3 -0.1 -0.1 -0.1)'), (0, color_utilities_1.pack)(0, 0, 0, 1));
            });
            it('color(display-p3 0.238 0.532 0.611)', function () {
                return (0, assert_1.strictEqual)(parse('color(display-p3 0.238 0.532 0.611)'), (0, color_utilities_1.pack)(5, 138, 158, 1));
            });
            it('color(display-p3 1 0 0)', function () { return (0, assert_1.strictEqual)(parse('color(display-p3 1 0 0)'), (0, color_utilities_1.pack)(255, 0, 0, 1)); });
            it('color(display-p3 0 1 0)', function () { return (0, assert_1.strictEqual)(parse('color(display-p3 0 1 0)'), (0, color_utilities_1.pack)(0, 255, 0, 1)); });
            it('color(display-p3 0 0 1)', function () { return (0, assert_1.strictEqual)(parse('color(display-p3 0 0 1)'), (0, color_utilities_1.pack)(0, 0, 255, 1)); });
            it('color(a98-rgb 1 0.5 0)', function () { return (0, assert_1.strictEqual)(parse('color(a98-rgb 1 0.5 0)'), (0, color_utilities_1.pack)(255, 129, 0, 1)); });
            it('color(a98-rgb 1 0.22548 0.9854)', function () {
                return (0, assert_1.strictEqual)(parse('color(a98-rgb 1 0.22548 0.9854)'), (0, color_utilities_1.pack)(255, 55, 255, 1));
            });
            it('color(prophoto-rgb 1 0.5 0)', function () {
                return (0, assert_1.strictEqual)(parse('color(prophoto-rgb 1 0.5 0)'), (0, color_utilities_1.pack)(255, 99, 0, 1));
            });
            it('color(rec2020 0.17 0.31 0.5)', function () {
                return (0, assert_1.strictEqual)(parse('color(rec2020 0.17 0.31 0.5)'), (0, color_utilities_1.pack)(0, 97, 144, 1));
            });
            it('color(rec2020 1 0 0)', function () { return (0, assert_1.strictEqual)(parse('color(rec2020 1 0 0)'), (0, color_utilities_1.pack)(255, 0, 0, 1)); });
            it('color(rec2020 0 1 0)', function () { return (0, assert_1.strictEqual)(parse('color(rec2020 0 1 0)'), (0, color_utilities_1.pack)(0, 255, 0, 1)); });
            it('color(rec2020 0 0 1)', function () { return (0, assert_1.strictEqual)(parse('color(rec2020 0 0 1)'), (0, color_utilities_1.pack)(0, 0, 255, 1)); });
            it('color(from #0000FF srgb r g b)', function () {
                return (0, assert_1.strictEqual)(parse('color(from #0000FF srgb r b g)'), (0, color_utilities_1.pack)(0, 255, 0, 1));
            });
            it('color(from #0000FF srgb b 0 0)', function () {
                return (0, assert_1.strictEqual)(parse('color(from #0000FF srgb b 0 0)'), (0, color_utilities_1.pack)(255, 0, 0, 1));
            });
            it('color(from green srgb r g b)', function () {
                return (0, assert_1.strictEqual)(parse('color(from green srgb r g b)'), (0, color_utilities_1.pack)(0, 128, 0, 1));
            });
            it('color(from lime srgb r g b)', function () {
                return (0, assert_1.strictEqual)(parse('color(from lime srgb r g b)'), (0, color_utilities_1.pack)(0, 255, 0, 1));
            });
            it('color(from green srgb r calc(g * 2) b)', function () {
                return (0, assert_1.strictEqual)(parse('color(from green srgb r calc(g * 2) b)'), (0, color_utilities_1.pack)(0, 255, 0, 1));
            });
            it('color(from hsl(0 100% 50%) xyz x y z)', function () {
                return (0, assert_1.strictEqual)(parse('color(from hsl(0 100% 50%) xyz x y z)'), (0, color_utilities_1.pack)(255, 0, 0, 1));
            });
            it('color(from hsl(0 100% 50%) xyz 0.75 0.6554 0.1)', function () {
                return (0, assert_1.strictEqual)(parse('color(from hsl(0 100% 50%) xyz 0.75 0.6554 0.1)'), (0, color_utilities_1.pack)(255, 189, 31, 1));
            });
            it('color(from hsl(0 100% 50%) srgb 0.749938 0 0.609579)', function () {
                return (0, assert_1.strictEqual)(parse('color(from hsl(0 100% 50%) srgb 0.749938 0 0.609579)'), (0, color_utilities_1.pack)(191, 0, 155, 1));
            });
            it('color(from hsl(0 100% 50%) display-p3 r g b)', function () {
                return (0, assert_1.strictEqual)(parse('color(from hsl(0 100% 50%) display-p3 r g b)'), (0, color_utilities_1.pack)(255, 0, 0, 1));
            });
            it('color(from lab(52.14 -26.38 -20.37) display-p3 r g b)', function () {
                return (0, assert_1.strictEqual)(parse('color(from lab(52.14 -26.38 -20.37) display-p3 r g b)'), (0, color_utilities_1.pack)(5, 138, 158, 1));
            });
            it('color(from lab(52.14 -26.38 -20.37) display-p3 r g calc(r / 2))', function () {
                return (0, assert_1.strictEqual)(parse('color(from lab(52.14 -26.38 -20.37) display-p3 r g calc(r / 2))'), (0, color_utilities_1.pack)(5, 138, 0, 1));
            });
            it('color(from lab(52.14 -26.38 -20.37) a98-rgb r g b)', function () {
                return (0, assert_1.strictEqual)(parse('color(from lab(52.14 -26.38 -20.37) a98-rgb r g b)'), (0, color_utilities_1.pack)(5, 138, 158, 1));
            });
            it('color(from hsl(0 100% 50%) prophoto-rgb r g b)', function () {
                return (0, assert_1.strictEqual)(parse('color(from hsl(0 100% 50%) prophoto-rgb r g b)'), (0, color_utilities_1.pack)(255, 0, 0, 1));
            });
            it('color(from hsl(0 100% 50%) prophoto-rgb calc(r / 2) g b)', function () {
                return (0, assert_1.strictEqual)(parse('color(from hsl(0 100% 50%) prophoto-rgb calc(r / 2) g b)'), (0, color_utilities_1.pack)(132, 83, 11, 1));
            });
            it('color(from lab(52.14 -26.38 -20.37) rec2020 r g b)', function () {
                return (0, assert_1.strictEqual)(parse('color(from lab(52.14 -26.38 -20.37) rec2020 r g b)'), (0, color_utilities_1.pack)(5, 138, 158, 1));
            });
            it('color(from hsl(0 100% 50%) rec2020 calc(r / 2) g 0)', function () {
                return (0, assert_1.strictEqual)(parse('color(from hsl(0 100% 50%) rec2020 calc(r / 2) g 0)'), (0, color_utilities_1.pack)(135, 68, 0, 1));
            });
        });
        describe('util', function () {
            describe('isTransparent', function () {
                it('transparent', function () { return (0, assert_1.strictEqual)((0, color_utilities_1.isTransparent)(parse('transparent')), true); });
                it('#000', function () { return (0, assert_1.strictEqual)((0, color_utilities_1.isTransparent)(parse('#000')), false); });
                it('#000f', function () { return (0, assert_1.strictEqual)((0, color_utilities_1.isTransparent)(parse('#000f')), false); });
                it('#0001', function () { return (0, assert_1.strictEqual)((0, color_utilities_1.isTransparent)(parse('#0001')), false); });
                it('#0000', function () { return (0, assert_1.strictEqual)((0, color_utilities_1.isTransparent)(parse('#0000')), true); });
            });
            describe('toString', function () {
                it('transparent', function () { return (0, assert_1.strictEqual)((0, color_utilities_1.asString)(parse('transparent')), 'rgba(0,0,0,0)'); });
                it('#000', function () { return (0, assert_1.strictEqual)((0, color_utilities_1.asString)(parse('#000')), 'rgb(0,0,0)'); });
                it('#000f', function () { return (0, assert_1.strictEqual)((0, color_utilities_1.asString)(parse('#000f')), 'rgb(0,0,0)'); });
                it('#000f', function () { return (0, assert_1.strictEqual)((0, color_utilities_1.asString)(parse('#000c')), 'rgba(0,0,0,0.8)'); });
                it('#fff', function () { return (0, assert_1.strictEqual)((0, color_utilities_1.asString)(parse('#fff')), 'rgb(255,255,255)'); });
                it('#ffff', function () { return (0, assert_1.strictEqual)((0, color_utilities_1.asString)(parse('#ffff')), 'rgb(255,255,255)'); });
                it('#fffc', function () { return (0, assert_1.strictEqual)((0, color_utilities_1.asString)(parse('#fffc')), 'rgba(255,255,255,0.8)'); });
            });
        });
    });
});
//# sourceMappingURL=color-tests.js.map