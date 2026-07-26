/**
 * Font Rendering Matrix Tests
 *
 * Regression test suite for text baseline rendering across different font types.
 * Ensures proper vertical positioning for:
 * - System fonts (Arial, Times New Roman)
 * - Webfonts (simulated via font-family)
 * - Large descender fonts (Paul-style)
 * - CJK fonts (Noto Sans CJK, etc.)
 *
 * Issue references:
 * - #221: Text below baseline gets cut off with some fonts (Paul)
 * - #222: Webfont baseline shifts down, pushing labels out of their box
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

interface MockMetricsOptions {
    fontBoundingBoxAscent?: number;
    actualBoundingBoxAscent?: number;
    actualBoundingBoxDescent?: number;
}

describe('Font Rendering Matrix', () => {
    // Helper to create mock Canvas 2D context with configurable metrics
    const createMockContext = (options?: MockMetricsOptions): CanvasRenderingContext2D => {
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
                    width: 30,
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

    // Helper to create TextRenderer with mock context
    const createRenderer = (ctx: CanvasRenderingContext2D): TextRenderer => {
        const deps: TextRendererDependencies = {
            ctx,
            options: { scale: 1 }
        };
        return new TextRenderer(deps);
    };

    // Helper to create mock styles
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

    describe('System Fonts', () => {
        it('should render Arial with correct baseline', async () => {
            const fillCalls: Array<{ text: string; x: number; y: number }> = [];
            const ctx = createMockContext({
                fontBoundingBoxAscent: 13,
                actualBoundingBoxAscent: 13
            });
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (
                text: string,
                x: number,
                y: number
            ) => {
                fillCalls.push({ text, x, y });
            };

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('Test', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Arial', 'Arial', '16px'];
            await renderer.renderTextNode(textContainer, createMockStyles());

            strictEqual(fillCalls.length, 1);
            strictEqual(fillCalls[0].y, 63);
        });

        it('should render Times New Roman with correct baseline', async () => {
            const fillCalls: Array<{ text: string; x: number; y: number }> = [];
            const ctx = createMockContext({
                fontBoundingBoxAscent: 12,
                actualBoundingBoxAscent: 12
            });
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (
                text: string,
                x: number,
                y: number
            ) => {
                fillCalls.push({ text, x, y });
            };

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('Test', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px "Times New Roman"', '"Times New Roman"', '16px'];
            await renderer.renderTextNode(
                textContainer,
                createMockStyles({
                    fontFamily: ['"Times New Roman"']
                })
            );

            strictEqual(fillCalls.length, 1);
            strictEqual(fillCalls[0].y, 62);
        });
    });

    describe('Large Descender Fonts (Issue #221 regression)', () => {
        it('should position Paul font without cutting descenders', async () => {
            const fillCalls: Array<{ text: string; x: number; y: number }> = [];
            const ctx = createMockContext({
                fontBoundingBoxAscent: 11,
                actualBoundingBoxAscent: 11,
                actualBoundingBoxDescent: 10
            });
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (
                text: string,
                x: number,
                y: number
            ) => {
                fillCalls.push({ text, x, y });
            };

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('gqjpy', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Paul', 'Paul', '16px'];
            await renderer.renderTextNode(
                textContainer,
                createMockStyles({
                    fontFamily: ['Paul']
                })
            );

            strictEqual(fillCalls.length, 1);
            strictEqual(fillCalls[0].y, 61, 'should use actualBoundingBoxAscent, not fontSize');

            const textBottom = fillCalls[0].y + 10;
            const containerBottom = bounds.top + bounds.height;
            ok(textBottom < containerBottom, 'descenders should fit within container');
        });
    });

    describe('Webfonts (Issue #222 regression)', () => {
        it('should use Canvas API metrics, not DOM metrics', async () => {
            const fillCalls: Array<{ text: string; x: number; y: number }> = [];
            const measureCalls: string[] = [];

            const ctx = {
                fillStyle: '',
                font: '',
                textBaseline: 'alphabetic' as CanvasTextBaseline,
                direction: 'ltr' as CanvasDirection,
                textAlign: 'left' as CanvasTextAlign,
                fillText(text: string, x: number, y: number) {
                    fillCalls.push({ text, x, y });
                },
                measureText(text: string) {
                    measureCalls.push(text);
                    return {
                        width: 30,
                        fontBoundingBoxAscent: 15,
                        actualBoundingBoxAscent: 15
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
                textBounds: [new TextBounds('Label', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px "Noto Sans"', '"Noto Sans"', '16px'];
            await renderer.renderTextNode(
                textContainer,
                createMockStyles({
                    fontFamily: ['"Noto Sans"']
                })
            );

            strictEqual(measureCalls.length, 1, 'should call ctx.measureText');
            strictEqual(measureCalls[0], 'Mg');
            strictEqual(fillCalls.length, 1);
            strictEqual(fillCalls[0].y, 65);
        });

        it('should handle fontBoundingBoxAscent fallback correctly', async () => {
            const fillCalls: Array<{ text: string; x: number; y: number }> = [];
            const ctx = {
                fillStyle: '',
                font: '',
                textBaseline: 'alphabetic' as CanvasTextBaseline,
                direction: 'ltr' as CanvasDirection,
                textAlign: 'left' as CanvasTextAlign,
                fillText(text: string, x: number, y: number) {
                    fillCalls.push({ text, x, y });
                },
                measureText() {
                    return {
                        width: 30,
                        actualBoundingBoxAscent: 14
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
                textBounds: [new TextBounds('Label', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Inter', 'Inter', '16px'];
            await renderer.renderTextNode(
                textContainer,
                createMockStyles({
                    fontFamily: ['Inter']
                })
            );

            strictEqual(fillCalls.length, 1);
            strictEqual(fillCalls[0].y, 64);
        });

        it('should fallback to fontSize when no Canvas metrics available', async () => {
            const fillCalls: Array<{ text: string; x: number; y: number }> = [];
            const ctx = {
                fillStyle: '',
                font: '',
                textBaseline: 'alphabetic' as CanvasTextBaseline,
                direction: 'ltr' as CanvasDirection,
                textAlign: 'left' as CanvasTextAlign,
                fillText(text: string, x: number, y: number) {
                    fillCalls.push({ text, x, y });
                },
                measureText() {
                    return { width: 30 };
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
                textBounds: [new TextBounds('Label', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Custom', 'Custom', '16px'];
            await renderer.renderTextNode(
                textContainer,
                createMockStyles({
                    fontFamily: ['Custom']
                })
            );

            strictEqual(fillCalls.length, 1);
            strictEqual(fillCalls[0].y, 66);
        });
    });

    describe('CJK Fonts', () => {
        it('should handle CJK text with ideographic baseline', async () => {
            const fillCalls: Array<{ text: string; x: number; y: number }> = [];
            const ctx = createMockContext({
                fontBoundingBoxAscent: 14,
                actualBoundingBoxAscent: 14
            });
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (
                text: string,
                x: number,
                y: number
            ) => {
                fillCalls.push({ text, x, y });
            };

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('中文', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px "Noto Sans CJK"', '"Noto Sans CJK"', '16px'];
            await renderer.renderTextNode(
                textContainer,
                createMockStyles({
                    fontFamily: ['"Noto Sans CJK"']
                })
            );

            strictEqual(fillCalls.length, 1);
            strictEqual(fillCalls[0].y, 64);
        });
    });

    describe('Mixed Content', () => {
        it('should handle multiple text bounds with different content', async () => {
            const fillCalls: Array<{ text: string; x: number; y: number }> = [];
            const ctx = createMockContext({
                fontBoundingBoxAscent: 13,
                actualBoundingBoxAscent: 13
            });
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (
                text: string,
                x: number,
                y: number
            ) => {
                fillCalls.push({ text, x, y });
            };

            const renderer = createRenderer(ctx);
            const bounds1 = new Bounds(10, 50, 50, 20);
            const bounds2 = new Bounds(60, 50, 50, 20);
            const textContainer = {
                textBounds: [new TextBounds('Hello', bounds1), new TextBounds('World', bounds2)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Arial', 'Arial', '16px'];
            await renderer.renderTextNode(textContainer, createMockStyles());

            strictEqual(fillCalls.length, 2);
            strictEqual(fillCalls[0].y, 63);
            strictEqual(fillCalls[1].y, 63);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero ascent gracefully', async () => {
            const fillCalls: Array<{ text: string; x: number; y: number }> = [];
            const ctx = createMockContext({
                fontBoundingBoxAscent: 0,
                actualBoundingBoxAscent: 0
            });
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (
                text: string,
                x: number,
                y: number
            ) => {
                fillCalls.push({ text, x, y });
            };

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('Test', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['16px Arial', 'Arial', '16px'];
            await renderer.renderTextNode(textContainer, createMockStyles());

            strictEqual(fillCalls.length, 1);
            strictEqual(fillCalls[0].y, 50);
        });

        it('should handle very small fonts', async () => {
            const fillCalls: Array<{ text: string; x: number; y: number }> = [];
            const ctx = createMockContext({
                fontBoundingBoxAscent: 8,
                actualBoundingBoxAscent: 8
            });
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (
                text: string,
                x: number,
                y: number
            ) => {
                fillCalls.push({ text, x, y });
            };

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 25);
            const textContainer = {
                textBounds: [new TextBounds('Small', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['10px Arial', 'Arial', '10px'];
            await renderer.renderTextNode(
                textContainer,
                createMockStyles({
                    fontSize: { number: 10, unit: 'px' }
                })
            );

            strictEqual(fillCalls.length, 1);
            strictEqual(fillCalls[0].y, 58);
        });

        it('should handle very large fonts', async () => {
            const fillCalls: Array<{ text: string; x: number; y: number }> = [];
            const ctx = createMockContext({
                fontBoundingBoxAscent: 45,
                actualBoundingBoxAscent: 45
            });
            (ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (
                text: string,
                x: number,
                y: number
            ) => {
                fillCalls.push({ text, x, y });
            };

            const renderer = createRenderer(ctx);
            const bounds = new Bounds(10, 50, 100, 60);
            const textContainer = {
                textBounds: [new TextBounds('LARGE', bounds)],
                parse: () => {}
            } as unknown as Parameters<typeof renderer.renderTextNode>[0];

            renderer.createFontStyle = () => ['48px Arial', 'Arial', '48px'];
            await renderer.renderTextNode(
                textContainer,
                createMockStyles({
                    fontSize: { number: 48, unit: 'px' }
                })
            );

            strictEqual(fillCalls.length, 1);
            strictEqual(fillCalls[0].y, 95);
        });
    });
});
