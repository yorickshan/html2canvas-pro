import { describe, it, expect } from 'vitest';
import { Context } from '../../../core/context';
import { PropertyDescriptorParsingType } from '../../property-descriptor';
import { listStyleType, LIST_STYLE_TYPE } from '../list-style-type';

const parse = (value: string) => listStyleType.parse({} as Context, value);

const cases: [string, LIST_STYLE_TYPE][] = [
    ['disc', LIST_STYLE_TYPE.DISC],
    ['circle', LIST_STYLE_TYPE.CIRCLE],
    ['square', LIST_STYLE_TYPE.SQUARE],
    ['decimal', LIST_STYLE_TYPE.DECIMAL],
    ['cjk-decimal', LIST_STYLE_TYPE.CJK_DECIMAL],
    ['decimal-leading-zero', LIST_STYLE_TYPE.DECIMAL_LEADING_ZERO],
    ['lower-roman', LIST_STYLE_TYPE.LOWER_ROMAN],
    ['upper-roman', LIST_STYLE_TYPE.UPPER_ROMAN],
    ['lower-greek', LIST_STYLE_TYPE.LOWER_GREEK],
    ['lower-alpha', LIST_STYLE_TYPE.LOWER_ALPHA],
    ['upper-alpha', LIST_STYLE_TYPE.UPPER_ALPHA],
    ['arabic-indic', LIST_STYLE_TYPE.ARABIC_INDIC],
    ['armenian', LIST_STYLE_TYPE.ARMENIAN],
    ['bengali', LIST_STYLE_TYPE.BENGALI],
    ['cambodian', LIST_STYLE_TYPE.CAMBODIAN],
    ['cjk-earthly-branch', LIST_STYLE_TYPE.CJK_EARTHLY_BRANCH],
    ['cjk-heavenly-stem', LIST_STYLE_TYPE.CJK_HEAVENLY_STEM],
    ['cjk-ideographic', LIST_STYLE_TYPE.CJK_IDEOGRAPHIC],
    ['devanagari', LIST_STYLE_TYPE.DEVANAGARI],
    ['ethiopic-numeric', LIST_STYLE_TYPE.ETHIOPIC_NUMERIC],
    ['georgian', LIST_STYLE_TYPE.GEORGIAN],
    ['gujarati', LIST_STYLE_TYPE.GUJARATI],
    ['gurmukhi', LIST_STYLE_TYPE.GURMUKHI],
    ['hebrew', LIST_STYLE_TYPE.HEBREW],
    ['hiragana', LIST_STYLE_TYPE.HIRAGANA],
    ['hiragana-iroha', LIST_STYLE_TYPE.HIRAGANA_IROHA],
    ['japanese-formal', LIST_STYLE_TYPE.JAPANESE_FORMAL],
    ['japanese-informal', LIST_STYLE_TYPE.JAPANESE_INFORMAL],
    ['kannada', LIST_STYLE_TYPE.KANNADA],
    ['katakana', LIST_STYLE_TYPE.KATAKANA],
    ['katakana-iroha', LIST_STYLE_TYPE.KATAKANA_IROHA],
    ['khmer', LIST_STYLE_TYPE.KHMER],
    ['korean-hangul-formal', LIST_STYLE_TYPE.KOREAN_HANGUL_FORMAL],
    ['korean-hanja-formal', LIST_STYLE_TYPE.KOREAN_HANJA_FORMAL],
    ['korean-hanja-informal', LIST_STYLE_TYPE.KOREAN_HANJA_INFORMAL],
    ['lao', LIST_STYLE_TYPE.LAO],
    ['lower-armenian', LIST_STYLE_TYPE.LOWER_ARMENIAN],
    ['malayalam', LIST_STYLE_TYPE.MALAYALAM],
    ['mongolian', LIST_STYLE_TYPE.MONGOLIAN],
    ['myanmar', LIST_STYLE_TYPE.MYANMAR],
    ['oriya', LIST_STYLE_TYPE.ORIYA],
    ['persian', LIST_STYLE_TYPE.PERSIAN],
    ['simp-chinese-formal', LIST_STYLE_TYPE.SIMP_CHINESE_FORMAL],
    ['simp-chinese-informal', LIST_STYLE_TYPE.SIMP_CHINESE_INFORMAL],
    ['tamil', LIST_STYLE_TYPE.TAMIL],
    ['telugu', LIST_STYLE_TYPE.TELUGU],
    ['thai', LIST_STYLE_TYPE.THAI],
    ['tibetan', LIST_STYLE_TYPE.TIBETAN],
    ['trad-chinese-formal', LIST_STYLE_TYPE.TRAD_CHINESE_FORMAL],
    ['trad-chinese-informal', LIST_STYLE_TYPE.TRAD_CHINESE_INFORMAL],
    ['upper-armenian', LIST_STYLE_TYPE.UPPER_ARMENIAN],
    ['disclosure-open', LIST_STYLE_TYPE.DISCLOSURE_OPEN],
    ['disclosure-closed', LIST_STYLE_TYPE.DISCLOSURE_CLOSED]
];

describe('list-style-type descriptor', () => {
    it('has descriptor metadata', () => {
        expect(listStyleType.name).toBe('list-style-type');
        expect(listStyleType.initialValue).toBe('none');
        expect(listStyleType.prefix).toBe(false);
        expect(listStyleType.type).toBe(PropertyDescriptorParsingType.IDENT_VALUE);
    });

    it('parses none', () => {
        expect(parse('none')).toBe(LIST_STYLE_TYPE.NONE);
    });

    cases.forEach(([ident, expected]) => {
        it(`parses ${ident}`, () => {
            expect(parse(ident)).toBe(expected);
        });
    });

    it('falls back to none for an unknown identifier', () => {
        expect(parse('xyz')).toBe(LIST_STYLE_TYPE.NONE);
    });

    it('is case sensitive and falls back to none for uppercase identifiers', () => {
        expect(parse('DISC')).toBe(LIST_STYLE_TYPE.NONE);
    });

    it('falls back to none for identifiers that only share a prefix', () => {
        expect(parse('decimalx')).toBe(LIST_STYLE_TYPE.NONE);
    });
});
