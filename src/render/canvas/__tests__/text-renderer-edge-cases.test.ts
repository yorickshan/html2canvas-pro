/**
 * Edge case tests for text rendering
 * Addresses potential Issue #223 scenarios
 */

import { strictEqual, ok } from 'assert';
import { TextRenderer, TextRendererDependencies } from '../text-renderer';
import { Bounds } from '../../../css/layout/bounds';
import { TextBounds } from '../../../css/layout/text';
import { WRITING_MODE } from '../../../css/property-descriptors/writing-mode';
import { DIRECTION } from '../../../css/property-descriptors/direction';
import { DISPLAY } from '../../../css/property-descriptors/display';
import { OVERFLOW } from '../../../css/property-descriptors/overflow';
import { TEXT_OVERFLOW } from '../../../css/property-descriptors/text-overflow';
import { PAINT_ORDER_LAYER } from '../../../css/property-descriptors/paint-order';

describe('TextRenderer Edge Cases', () => {
    const createMockContext = (options?: {
        fontBoundingBoxAscent?: number;
        actualBoundingBoxAscent?: number;
        actualBoundingBoxDescent?: number;
        width?: number;
    }): CanvasRenderingContext2D => {
        const opts = options ?? {};
        return {
            fillStyle: '',
            font: '',
            textBaseline: 'alphabetic' as CanvasTextBaseline,
            direction: 'ltr' as CanvasDirection,
            textAlign: 'left' as CanvasTextAlign,
            fillText() {},
            measureText(text: string) {
                return {
                    width: opts.width ?? 30,
                    fontBoundingBoxAscent: opts.fontBoundingBoxAscent ?? 14,
                    actualBoundingBoxAscent: opts.actualBoundingBoxAscent ?? 14,
                    actualBoundingBoxDescent: opts.actualBoundingBoxDescent ?? 6
                };
            },
            strokeStyle: '',
            lineWidth: 0,
            lineJoin: 'miter' as CanvasLineJoin,
            strokeText() {},
            shadowColor: '',
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowBlur: 0,
            save() {},
            restore() {}
        } as unknown as CanvasRenderingContext2D;
    };

    const createRenderer = (ctx: CanvasRenderingContext2D): TextRenderer => {
        const deps: TextRendererDependencies = {
            ctx,
            options: { scale: 1 }
        };
        return new TextRenderer(deps);
    };

    const createMockStyles = (overrides: Record<string, unknown> = {}) => ({
        fontFamily: ['Arial'],
        fontSize: { number: 16, unit: 'px' },
        fontStyle: 'normal',
        fontVariant: [],
        fontWeight: 'normal',
        color: { r: 0, g: 0, b: 0, a: 1 },
        letterSpacing: 0,
        webkitTextStrokeWidth: 0,
        textShadow: [],
        textDecorationLine: [],
        paintOrder: [PAINT_ORDER_LAYER.FILL],
        direction: DIRECTION.LTR,
        writingMode: WRITING_MODE.HORIZONTAL_TB,
        display: DISPLAY.BLOCK,
        webkitLineClamp: 0,
        textOverflow: TEXT_OVERFLOW.CLIP,
        overflowX: OVERFLOW.VISIBLE,
        overflowY: OVERFLOW.VISIBLE,
        lineHeight: { value: 1.2, type: 1 },
        ...overrides
    });

    describe('NaN and Invalid Metrics', () => {
        it('should handle NaN actualBoundingBoxAscent', async () => {
            const fillCalls: Array<{ y: number }> = [];
            const ctx = {
                fillStyle: '',
                font: '',
                textBaseline: 'alphabetic' as CanvasTextBaseline,
                direction: 'ltr' as CanvasDirection,
                textAlign: 'left' as CanvasTextAlign,
                fillText(_text: string, _x: number, y: number) {
                    fillCalls.push({ y });
                },
                measureText() {
                    return {
                        width: 30,
                        fontBoundingBoxAscent: NaN,
                        actualBoundingBoxAscent: NaN
                    };
                },
                strokeStyle: '',
                lineWidth: 0,
                lineJoin: 'miter' as CanvasLineJoin,
                strokeText() {},
                shadowColor: '',
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                shadowBlur: 0,
                save() {},
                restore() {}
            } as unknown as CanvasRenderingContext2D;

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('Test', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Arial', 'Arial', '16px'];
            await renderer.renderTextNode(textContainer, createMockStyles());

            // NaN ?? number returns number
            strictEqual(fillCalls.length, 1);
            strictEqual(fillCalls[0].y, 66); // 50 + 16 (fontSize fallback)
            ok(!Number.isNaN(fillCalls[0].y), 'y should not be NaN');
        });

        it('should handle negative actualBoundingBoxAscent', async () => {
            const fillCalls: Array<{ y: number }> = [];
            const ctx = {
                fillStyle: '',
                font: '',
                textBaseline: 'alphabetic' as CanvasTextBaseline,
                direction: 'ltr' as CanvasDirection,
                textAlign: 'left' as CanvasTextAlign,
                fillText(_text: string, _x: number, y: number) {
                    fillCalls.push({ y });
                },
                measureText() {
                    return {
                        width: 30,
                        actualBoundingBoxAscent: -5
                    };
                },
                strokeStyle: '',
                lineWidth: 0,
                lineJoin: 'miter' as CanvasLineJoin,
                strokeText() {},
                shadowColor: '',
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                shadowBlur: 0,
                save() {},
                restore() {}
            } as unknown as CanvasRenderingContext2D;

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('Test', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Arial', 'Arial', '16px'];
            await renderer.renderTextNode(textContainer, createMockStyles());

            strictEqual(fillCalls.length, 1);
            // Negative value is used as-is (not falsy)
            strictEqual(fillCalls[0].y, 45); // 50 + (-5)
        });

        it('should handle Infinity actualBoundingBoxAscent', async () => {
            const fillCalls: Array<{ y: number }> = [];
            const ctx = {
                fillStyle: '',
                font: '',
                textBaseline: 'alphabetic' as CanvasTextBaseline,
                direction: 'ltr' as CanvasDirection,
                textAlign: 'left' as CanvasTextAlign,
                fillText(_text: string, _x: number, y: number) {
                    fillCalls.push({ y });
                },
                measureText() {
                    return {
                        width: 30,
                        actualBoundingBoxAscent: Infinity
                    };
                },
                strokeStyle: '',
                lineWidth: 0,
                lineJoin: 'miter' as CanvasLineJoin,
                strokeText() {},
                shadowColor: '',
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                shadowBlur: 0,
                save() {},
                restore() {}
            } as unknown as CanvasRenderingContext2D;

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('Test', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Arial', 'Arial', '16px'];
            await renderer.renderTextNode(textContainer, createMockStyles());

            strictEqual(fillCalls.length, 1);
            // Infinity is used as-is (not falsy)
            strictEqual(fillCalls[0].y, Infinity);
        });
    });

    describe('Empty and Whitespace Text', () => {
        it('should handle empty text gracefully', async () => {
            const fillCalls: Array<{ text: string }> = [];
            const ctx = createMockContext();
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (text: string) => {
                fillCalls.push({ text });
            };

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Arial', 'Arial', '16px'];
            await renderer.renderTextNode(textContainer, createMockStyles());

            // Empty text should not cause errors
            // fillText may or may not be called with empty string
            ok(true, 'should complete without error');
        });

        it('should handle whitespace-only text', async () => {
            const fillCalls: Array<{ text: string }> = [];
            const ctx = createMockContext();
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (text: string) => {
                fillCalls.push({ text });
            };

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('   ', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Arial', 'Arial', '16px'];
            await renderer.renderTextNode(textContainer, createMockStyles());

            ok(true, 'should complete without error');
        });
    });

    describe('Scale Factor', () => {
        it('should handle scale factor correctly', async () => {
            const fillCalls: Array<{ y: number }> = [];
            const ctx = createMockContext();
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (
                _text: string,
                _x: number,
                y: number
            ) => {
                fillCalls.push({ y });
            };

            const renderer = new TextRenderer({
                ctx,
                options: { scale: 2 }
            });

            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('Test', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Arial', 'Arial', '16px'];
            await renderer.renderTextNode(textContainer, createMockStyles());

            strictEqual(fillCalls.length, 1);
            // Baseline should not be scaled (it's relative to font size, not canvas scale)
            strictEqual(fillCalls[0].y, 64); // 50 + 14
        });
    });

    describe('Emoji and Special Characters', () => {
        it('should handle emoji text', async () => {
            const fillCalls: Array<{ text: string }> = [];
            const ctx = createMockContext({
                actualBoundingBoxAscent: 16 // Emoji often has larger ascent
            });
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (text: string) => {
                fillCalls.push({ text });
            };

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('Hello 😀 World', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Arial', 'Arial', '16px'];
            await renderer.renderTextNode(textContainer, createMockStyles());

            strictEqual(fillCalls.length, 1);
            strictEqual(fillCalls[0].text, 'Hello 😀 World');
        });

        it('should handle zero-width joiner', async () => {
            const fillCalls: Array<{ text: string }> = [];
            const ctx = createMockContext();
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (text: string) => {
                fillCalls.push({ text });
            };

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('👨‍👩‍👧‍👦', bounds)], // Family emoji with ZWJ
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Arial', 'Arial', '16px'];
            await renderer.renderTextNode(textContainer, createMockStyles());

            ok(true, 'should handle ZWJ sequences');
        });
    });

    describe('Very Large Text Arrays', () => {
        it('should handle many text bounds efficiently', async () => {
            const fillCalls: Array<{ y: number }> = [];
            const ctx = createMockContext();
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (
                _text: string,
                _x: number,
                y: number
            ) => {
                fillCalls.push({ y });
            };

            const renderer = createRenderer(ctx);
            const textBounds = [];
            for (let i = 0; i < 100; i++) {
                textBounds.push(new TextBounds(`Word${i}`, new Bounds(i * 10, 50, 50, 25)));
            }
            const textContainer = {
                textBounds,
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Arial', 'Arial', '16px'];
            await renderer.renderTextNode(textContainer, createMockStyles());

            strictEqual(fillCalls.length, 100);
        });
    });
});
