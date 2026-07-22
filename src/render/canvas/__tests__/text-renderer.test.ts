import { ok, strictEqual, deepStrictEqual } from 'assert';
import { TextRenderer, TextRendererDependencies, hasCJKCharacters } from '../text-renderer';
import { Bounds } from '../../../css/layout/bounds';
import { TextBounds } from '../../../css/layout/text';
import { WRITING_MODE } from '../../../css/property-descriptors/writing-mode';
import { FontMetrics } from '../../font-metrics';

const createMockFontMetrics = (): FontMetrics => {
    return {
        getMetrics: (_fontFamily: string, _fontSize: string) => ({ baseline: 14, middle: 8 })
    } as unknown as FontMetrics;
};

describe('TextRenderer', () => {
    it('should be instantiated', () => {
        const ctx = {
            fillStyle: '',
            font: '',
            save: () => {},
            restore: () => {}
        } as unknown as CanvasRenderingContext2D;

        const deps: TextRendererDependencies = {
            ctx,
            fontMetrics: createMockFontMetrics(),
            options: { scale: 1 }
        };

        const renderer = new TextRenderer(deps);
        ok(renderer);

        // Test public methods exist
        strictEqual(typeof renderer.renderTextNode, 'function');
        strictEqual(typeof renderer.renderTextWithLetterSpacing, 'function');
        strictEqual(typeof renderer.createFontStyle, 'function');
    });
});

describe('hasCJKCharacters', () => {
    it('should return true for Chinese characters', () => {
        strictEqual(hasCJKCharacters('快照'), true);
        strictEqual(hasCJKCharacters('截图'), true);
        strictEqual(hasCJKCharacters('中文'), true);
    });

    it('should return true for Japanese characters', () => {
        strictEqual(hasCJKCharacters('ひらがな'), true); // Hiragana
        strictEqual(hasCJKCharacters('カタカナ'), true); // Katakana
        strictEqual(hasCJKCharacters('漢字'), true); // Kanji
    });

    it('should return true for Korean characters', () => {
        strictEqual(hasCJKCharacters('한글'), true);
    });

    it('should return true for CJK punctuation and symbols', () => {
        strictEqual(hasCJKCharacters('。'), true); // CJK full stop (U+3002)
        strictEqual(hasCJKCharacters('、'), true); // CJK comma (U+3001)
        strictEqual(hasCJKCharacters('「」'), true); // CJK brackets
    });

    it('should return true for fullwidth characters (U+FF01–U+FFEF)', () => {
        strictEqual(hasCJKCharacters('！'), true); // Fullwidth ! (U+FF01, range start)
        strictEqual(hasCJKCharacters('Ａ'), true); // Fullwidth A (U+FF21)
        strictEqual(hasCJKCharacters('１'), true); // Fullwidth 1 (U+FF11)
    });

    it('should return false for Latin characters', () => {
        strictEqual(hasCJKCharacters('Hello'), false);
        strictEqual(hasCJKCharacters('SOS'), false);
        strictEqual(hasCJKCharacters('abc123'), false);
    });

    it('should return false for empty string', () => {
        strictEqual(hasCJKCharacters(''), false);
    });

    it('should return true for mixed text containing CJK', () => {
        strictEqual(hasCJKCharacters('SOS 快照'), true);
    });
});

describe('renderTextWithLetterSpacing', () => {
    it('should apply letterSpacing to each character x position (Issue #73 Bug1)', () => {
        const fillCalls: Array<{ text: string; x: number; y: number }> = [];
        const measureResults: Record<string, number> = { A: 10, B: 12, C: 8 };

        const ctx = {
            fillStyle: '',
            font: '',
            textBaseline: 'alphabetic' as CanvasTextBaseline,
            fillText(text: string, x: number, y: number) {
                fillCalls.push({ text, x, y });
            },
            measureText(text: string) {
                return { width: measureResults[text] ?? 10 };
            }
        } as unknown as CanvasRenderingContext2D;

        const deps: TextRendererDependencies = {
            ctx,
            fontMetrics: createMockFontMetrics(),
            options: { scale: 1 }
        };

        const renderer = new TextRenderer(deps);
        const bounds = new Bounds(100, 50, 200, 25);
        const text = new TextBounds('ABC', bounds);
        const letterSpacing = 5;
        const baseline = 20;

        renderer.renderTextWithLetterSpacing(text, letterSpacing, baseline);

        // Verify letter spacing is added between characters
        // A: x=100, B: x=100+10+5=115, C: x=115+12+5=132
        strictEqual(fillCalls.length, 3);
        strictEqual(fillCalls[0].text, 'A');
        strictEqual(fillCalls[0].x, 100);
        strictEqual(fillCalls[1].text, 'B');
        strictEqual(fillCalls[1].x, 115); // 100 + measureText('A').width(10) + letterSpacing(5)
        strictEqual(fillCalls[2].text, 'C');
        strictEqual(fillCalls[2].x, 132); // 115 + measureText('B').width(12) + letterSpacing(5)

        // Verify y position uses baseline
        fillCalls.forEach((call) => {
            strictEqual(call.y, bounds.top + baseline); // 50 + 20 = 70
        });
    });

    it('should use ideographic baseline for CJK characters (Issue #73 Bug2)', () => {
        const baselineChanges: string[] = [];
        let currentBaseline: CanvasTextBaseline = 'alphabetic';

        const ctx = {
            fillStyle: '',
            font: '',
            get textBaseline(): CanvasTextBaseline {
                return currentBaseline;
            },
            set textBaseline(value: CanvasTextBaseline) {
                currentBaseline = value;
                baselineChanges.push(value);
            },
            fillText(_text: string, _x: number, _y: number) {},
            measureText(_text: string) {
                return { width: 25 };
            }
        } as unknown as CanvasRenderingContext2D;

        const deps: TextRendererDependencies = {
            ctx,
            fontMetrics: createMockFontMetrics(),
            options: { scale: 1 }
        };

        const renderer = new TextRenderer(deps);
        const bounds = new Bounds(0, 0, 100, 25);
        const text = new TextBounds('快照', bounds);

        renderer.renderTextWithLetterSpacing(text, 10, 20);

        // Should have switched to ideographic for each CJK char and restored
        // Pattern: [ideographic, alphabetic, ideographic, alphabetic]
        ok(baselineChanges.includes('ideographic'), 'should switch to ideographic baseline for CJK');
        // Should restore alphabetic after each CJK char
        const ideographicIdx = baselineChanges.indexOf('ideographic');
        strictEqual(baselineChanges[ideographicIdx + 1], 'alphabetic');
    });

    it('should not change textBaseline for non-CJK characters', () => {
        const baselineChanges: string[] = [];
        let currentBaseline: CanvasTextBaseline = 'alphabetic';

        const ctx = {
            fillStyle: '',
            font: '',
            get textBaseline(): CanvasTextBaseline {
                return currentBaseline;
            },
            set textBaseline(value: CanvasTextBaseline) {
                currentBaseline = value;
                baselineChanges.push(value);
            },
            fillText(_text: string, _x: number, _y: number) {},
            measureText(_text: string) {
                return { width: 10 };
            }
        } as unknown as CanvasRenderingContext2D;

        const deps: TextRendererDependencies = {
            ctx,
            fontMetrics: createMockFontMetrics(),
            options: { scale: 1 }
        };

        const renderer = new TextRenderer(deps);
        const bounds = new Bounds(0, 0, 100, 25);
        const text = new TextBounds('ABC', bounds);

        renderer.renderTextWithLetterSpacing(text, 5, 20);

        // Should not switch to ideographic for Latin characters
        ok(!baselineChanges.includes('ideographic'), 'should not switch to ideographic for Latin text');
    });

    it('should render whole string in one call when letterSpacing is 0', () => {
        const fillCalls: Array<{ text: string; x: number; y: number }> = [];

        const ctx = {
            fillStyle: '',
            font: '',
            textBaseline: 'alphabetic' as CanvasTextBaseline,
            fillText(text: string, x: number, y: number) {
                fillCalls.push({ text, x, y });
            },
            measureText(_text: string) {
                return { width: 30 };
            }
        } as unknown as CanvasRenderingContext2D;

        const deps: TextRendererDependencies = {
            ctx,
            fontMetrics: createMockFontMetrics(),
            options: { scale: 1 }
        };

        const renderer = new TextRenderer(deps);
        const bounds = new Bounds(10, 20, 100, 25);
        const text = new TextBounds('Hello', bounds);

        renderer.renderTextWithLetterSpacing(text, 0, 22);

        deepStrictEqual(fillCalls, [{ text: 'Hello', x: 10, y: 42 }]);
    });

    it('should handle negative letterSpacing correctly', () => {
        const fillCalls: Array<{ text: string; x: number }> = [];

        const ctx = {
            fillStyle: '',
            font: '',
            textBaseline: 'alphabetic' as CanvasTextBaseline,
            fillText(text: string, x: number, _y: number) {
                fillCalls.push({ text, x });
            },
            measureText(_text: string) {
                return { width: 10 };
            }
        } as unknown as CanvasRenderingContext2D;

        const deps: TextRendererDependencies = {
            ctx,
            fontMetrics: createMockFontMetrics(),
            options: { scale: 1 }
        };

        const renderer = new TextRenderer(deps);
        const bounds = new Bounds(100, 0, 50, 20);
        const text = new TextBounds('AB', bounds);

        renderer.renderTextWithLetterSpacing(text, -3, 15);

        // A: x=100, B: x=100 + 10 + (-3) = 107
        strictEqual(fillCalls[0].x, 100);
        strictEqual(fillCalls[1].x, 107);
    });

    it('should handle mixed CJK and Latin text with correct baseline per character', () => {
        const baselineAtRender: Record<string, string> = {};
        let currentBaseline: CanvasTextBaseline = 'alphabetic';

        const ctx = {
            fillStyle: '',
            font: '',
            get textBaseline(): CanvasTextBaseline {
                return currentBaseline;
            },
            set textBaseline(value: CanvasTextBaseline) {
                currentBaseline = value;
            },
            fillText(text: string, _x: number, _y: number) {
                baselineAtRender[text] = currentBaseline;
            },
            measureText(_text: string) {
                return { width: 12 };
            }
        } as unknown as CanvasRenderingContext2D;

        const deps: TextRendererDependencies = {
            ctx,
            fontMetrics: createMockFontMetrics(),
            options: { scale: 1 }
        };

        const renderer = new TextRenderer(deps);
        const bounds = new Bounds(0, 0, 200, 25);
        // Mixed: Latin 'A', CJK '快', Latin 'B'
        const text = new TextBounds('A快B', bounds);

        renderer.renderTextWithLetterSpacing(text, 5, 20);

        strictEqual(baselineAtRender['A'], 'alphabetic', 'Latin char should use alphabetic baseline');
        strictEqual(baselineAtRender['快'], 'ideographic', 'CJK char should use ideographic baseline');
        strictEqual(baselineAtRender['B'], 'alphabetic', 'Latin char after CJK should restore alphabetic baseline');
    });

    it('should handle empty string without errors', () => {
        const ctx = {
            fillStyle: '',
            font: '',
            textBaseline: 'alphabetic' as CanvasTextBaseline,
            fillText(_text: string, _x: number, _y: number) {},
            measureText(_text: string) {
                return { width: 0 };
            }
        } as unknown as CanvasRenderingContext2D;

        const deps: TextRendererDependencies = {
            ctx,
            fontMetrics: createMockFontMetrics(),
            options: { scale: 1 }
        };

        const renderer = new TextRenderer(deps);
        const bounds = new Bounds(0, 0, 100, 25);
        const text = new TextBounds('', bounds);

        // Should not throw
        renderer.renderTextWithLetterSpacing(text, 5, 20);
        renderer.renderTextWithLetterSpacing(text, 0, 20);
    });

    it('should render CJK glyphs upright in vertical writing mode', () => {
        const fillCalls: Array<{ text: string; x: number; y: number }> = [];
        const baselineAtRender: Record<string, string> = {};
        let currentBaseline: CanvasTextBaseline = 'alphabetic';

        const ctx = {
            fillStyle: '',
            font: '',
            get textBaseline(): CanvasTextBaseline {
                return currentBaseline;
            },
            set textBaseline(value: CanvasTextBaseline) {
                currentBaseline = value;
            },
            fillText(text: string, x: number, y: number) {
                baselineAtRender[text] = currentBaseline;
                fillCalls.push({ text, x, y });
            },
            measureText(_text: string) {
                return { width: 20 };
            },
            save() {},
            restore() {},
            translate(_x: number, _y: number) {},
            rotate(_angle: number) {}
        } as unknown as CanvasRenderingContext2D;

        const deps: TextRendererDependencies = {
            ctx,
            fontMetrics: createMockFontMetrics(),
            options: { scale: 1 }
        };

        const renderer = new TextRenderer(deps);
        const bounds = new Bounds(100, 50, 24, 80);
        const text = new TextBounds('縦書', bounds);

        renderer.renderTextWithLetterSpacing(text, 4, 18, WRITING_MODE.VERTICAL_RL);

        deepStrictEqual(fillCalls, [
            { text: '縦', x: 100, y: 68 },
            { text: '書', x: 100, y: 92 }
        ]);
        strictEqual(baselineAtRender['縦'], 'ideographic');
        strictEqual(baselineAtRender['書'], 'ideographic');
        strictEqual(currentBaseline, 'alphabetic');
    });

    it('should rotate Latin glyphs in vertical writing mode', () => {
        const operations: string[] = [];
        const fillCalls: Array<{ text: string; x: number; y: number }> = [];

        const ctx = {
            fillStyle: '',
            font: '',
            textBaseline: 'alphabetic' as CanvasTextBaseline,
            fillText(text: string, x: number, y: number) {
                fillCalls.push({ text, x, y });
            },
            measureText(_text: string) {
                return { width: 12 };
            },
            save() {
                operations.push('save');
            },
            restore() {
                operations.push('restore');
            },
            translate(x: number, y: number) {
                operations.push(`translate:${x},${y}`);
            },
            rotate(angle: number) {
                operations.push(`rotate:${angle}`);
            }
        } as unknown as CanvasRenderingContext2D;

        const deps: TextRendererDependencies = {
            ctx,
            fontMetrics: createMockFontMetrics(),
            options: { scale: 1 }
        };

        const renderer = new TextRenderer(deps);
        const bounds = new Bounds(40, 10, 24, 60);
        const text = new TextBounds('AB', bounds);

        renderer.renderTextWithLetterSpacing(text, 2, 16, WRITING_MODE.VERTICAL_RL);

        // Consecutive Latin glyphs are now batched into one save/restore pair.
        // 'A' renders at offset 0, 'B' at offset 14 (width 12 + letterSpacing 2).
        deepStrictEqual(fillCalls, [
            { text: 'A', x: 0, y: 0 },
            { text: 'B', x: 0, y: 14 }
        ]);
        deepStrictEqual(operations, ['save', 'translate:56,10', `rotate:${Math.PI / 2}`, 'restore']);
    });
});

describe('renderTextNode', () => {
    it('should use FontMetrics baseline instead of fontSize.number for vertical positioning', async () => {
        const getMetricsCalls: Array<{ fontFamily: string; fontSize: string }> = [];
        const spyFontMetrics = {
            getMetrics: (fontFamily: string, fontSize: string) => {
                getMetricsCalls.push({ fontFamily, fontSize });
                // Return a baseline that is distinctly different from the fontSize
                // so we can verify it's used instead of fontSize.number
                return { baseline: 14, middle: 8 };
            }
        } as unknown as FontMetrics;

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
            measureText(_text: string) {
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

        const deps: TextRendererDependencies = {
            ctx,
            fontMetrics: spyFontMetrics,
            options: { scale: 1 }
        };

        const renderer = new TextRenderer(deps);

        const bounds = new Bounds(10, 50, 100, 25);
        const textContainer = {
            textBounds: [new TextBounds('gjqy', bounds)],
            parse: () => {}
        } as unknown as Parameters<typeof renderer.renderTextNode>[0];

        // Mock createFontStyle to return values matching our spy expectations
        renderer.createFontStyle = () => ['16px Arial', 'Arial', '16px'];

        const mockStyles = {
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
            paintOrder: [0], // FILL only
            direction: 0,
            writingMode: WRITING_MODE.HORIZONTAL_TB,
            display: 0,
            webkitLineClamp: 0,
            textOverflow: 0,
            overflowX: 0,
            overflowY: 0
        } as unknown as Parameters<typeof renderer.renderTextNode>[1];

        await renderer.renderTextNode(textContainer, mockStyles);

        // Verify FontMetrics.getMetrics was called with correct args
        strictEqual(getMetricsCalls.length, 1, 'should call getMetrics exactly once');
        strictEqual(getMetricsCalls[0].fontFamily, 'Arial', 'should pass fontFamily');
        strictEqual(getMetricsCalls[0].fontSize, '16px', 'should pass fontSize string');

        // Verify text was positioned using the measured baseline (14),
        // NOT fontSize.number (16)
        strictEqual(fillCalls.length, 1);
        // Y should be: bounds.top(50) + measured baseline(14) = 64
        // NOT: bounds.top(50) + fontSize.number(16) = 66
        strictEqual(fillCalls[0].y, 64, 'should use measured baseline (64), not fontSize.number (66)');
    });
});
