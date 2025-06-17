"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStyleType = void 0;
exports.listStyleType = {
    name: 'list-style-type',
    initialValue: 'none',
    prefix: false,
    type: 2 /* PropertyDescriptorParsingType.IDENT_VALUE */,
    parse: function (_context, type) {
        switch (type) {
            case 'disc':
                return 0 /* LIST_STYLE_TYPE.DISC */;
            case 'circle':
                return 1 /* LIST_STYLE_TYPE.CIRCLE */;
            case 'square':
                return 2 /* LIST_STYLE_TYPE.SQUARE */;
            case 'decimal':
                return 3 /* LIST_STYLE_TYPE.DECIMAL */;
            case 'cjk-decimal':
                return 4 /* LIST_STYLE_TYPE.CJK_DECIMAL */;
            case 'decimal-leading-zero':
                return 5 /* LIST_STYLE_TYPE.DECIMAL_LEADING_ZERO */;
            case 'lower-roman':
                return 6 /* LIST_STYLE_TYPE.LOWER_ROMAN */;
            case 'upper-roman':
                return 7 /* LIST_STYLE_TYPE.UPPER_ROMAN */;
            case 'lower-greek':
                return 8 /* LIST_STYLE_TYPE.LOWER_GREEK */;
            case 'lower-alpha':
                return 9 /* LIST_STYLE_TYPE.LOWER_ALPHA */;
            case 'upper-alpha':
                return 10 /* LIST_STYLE_TYPE.UPPER_ALPHA */;
            case 'arabic-indic':
                return 11 /* LIST_STYLE_TYPE.ARABIC_INDIC */;
            case 'armenian':
                return 12 /* LIST_STYLE_TYPE.ARMENIAN */;
            case 'bengali':
                return 13 /* LIST_STYLE_TYPE.BENGALI */;
            case 'cambodian':
                return 14 /* LIST_STYLE_TYPE.CAMBODIAN */;
            case 'cjk-earthly-branch':
                return 15 /* LIST_STYLE_TYPE.CJK_EARTHLY_BRANCH */;
            case 'cjk-heavenly-stem':
                return 16 /* LIST_STYLE_TYPE.CJK_HEAVENLY_STEM */;
            case 'cjk-ideographic':
                return 17 /* LIST_STYLE_TYPE.CJK_IDEOGRAPHIC */;
            case 'devanagari':
                return 18 /* LIST_STYLE_TYPE.DEVANAGARI */;
            case 'ethiopic-numeric':
                return 19 /* LIST_STYLE_TYPE.ETHIOPIC_NUMERIC */;
            case 'georgian':
                return 20 /* LIST_STYLE_TYPE.GEORGIAN */;
            case 'gujarati':
                return 21 /* LIST_STYLE_TYPE.GUJARATI */;
            case 'gurmukhi':
                return 22 /* LIST_STYLE_TYPE.GURMUKHI */;
            case 'hebrew':
                return 52 /* LIST_STYLE_TYPE.HEBREW */;
            case 'hiragana':
                return 23 /* LIST_STYLE_TYPE.HIRAGANA */;
            case 'hiragana-iroha':
                return 24 /* LIST_STYLE_TYPE.HIRAGANA_IROHA */;
            case 'japanese-formal':
                return 25 /* LIST_STYLE_TYPE.JAPANESE_FORMAL */;
            case 'japanese-informal':
                return 26 /* LIST_STYLE_TYPE.JAPANESE_INFORMAL */;
            case 'kannada':
                return 27 /* LIST_STYLE_TYPE.KANNADA */;
            case 'katakana':
                return 28 /* LIST_STYLE_TYPE.KATAKANA */;
            case 'katakana-iroha':
                return 29 /* LIST_STYLE_TYPE.KATAKANA_IROHA */;
            case 'khmer':
                return 30 /* LIST_STYLE_TYPE.KHMER */;
            case 'korean-hangul-formal':
                return 31 /* LIST_STYLE_TYPE.KOREAN_HANGUL_FORMAL */;
            case 'korean-hanja-formal':
                return 32 /* LIST_STYLE_TYPE.KOREAN_HANJA_FORMAL */;
            case 'korean-hanja-informal':
                return 33 /* LIST_STYLE_TYPE.KOREAN_HANJA_INFORMAL */;
            case 'lao':
                return 34 /* LIST_STYLE_TYPE.LAO */;
            case 'lower-armenian':
                return 35 /* LIST_STYLE_TYPE.LOWER_ARMENIAN */;
            case 'malayalam':
                return 36 /* LIST_STYLE_TYPE.MALAYALAM */;
            case 'mongolian':
                return 37 /* LIST_STYLE_TYPE.MONGOLIAN */;
            case 'myanmar':
                return 38 /* LIST_STYLE_TYPE.MYANMAR */;
            case 'oriya':
                return 39 /* LIST_STYLE_TYPE.ORIYA */;
            case 'persian':
                return 40 /* LIST_STYLE_TYPE.PERSIAN */;
            case 'simp-chinese-formal':
                return 41 /* LIST_STYLE_TYPE.SIMP_CHINESE_FORMAL */;
            case 'simp-chinese-informal':
                return 42 /* LIST_STYLE_TYPE.SIMP_CHINESE_INFORMAL */;
            case 'tamil':
                return 43 /* LIST_STYLE_TYPE.TAMIL */;
            case 'telugu':
                return 44 /* LIST_STYLE_TYPE.TELUGU */;
            case 'thai':
                return 45 /* LIST_STYLE_TYPE.THAI */;
            case 'tibetan':
                return 46 /* LIST_STYLE_TYPE.TIBETAN */;
            case 'trad-chinese-formal':
                return 47 /* LIST_STYLE_TYPE.TRAD_CHINESE_FORMAL */;
            case 'trad-chinese-informal':
                return 48 /* LIST_STYLE_TYPE.TRAD_CHINESE_INFORMAL */;
            case 'upper-armenian':
                return 49 /* LIST_STYLE_TYPE.UPPER_ARMENIAN */;
            case 'disclosure-open':
                return 50 /* LIST_STYLE_TYPE.DISCLOSURE_OPEN */;
            case 'disclosure-closed':
                return 51 /* LIST_STYLE_TYPE.DISCLOSURE_CLOSED */;
            case 'none':
            default:
                return -1 /* LIST_STYLE_TYPE.NONE */;
        }
    }
};
//# sourceMappingURL=list-style-type.js.map