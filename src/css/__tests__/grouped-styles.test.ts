import { describe, it, expect } from 'vitest';
import { BorderStyles } from '../grouped/border-styles';
import { BackgroundStyles } from '../grouped/background-styles';
import { FontStyles } from '../grouped/font-styles';
import { LayoutStyles } from '../grouped/layout-styles';
import type { CSSParsedDeclaration } from '../index';

/**
 * For the purpose of testing facade delegation, we construct a plain object
 * that has the same property shape as a CSSParsedDeclaration (without the
 * constructor complexity). Facade classes only read from target properties,
 * so a structural substitute is sufficient.
 *
 * The explicit `as unknown as CSSParsedDeclaration` cast signals intent:
 * this is a simplified mock that satisfies the *runtime* interface of
 * CSSParsedDeclaration (the import is type-only, erased at compile time).
 */
const baseProps: CSSParsedDeclaration = {
    borderTopColor: [0, 0, 0, 1],
    borderRightColor: [0, 0, 0, 1],
    borderBottomColor: [0, 0, 0, 1],
    borderLeftColor: [255, 0, 0, 1],
    borderTopStyle: 1,
    borderRightStyle: 1,
    borderBottomStyle: 1,
    borderLeftStyle: 0,
    borderTopWidth: 5,
    borderRightWidth: 3,
    borderBottomWidth: 2,
    borderLeftWidth: 1,
    borderTopLeftRadius: [[{ type: 0, number: 10, flags: 4 }]],
    borderTopRightRadius: [[{ type: 0, number: 10, flags: 4 }]],
    borderBottomRightRadius: [[{ type: 0, number: 10, flags: 4 }]],
    borderBottomLeftRadius: [[{ type: 0, number: 10, flags: 4 }]],
    borderImageSource: null,
    borderImageSlice: { top: 100, right: 100, bottom: 100, left: 100, fill: false },
    borderImageRepeat: [{ h: 0, v: 0 }],
    boxShadow: [],

    backgroundColor: [255, 0, 0, 1],
    backgroundImage: [],
    backgroundClip: [0],
    backgroundOrigin: [0],
    backgroundPosition: [[{ type: 14, number: 50, flags: 4 }]],
    backgroundRepeat: [[0, 0]],
    backgroundSize: { type: 19, value: 'auto' },
    backgroundBlendMode: ['normal'],

    fontFamily: ['Arial'],
    fontSize: { type: 0, number: 16, unit: 'px', flags: 0 },
    fontStyle: 0,
    fontVariant: 0,
    fontWeight: 400,
    fontVariantLigatures: 0,
    color: [0, 0, 0, 1],
    letterSpacing: 0,
    lineHeight: 'normal' as unknown as CSSParsedDeclaration['lineHeight'],
    textAlign: 0,
    textTransform: 0,
    textOverflow: 0,
    textShadow: [],
    textDecorationColor: [0, 0, 0, 1],
    textDecorationLine: 0,
    textDecorationStyle: 0,
    textDecorationThickness: { type: 0, number: 1, unit: 'px', flags: 0 },
    textUnderlineOffset: { type: 0, number: 0, unit: 'px', flags: 0 },
    wordBreak: 0,
    lineBreak: 'auto',
    overflowWrap: 0,
    writingMode: 0,
    direction: 0,
    webkitTextStrokeColor: [0, 0, 0, 1],
    webkitTextStrokeWidth: 0,
    webkitLineClamp: 0,
    paintOrder: 0,

    display: 1,
    position: 0,
    float: 0,
    zIndex: { auto: true },
    marginTop: { type: 0, number: 0, flags: 4 } as CSSParsedDeclaration['marginTop'],
    marginRight: { type: 0, number: 0, flags: 4 } as CSSParsedDeclaration['marginRight'],
    marginBottom: { type: 0, number: 0, flags: 4 } as CSSParsedDeclaration['marginBottom'],
    marginLeft: { type: 0, number: 0, flags: 4 } as CSSParsedDeclaration['marginLeft'],
    paddingTop: { type: 0, number: 0, unit: 'px', flags: 0 },
    paddingRight: { type: 0, number: 0, unit: 'px', flags: 0 },
    paddingBottom: { type: 0, number: 0, unit: 'px', flags: 0 },
    paddingLeft: { type: 0, number: 0, unit: 'px', flags: 0 },
    overflowX: 0,
    overflowY: 0,
    opacity: 1,
    visibility: 0,
    transform: null,
    transformOrigin: [],
    rotate: null,
    zoom: 1,
    clipPath: { type: 0 } as CSSParsedDeclaration['clipPath'],
    mixBlendMode: 'normal' as CSSParsedDeclaration['mixBlendMode'],
    filter: null,
    imageRendering: 0,
    objectFit: 0,
    objectPosition: [50, 50],
    boxDecorationBreak: 0,
    listStyleImage: null,
    listStylePosition: 0,
    listStyleType: 0,
    animationDuration: 0,

    isVisible: () => true,
    isTransparent: () => false,
    isTransformed: () => false,
    isPositioned: () => false,
    isPositionedWithZIndex: () => false,
    isFloating: () => false,
    isInlineLevel: () => false
} as unknown as CSSParsedDeclaration;

describe('CSSParsedDeclaration grouped facades', () => {
    describe('BorderStyles', () => {
        it('exposes all border color accessors', () => {
            const border = new BorderStyles(baseProps as any);
            expect(Array.isArray(border.topColor)).toBe(true);
            expect(Array.isArray(border.rightColor)).toBe(true);
            expect(Array.isArray(border.bottomColor)).toBe(true);
            expect(Array.isArray(border.leftColor)).toBe(true);
        });

        it('exposes all border style accessors', () => {
            const border = new BorderStyles(baseProps as any);
            expect(typeof border.topStyle).toBe('number');
            expect(typeof border.rightStyle).toBe('number');
            expect(typeof border.bottomStyle).toBe('number');
            expect(typeof border.leftStyle).toBe('number');
        });

        it('exposes all border width accessors', () => {
            const border = new BorderStyles(baseProps as any);
            expect(border.topWidth).toBe(5);
            expect(border.rightWidth).toBe(3);
            expect(border.bottomWidth).toBe(2);
            expect(border.leftWidth).toBe(1);
        });

        it('exposes all border radius accessors', () => {
            const border = new BorderStyles(baseProps as any);
            expect(Array.isArray(border.topLeftRadius)).toBe(true);
            expect(Array.isArray(border.topRightRadius)).toBe(true);
            expect(Array.isArray(border.bottomRightRadius)).toBe(true);
            expect(Array.isArray(border.bottomLeftRadius)).toBe(true);
        });

        it('exposes border image accessors', () => {
            const border = new BorderStyles(baseProps as any);
            expect(border.imageSource).toBeNull();
            expect(border.imageSlice).toBeDefined();
            expect(border.imageSlice.fill).toBe(false);
            expect(Array.isArray(border.imageRepeat)).toBe(true);
        });

        it('exposes boxShadow', () => {
            const border = new BorderStyles(baseProps as any);
            expect(Array.isArray(border.boxShadow)).toBe(true);
        });
    });

    describe('BackgroundStyles', () => {
        it('exposes all background accessors', () => {
            const bg = new BackgroundStyles(baseProps as any);
            expect(Array.isArray(bg.color)).toBe(true);
            expect(Array.isArray(bg.image)).toBe(true);
            expect(Array.isArray(bg.clip)).toBe(true);
            expect(Array.isArray(bg.origin)).toBe(true);
            expect(Array.isArray(bg.position)).toBe(true);
            expect(Array.isArray(bg.repeat)).toBe(true);
            expect(bg.size).toBeDefined();
            expect(Array.isArray(bg.blendMode)).toBe(true);
        });
    });

    describe('FontStyles', () => {
        it('exposes font family and size', () => {
            const font = new FontStyles(baseProps as any);
            expect(Array.isArray(font.family)).toBe(true);
            expect(font.size.number).toBe(16);
        });

        it('exposes font style and weight', () => {
            const font = new FontStyles(baseProps as any);
            expect(typeof font.style).toBe('number');
            expect(font.weight).toBe(400);
        });

        it('exposes color and letter spacing', () => {
            const font = new FontStyles(baseProps as any);
            expect(Array.isArray(font.color)).toBe(true);
            expect(font.letterSpacing).toBe(0);
        });

        it('exposes text decoration properties', () => {
            const font = new FontStyles(baseProps as any);
            expect(font.textDecorationLine).toBeDefined();
            expect(font.textDecorationStyle).toBeDefined();
            expect(font.textDecorationColor).toBeDefined();
            expect(font.textDecorationThickness).toBeDefined();
            expect(font.textUnderlineOffset).toBeDefined();
        });

        it('exposes text rendering properties', () => {
            const font = new FontStyles(baseProps as any);
            expect(typeof font.textAlign).toBe('number');
            expect(typeof font.textTransform).toBe('number');
            expect(typeof font.textOverflow).toBe('number');
            expect(typeof font.wordBreak).toBe('number');
            expect(typeof font.lineBreak).toBe('string');
            expect(typeof font.writingMode).toBe('number');
            expect(typeof font.direction).toBe('number');
        });

        it('exposes webkit prefixed properties', () => {
            const font = new FontStyles(baseProps as any);
            expect(Array.isArray(font.webkitTextStrokeColor)).toBe(true);
            expect(typeof font.webkitTextStrokeWidth).toBe('number');
            expect(typeof font.webkitLineClamp).toBe('number');
        });
    });

    describe('LayoutStyles', () => {
        it('exposes display, position, float, zIndex', () => {
            const layout = new LayoutStyles(baseProps as any);
            expect(typeof layout.display).toBe('number');
            expect(typeof layout.position).toBe('number');
            expect(typeof layout.float).toBe('number');
            expect(layout.zIndex).toBeDefined();
        });

        it('exposes all margin properties', () => {
            const layout = new LayoutStyles(baseProps as any);
            expect(layout.marginTop).toBeDefined();
            expect(layout.marginRight).toBeDefined();
            expect(layout.marginBottom).toBeDefined();
            expect(layout.marginLeft).toBeDefined();
        });

        it('exposes all padding properties', () => {
            const layout = new LayoutStyles(baseProps as any);
            expect(layout.paddingTop).toBeDefined();
            expect(layout.paddingRight).toBeDefined();
            expect(layout.paddingBottom).toBeDefined();
            expect(layout.paddingLeft).toBeDefined();
        });

        it('exposes overflow and opacity', () => {
            const layout = new LayoutStyles(baseProps as any);
            expect(typeof layout.overflowX).toBe('number');
            expect(typeof layout.overflowY).toBe('number');
            expect(layout.opacity).toBe(1);
        });

        it('exposes transform properties', () => {
            const layout = new LayoutStyles(baseProps as any);
            expect(layout.transform).toBeNull();
            expect(layout.rotate).toBeNull();
            expect(layout.zoom).toBe(1);
        });

        it('exposes clipPath, mixBlendMode, filter', () => {
            const layout = new LayoutStyles(baseProps as any);
            expect(layout.clipPath).toBeDefined();
            expect(typeof layout.mixBlendMode).toBe('string');
            expect(layout.filter).toBeNull();
        });

        it('exposes object fit and position', () => {
            const layout = new LayoutStyles(baseProps as any);
            expect(typeof layout.objectFit).toBe('number');
            expect(layout.objectPosition).toBeDefined();
        });

        it('delegates visibility checks', () => {
            const layout = new LayoutStyles(baseProps as any);
            expect(layout.isVisible()).toBe(true);
            expect(layout.isTransparent()).toBe(false);
            expect(layout.isTransformed()).toBe(false);
            expect(layout.isPositioned()).toBe(false);
            expect(layout.isPositionedWithZIndex()).toBe(false);
            expect(layout.isFloating()).toBe(false);
            expect(layout.isInlineLevel()).toBe(false);
        });
    });
});
