import { describe, it, expect } from 'vitest';
import {
    isDigit,
    isHex,
    isLetter,
    isLowerCaseLetter,
    isUpperCaseLetter,
    isNonASCIICodePoint,
    isWhiteSpace,
    isNameStartCodePoint,
    isNameCodePoint,
    isNonPrintableCodePoint,
    isValidEscape,
    isIdentifierStart,
    isNumberStart,
    stringToNumber,
    isSurrogateCodePoint,
    LINE_FEED,
    SPACE,
    EOF,
    NULL,
    BACKSPACE,
    CHARACTER_TABULATION
} from '../token-constants';

describe('isDigit', () => {
    it('returns true for digits 0-9', () => {
        for (let i = 0x30; i <= 0x39; i++) {
            expect(isDigit(i)).toBe(true);
        }
    });

    it('returns false for letters and symbols', () => {
        expect(isDigit(0x41)).toBe(false); // A
        expect(isDigit(0x20)).toBe(false); // space
        expect(isDigit(-1)).toBe(false);
    });
});

describe('isHex', () => {
    it('returns true for 0-9', () => {
        expect(isHex(0x30)).toBe(true);
        expect(isHex(0x39)).toBe(true);
    });

    it('returns true for a-f', () => {
        expect(isHex(0x61)).toBe(true);
        expect(isHex(0x66)).toBe(true);
    });

    it('returns true for A-F', () => {
        expect(isHex(0x41)).toBe(true);
        expect(isHex(0x46)).toBe(true);
    });

    it('returns false for non-hex characters', () => {
        expect(isHex(0x67)).toBe(false); // g
        expect(isHex(0x47)).toBe(false); // G
        expect(isHex(0x20)).toBe(false);
    });
});

describe('isLetter', () => {
    it('returns true for lowercase letters a-z', () => {
        expect(isLetter(0x61)).toBe(true);
        expect(isLetter(0x7a)).toBe(true);
    });

    it('returns true for uppercase letters A-Z', () => {
        expect(isLetter(0x41)).toBe(true);
        expect(isLetter(0x5a)).toBe(true);
    });

    it('returns false for digits and symbols', () => {
        expect(isLetter(0x30)).toBe(false);
        expect(isLetter(0x20)).toBe(false);
    });
});

describe('isLowerCaseLetter', () => {
    it('distinguishes lower from upper case', () => {
        expect(isLowerCaseLetter(0x61)).toBe(true);
        expect(isLowerCaseLetter(0x41)).toBe(false);
        expect(isLowerCaseLetter(0x30)).toBe(false);
    });
});

describe('isUpperCaseLetter', () => {
    it('distinguishes upper from lower case', () => {
        expect(isUpperCaseLetter(0x41)).toBe(true);
        expect(isUpperCaseLetter(0x61)).toBe(false);
    });
});

describe('isWhiteSpace', () => {
    it('recognizes whitespace characters', () => {
        expect(isWhiteSpace(SPACE)).toBe(true);
        expect(isWhiteSpace(CHARACTER_TABULATION)).toBe(true);
        expect(isWhiteSpace(LINE_FEED)).toBe(true);
    });

    it('rejects non-whitespace', () => {
        expect(isWhiteSpace(0x41)).toBe(false);
    });
});

describe('isNonASCIICodePoint', () => {
    it('returns true for code points >= 0x80', () => {
        expect(isNonASCIICodePoint(0x80)).toBe(true);
        expect(isNonASCIICodePoint(0x100)).toBe(true);
    });

    it('returns false for ASCII code points', () => {
        expect(isNonASCIICodePoint(0x41)).toBe(false);
        expect(isNonASCIICodePoint(0x7f)).toBe(false);
    });
});

describe('isNameStartCodePoint', () => {
    it('accepts letters', () => {
        expect(isNameStartCodePoint(0x41)).toBe(true);
        expect(isNameStartCodePoint(0x61)).toBe(true);
    });

    it('accepts underscore', () => {
        expect(isNameStartCodePoint(0x5f)).toBe(true);
    });

    it('accepts non-ASCII code points', () => {
        expect(isNameStartCodePoint(0x80)).toBe(true);
    });

    it('rejects digits', () => {
        expect(isNameStartCodePoint(0x30)).toBe(false);
    });

    it('rejects hyphen', () => {
        expect(isNameStartCodePoint(0x2d)).toBe(false);
    });
});

describe('isNameCodePoint', () => {
    it('accepts letters', () => {
        expect(isNameCodePoint(0x41)).toBe(true);
    });

    it('accepts digits', () => {
        expect(isNameCodePoint(0x30)).toBe(true);
    });

    it('accepts hyphen', () => {
        expect(isNameCodePoint(0x2d)).toBe(true);
    });
});

describe('isNonPrintableCodePoint', () => {
    it('accepts controls', () => {
        expect(isNonPrintableCodePoint(NULL)).toBe(true);
        expect(isNonPrintableCodePoint(BACKSPACE)).toBe(true);
    });

    it('rejects printable characters', () => {
        expect(isNonPrintableCodePoint(0x41)).toBe(false);
        expect(isNonPrintableCodePoint(0x20)).toBe(false);
    });
});

describe('isSurrogateCodePoint', () => {
    it('detects surrogate range', () => {
        expect(isSurrogateCodePoint(0xd800)).toBe(true);
        expect(isSurrogateCodePoint(0xdfff)).toBe(true);
    });

    it('rejects non-surrogate', () => {
        expect(isSurrogateCodePoint(0x41)).toBe(false);
        expect(isSurrogateCodePoint(0xd7ff)).toBe(false);
    });
});

describe('isValidEscape', () => {
    it('accepts backslash + non-newline', () => {
        expect(isValidEscape(0x5c, 0x41)).toBe(true); // \A
    });

    it('rejects backslash + newline', () => {
        expect(isValidEscape(0x5c, LINE_FEED)).toBe(false);
    });

    it('rejects non-backslash first char', () => {
        expect(isValidEscape(0x41, 0x42)).toBe(false);
    });
});

describe('isIdentifierStart', () => {
    it('accepts letters as first code point', () => {
        expect(isIdentifierStart(0x41, 0, 0)).toBe(true);
    });

    it('accepts hyphen + letter', () => {
        expect(isIdentifierStart(0x2d, 0x41, 0)).toBe(true);
    });

    it('accepts hyphen + valid escape', () => {
        expect(isIdentifierStart(0x2d, 0x5c, 0x41)).toBe(true); // -\A
    });

    it('rejects hyphen + digit', () => {
        expect(isIdentifierStart(0x2d, 0x30, 0)).toBe(false);
    });

    it('rejects hyphen + hyphen (not a name-start)', () => {
        expect(isIdentifierStart(0x2d, 0x2d, 0)).toBe(false);
    });
});

describe('isNumberStart', () => {
    it('accepts digit', () => {
        expect(isNumberStart(0x31, 0, 0)).toBe(true);
    });

    it('accepts plus + digit', () => {
        expect(isNumberStart(0x2b, 0x31, 0)).toBe(true);
    });

    it('accepts dot + digit', () => {
        expect(isNumberStart(0x2e, 0x31, 0)).toBe(true);
    });

    it('rejects letter', () => {
        expect(isNumberStart(0x41, 0, 0)).toBe(false);
    });
});

describe('stringToNumber', () => {
    it('parses positive integer', () => {
        expect(stringToNumber([0x31, 0x32, 0x33])).toBe(123);
    });

    it('parses float', () => {
        expect(stringToNumber([0x31, 0x2e, 0x35])).toBe(1.5);
    });

    it('parses negative number', () => {
        const result = stringToNumber([0x2d, 0x31, 0x30]); // -10
        expect(result).toBe(-10);
    });

    it('parses zero', () => {
        expect(stringToNumber([0x30])).toBe(0);
    });

    it('parses number with exponent', () => {
        const result = stringToNumber([0x31, 0x65, 0x32]); // 1e2
        expect(result).toBe(100);
    });
});

describe('code point constants', () => {
    it('EOF is -1', () => {
        expect(EOF).toBe(-1);
    });

    it('LINE_FEED is 0x0a', () => {
        expect(LINE_FEED).toBe(0x0a);
    });

    it('NULL is 0', () => {
        expect(NULL).toBe(0);
    });
});
