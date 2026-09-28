import { describe, it, expect } from 'vitest';
import { CounterState, createCounterText } from '../counter';
import { LIST_STYLE_TYPE } from '../../../property-descriptors/list-style-type';

type CounterStyle = Parameters<CounterState['parse']>[0];

const asStyle = (
    counterIncrement: { counter: string; increment: number }[] | null,
    counterReset: { counter: string; reset: number }[]
): CounterStyle => ({ counterIncrement, counterReset }) as CounterStyle;

describe('CounterState', () => {
    it('getCounterValue returns 1 for an unknown counter', () => {
        const state = new CounterState();
        expect(state.getCounterValue('missing')).toBe(1);
    });

    it('getCounterValues returns an empty array for an unknown counter', () => {
        const state = new CounterState();
        expect(state.getCounterValues('missing')).toEqual([]);
    });

    it('parse applies counter-reset and reports the counter names', () => {
        const state = new CounterState();
        const names = state.parse(asStyle(null, [{ counter: 'list-item', reset: 3 }]));
        expect(names).toEqual(['list-item']);
        expect(state.getCounterValue('list-item')).toBe(3);
        expect(state.getCounterValues('list-item')).toEqual([3]);
    });

    it('parse applies multiple resets including a zero reset', () => {
        const state = new CounterState();
        const names = state.parse(
            asStyle(null, [
                { counter: 'a', reset: 0 },
                { counter: 'b', reset: 5 }
            ])
        );
        expect(names).toEqual(['a', 'b']);
        expect(state.getCounterValue('a')).toBe(0);
        expect(state.getCounterValue('b')).toBe(5);
    });

    it('parse pushes a new scope for an existing counter instead of replacing it', () => {
        const state = new CounterState();
        state.parse(asStyle(null, [{ counter: 'c', reset: 1 }]));
        state.parse(asStyle(null, [{ counter: 'c', reset: 10 }]));
        expect(state.getCounterValues('c')).toEqual([1, 10]);
        expect(state.getCounterValue('c')).toBe(10);
    });

    it('counter-increment adds to the innermost value and blocks the reset', () => {
        const state = new CounterState();
        state.parse(asStyle(null, [{ counter: 'c', reset: 2 }]));
        const names = state.parse(asStyle([{ counter: 'c', increment: 3 }], [{ counter: 'c', reset: 99 }]));
        expect(names).toEqual([]);
        expect(state.getCounterValue('c')).toBe(5);
        expect(state.getCounterValues('c')).toEqual([5]);
    });

    it('a zero counter-increment does not block the reset', () => {
        const state = new CounterState();
        const names = state.parse(asStyle([{ counter: 'c', increment: 0 }], [{ counter: 'c', reset: 7 }]));
        expect(names).toEqual(['c']);
        expect(state.getCounterValue('c')).toBe(7);
    });

    it('counter-increment on an unknown counter is ignored and reset still applies', () => {
        const state = new CounterState();
        const names = state.parse(asStyle([{ counter: 'ghost', increment: 2 }], [{ counter: 'c', reset: 7 }]));
        expect(names).toEqual(['c']);
        expect(state.getCounterValue('c')).toBe(7);
        expect(state.getCounterValue('ghost')).toBe(1);
    });

    it('counter-increment re-initialises an existing but empty counter to 1 plus the increment', () => {
        const state = new CounterState();
        state.parse(asStyle(null, [{ counter: 'c', reset: 4 }]));
        state.pop(['c']);
        expect(state.getCounterValues('c')).toEqual([]);
        expect(state.getCounterValue('c')).toBe(1);
        const names = state.parse(asStyle([{ counter: 'c', increment: 5 }], [{ counter: 'c', reset: 42 }]));
        expect(names).toEqual([]);
        expect(state.getCounterValue('c')).toBe(6);
    });

    it('counter-increment only touches counters that already exist', () => {
        const state = new CounterState();
        state.parse(asStyle(null, [{ counter: 'a', reset: 1 }]));
        const names = state.parse(
            asStyle(
                [
                    { counter: 'a', increment: 2 },
                    { counter: 'missing', increment: 9 }
                ],
                [{ counter: 'b', reset: 5 }]
            )
        );
        expect(names).toEqual([]);
        expect(state.getCounterValue('a')).toBe(3);
        expect(state.getCounterValues('b')).toEqual([]);
        expect(state.getCounterValues('missing')).toEqual([]);
    });

    it('pop removes the innermost counter value', () => {
        const state = new CounterState();
        state.parse(asStyle(null, [{ counter: 'c', reset: 1 }]));
        state.parse(asStyle(null, [{ counter: 'c', reset: 2 }]));
        state.pop(['c']);
        expect(state.getCounterValues('c')).toEqual([1]);
        expect(state.getCounterValue('c')).toBe(1);
    });
});

type CounterCase = [LIST_STYLE_TYPE, number, boolean, string];

const counterCases: CounterCase[] = [
    // bullets
    [LIST_STYLE_TYPE.DISC, 1, true, '• '],
    [LIST_STYLE_TYPE.DISC, 1, false, '•'],
    [LIST_STYLE_TYPE.CIRCLE, 1, true, '◦ '],
    [LIST_STYLE_TYPE.CIRCLE, 1, false, '◦'],
    [LIST_STYLE_TYPE.SQUARE, 1, true, '◾ '],
    [LIST_STYLE_TYPE.SQUARE, 1, false, '◾'],

    // decimal (explicit case + default fallbacks)
    [LIST_STYLE_TYPE.DECIMAL, 0, true, '0. '],
    [LIST_STYLE_TYPE.DECIMAL, 5, true, '5. '],
    [LIST_STYLE_TYPE.DECIMAL, 12, true, '12. '],
    [LIST_STYLE_TYPE.DECIMAL, -3, true, '-3. '],
    [LIST_STYLE_TYPE.DECIMAL, 5, false, '5'],
    [LIST_STYLE_TYPE.NONE, 5, true, '5. '],
    [LIST_STYLE_TYPE.ETHIOPIC_NUMERIC, 5, true, '5. '],
    [LIST_STYLE_TYPE.MALAYALAM, 5, true, '5. '],
    [LIST_STYLE_TYPE.DISCLOSURE_OPEN, 5, true, '5. '],
    [LIST_STYLE_TYPE.DISCLOSURE_CLOSED, 5, true, '5. '],

    // decimal-leading-zero (pads when the rendered string is shorter than 4 chars)
    [LIST_STYLE_TYPE.DECIMAL_LEADING_ZERO, 5, true, '05. '],
    [LIST_STYLE_TYPE.DECIMAL_LEADING_ZERO, 12, true, '12. '],
    [LIST_STYLE_TYPE.DECIMAL_LEADING_ZERO, -5, true, '-5. '],
    [LIST_STYLE_TYPE.DECIMAL_LEADING_ZERO, 5, false, '05'],

    // cjk-decimal (symbol styles resolve the decremented value: 5 -> index 4)
    [LIST_STYLE_TYPE.CJK_DECIMAL, 0, true, 'undefined、'],
    [LIST_STYLE_TYPE.CJK_DECIMAL, 5, true, '四、'],
    [LIST_STYLE_TYPE.CJK_DECIMAL, 12, true, '〇一、'],
    [LIST_STYLE_TYPE.CJK_DECIMAL, 5, false, '四'],

    // roman
    [LIST_STYLE_TYPE.LOWER_ROMAN, 4, true, 'iv. '],
    [LIST_STYLE_TYPE.LOWER_ROMAN, 9, true, 'ix. '],
    [LIST_STYLE_TYPE.LOWER_ROMAN, 1990, true, 'mcmxc. '],
    [LIST_STYLE_TYPE.LOWER_ROMAN, 3888, true, 'mmmdccclxxxviii. '],
    [LIST_STYLE_TYPE.LOWER_ROMAN, 0, true, '0. '],
    [LIST_STYLE_TYPE.LOWER_ROMAN, 4000, true, '4000. '],
    [LIST_STYLE_TYPE.LOWER_ROMAN, 4, false, 'iv'],
    [LIST_STYLE_TYPE.UPPER_ROMAN, 4, true, 'IV. '],
    [LIST_STYLE_TYPE.UPPER_ROMAN, 1990, true, 'MCMXC. '],
    [LIST_STYLE_TYPE.UPPER_ROMAN, 3888, true, 'MMMDCCCLXXXVIII. '],
    [LIST_STYLE_TYPE.UPPER_ROMAN, 0, true, '0. '],
    [LIST_STYLE_TYPE.UPPER_ROMAN, 4000, true, '4000. '],

    // greek / alpha
    [LIST_STYLE_TYPE.LOWER_GREEK, 1, true, 'α. '],
    [LIST_STYLE_TYPE.LOWER_GREEK, 3, true, 'γ. '],
    [LIST_STYLE_TYPE.LOWER_GREEK, 26, true, 'αα. '],
    [LIST_STYLE_TYPE.LOWER_GREEK, -1, true, '-α. '],
    [LIST_STYLE_TYPE.LOWER_ALPHA, 1, true, 'a. '],
    [LIST_STYLE_TYPE.LOWER_ALPHA, 26, true, 'z. '],
    [LIST_STYLE_TYPE.LOWER_ALPHA, 27, true, 'aa. '],
    [LIST_STYLE_TYPE.UPPER_ALPHA, 1, true, 'A. '],
    [LIST_STYLE_TYPE.UPPER_ALPHA, 26, true, 'Z. '],
    [LIST_STYLE_TYPE.UPPER_ALPHA, 27, true, 'AA. '],

    // armenian (additive with decimal fallback outside 1..9999)
    [LIST_STYLE_TYPE.ARMENIAN, 1, true, 'Ա. '],
    [LIST_STYLE_TYPE.ARMENIAN, 20, true, 'Ի. '],
    [LIST_STYLE_TYPE.ARMENIAN, 9999, true, 'ՔՋՂԹ. '],
    [LIST_STYLE_TYPE.ARMENIAN, 0, true, '0. '],
    [LIST_STYLE_TYPE.ARMENIAN, 10000, true, '10000. '],
    [LIST_STYLE_TYPE.UPPER_ARMENIAN, 1, true, 'Ա. '],
    [LIST_STYLE_TYPE.UPPER_ARMENIAN, 4, true, 'Դ. '],
    [LIST_STYLE_TYPE.LOWER_ARMENIAN, 1, true, 'ա. '],
    [LIST_STYLE_TYPE.LOWER_ARMENIAN, 9999, true, 'քջղթ. '],

    // numeric digit-range styles
    [LIST_STYLE_TYPE.ARABIC_INDIC, 1, true, '١. '],
    [LIST_STYLE_TYPE.ARABIC_INDIC, 15, true, '١٥. '],
    [LIST_STYLE_TYPE.BENGALI, 1, true, '১. '],
    [LIST_STYLE_TYPE.BENGALI, 12, true, '১২. '],
    [LIST_STYLE_TYPE.CAMBODIAN, 1, true, '១. '],
    [LIST_STYLE_TYPE.CAMBODIAN, 12, true, '១២. '],
    [LIST_STYLE_TYPE.KHMER, 5, true, '៥. '],
    [LIST_STYLE_TYPE.DEVANAGARI, 1, true, '१. '],
    [LIST_STYLE_TYPE.DEVANAGARI, 12, true, '१२. '],
    [LIST_STYLE_TYPE.GUJARATI, 1, true, '૧. '],
    [LIST_STYLE_TYPE.GURMUKHI, 1, true, '੧. '],
    [LIST_STYLE_TYPE.KANNADA, 1, true, '೧. '],
    [LIST_STYLE_TYPE.LAO, 1, true, '໑. '],
    [LIST_STYLE_TYPE.MONGOLIAN, 1, true, '᠑. '],
    [LIST_STYLE_TYPE.MYANMAR, 1, true, '၁. '],
    [LIST_STYLE_TYPE.ORIYA, 1, true, '୧. '],
    [LIST_STYLE_TYPE.PERSIAN, 1, true, '۱. '],
    [LIST_STYLE_TYPE.PERSIAN, 12, true, '۱۲. '],
    [LIST_STYLE_TYPE.TAMIL, 1, true, '௧. '],
    [LIST_STYLE_TYPE.TELUGU, 1, true, '౧. '],
    [LIST_STYLE_TYPE.THAI, 1, true, '๑. '],
    [LIST_STYLE_TYPE.THAI, 12, true, '๑๒. '],
    [LIST_STYLE_TYPE.TIBETAN, 1, true, '༡. '],

    // cjk cyclic symbol styles
    [LIST_STYLE_TYPE.CJK_EARTHLY_BRANCH, 1, true, '子、'],
    [LIST_STYLE_TYPE.CJK_EARTHLY_BRANCH, 2, true, '丑、'],
    [LIST_STYLE_TYPE.CJK_EARTHLY_BRANCH, 12, true, '亥、'],
    [LIST_STYLE_TYPE.CJK_EARTHLY_BRANCH, 13, true, '子子、'],
    [LIST_STYLE_TYPE.CJK_HEAVENLY_STEM, 1, true, '甲、'],
    [LIST_STYLE_TYPE.CJK_HEAVENLY_STEM, 10, true, '癸、'],
    [LIST_STYLE_TYPE.HIRAGANA, 1, true, 'あ. '],
    [LIST_STYLE_TYPE.HIRAGANA, 5, true, 'お. '],
    [LIST_STYLE_TYPE.HIRAGANA, 11, true, 'さ. '],
    [LIST_STYLE_TYPE.HIRAGANA_IROHA, 1, true, 'い. '],
    [LIST_STYLE_TYPE.HIRAGANA_IROHA, 3, true, 'は. '],
    [LIST_STYLE_TYPE.KATAKANA, 1, true, 'ア、'],
    [LIST_STYLE_TYPE.KATAKANA, 5, true, 'オ、'],
    [LIST_STYLE_TYPE.KATAKANA, 1, false, 'ア'],
    [LIST_STYLE_TYPE.KATAKANA_IROHA, 1, true, 'イ、'],
    [LIST_STYLE_TYPE.KATAKANA_IROHA, 3, true, 'ハ、'],

    // georgian (additive with decimal fallback outside 1..19999)
    [LIST_STYLE_TYPE.GEORGIAN, 1, true, 'ა. '],
    [LIST_STYLE_TYPE.GEORGIAN, 3, true, 'გ. '],
    [LIST_STYLE_TYPE.GEORGIAN, 10000, true, 'ჵ. '],
    [LIST_STYLE_TYPE.GEORGIAN, 19999, true, 'ჵჰშჟთ. '],
    [LIST_STYLE_TYPE.GEORGIAN, 0, true, '0. '],
    [LIST_STYLE_TYPE.GEORGIAN, 20000, true, '20000. '],

    // hebrew (additive with special 15-19 forms and decimal fallback outside 1..10999)
    [LIST_STYLE_TYPE.HEBREW, 1, true, 'א. '],
    [LIST_STYLE_TYPE.HEBREW, 10, true, 'י. '],
    [LIST_STYLE_TYPE.HEBREW, 15, true, 'טו. '],
    [LIST_STYLE_TYPE.HEBREW, 18, true, 'יח. '],
    [LIST_STYLE_TYPE.HEBREW, 20, true, 'כ. '],
    [LIST_STYLE_TYPE.HEBREW, 0, true, '0. '],
    [LIST_STYLE_TYPE.HEBREW, 11000, true, '11000. '],

    // chinese informal (CJK_IDEOGRAPHIC shares TRAD_CHINESE_INFORMAL)
    [LIST_STYLE_TYPE.CJK_IDEOGRAPHIC, 3, true, '三、'],
    [LIST_STYLE_TYPE.TRAD_CHINESE_INFORMAL, 11, true, '一十一、'],
    [LIST_STYLE_TYPE.TRAD_CHINESE_INFORMAL, 100, false, '一百'],

    // chinese formal (zero insertion between digits)
    [LIST_STYLE_TYPE.TRAD_CHINESE_FORMAL, 100, false, '壹佰'],
    [LIST_STYLE_TYPE.TRAD_CHINESE_FORMAL, 10, true, '壹拾零、'],
    [LIST_STYLE_TYPE.TRAD_CHINESE_FORMAL, 101, true, '壹佰零壹、'],
    [LIST_STYLE_TYPE.SIMP_CHINESE_FORMAL, 101, true, '壹佰零壹、'],

    // simp chinese informal
    [LIST_STYLE_TYPE.SIMP_CHINESE_INFORMAL, 0, true, '零、'],
    [LIST_STYLE_TYPE.SIMP_CHINESE_INFORMAL, 10, true, '一十、'],
    [LIST_STYLE_TYPE.SIMP_CHINESE_INFORMAL, 100, true, '一百、'],
    [LIST_STYLE_TYPE.SIMP_CHINESE_INFORMAL, -5, true, '负五、'],
    // outside ±9999 the cjk styles fall back to cjk-decimal
    [LIST_STYLE_TYPE.SIMP_CHINESE_INFORMAL, 10000, true, '八八八九、'],

    // japanese
    [LIST_STYLE_TYPE.JAPANESE_INFORMAL, 0, true, '〇、'],
    [LIST_STYLE_TYPE.JAPANESE_INFORMAL, 1, true, '一、'],
    [LIST_STYLE_TYPE.JAPANESE_INFORMAL, 10, true, '十、'],
    [LIST_STYLE_TYPE.JAPANESE_INFORMAL, 11, true, '十一、'],
    [LIST_STYLE_TYPE.JAPANESE_INFORMAL, 100, true, '百、'],
    [LIST_STYLE_TYPE.JAPANESE_INFORMAL, -3, true, 'マイナス三、'],
    [LIST_STYLE_TYPE.JAPANESE_FORMAL, 0, true, '零、'],
    [LIST_STYLE_TYPE.JAPANESE_FORMAL, 1, true, '壱、'],
    [LIST_STYLE_TYPE.JAPANESE_FORMAL, 12, true, '壱拾弐、'],

    // korean
    [LIST_STYLE_TYPE.KOREAN_HANGUL_FORMAL, 0, true, '영, '],
    [LIST_STYLE_TYPE.KOREAN_HANGUL_FORMAL, 1, true, '일, '],
    [LIST_STYLE_TYPE.KOREAN_HANGUL_FORMAL, 3, true, '삼, '],
    [LIST_STYLE_TYPE.KOREAN_HANGUL_FORMAL, 10, true, '일십영, '],
    [LIST_STYLE_TYPE.KOREAN_HANGUL_FORMAL, -2, true, '마이너스이, '],
    [LIST_STYLE_TYPE.KOREAN_HANJA_INFORMAL, 5, true, '五, '],
    [LIST_STYLE_TYPE.KOREAN_HANJA_INFORMAL, 10, true, '十, '],
    [LIST_STYLE_TYPE.KOREAN_HANJA_FORMAL, 3, true, '參, '],
    [LIST_STYLE_TYPE.KOREAN_HANJA_FORMAL, 10, true, '壹拾零, ']
];

describe('createCounterText', () => {
    counterCases.forEach(([type, value, appendSuffix, expected]) => {
        it(`formats ${value} with style ${type}${appendSuffix ? ' with' : ' without'} suffix as ${JSON.stringify(expected)}`, () => {
            expect(createCounterText(value, type, appendSuffix)).toBe(expected);
        });
    });
});
