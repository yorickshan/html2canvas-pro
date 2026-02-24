import { ok, strictEqual, deepStrictEqual } from 'assert';
import { TextRenderer, TextRendererDependencies, hasCJKCharacters } from '../text-renderer';
import { Context } from '../../../core/context';
import { Bounds } from '../../../css/layout/bounds';
import { TextBounds } from '../../../css/layout/text';
import { Html2CanvasConfig } from '../../../config';

const createMockContext = (): Context => {
    const mockWindow = {
        document: {
            createElement: (_name: string) => {
                let _href = '';
                return {
                    set href(value: string) {
                        _href = value;
                    },
                    get href() {
                        return _href;
                    },
                    get protocol() {
                        return 'http:';
                    },
                    get hostname() {
                        return 'localhost';
                    },
                    get port() {
                        return '';
                    }
                };
            }
        },
        location: { href: 'http://localhost/' }
    } as unknown as Window;

    const config = new Html2CanvasConfig({ window: mockWindow });
    return new Context(
        {
            logging: false,
            imageTimeout: 15000,
            useCORS: false,
            allowTaint: false
        },
        new Bounds(0, 0, 800, 600),
        config
    );
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
            context: createMockContext(),
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
            context: createMockContext(),
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
            context: createMockContext(),
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
            context: createMockContext(),
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
            context: createMockContext(),
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
            context: createMockContext(),
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
            context: createMockContext(),
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
            context: createMockContext(),
            options: { scale: 1 }
        };

        const renderer = new TextRenderer(deps);
        const bounds = new Bounds(0, 0, 100, 25);
        const text = new TextBounds('', bounds);

        // Should not throw
        renderer.renderTextWithLetterSpacing(text, 5, 20);
        renderer.renderTextWithLetterSpacing(text, 0, 20);
    });
});
