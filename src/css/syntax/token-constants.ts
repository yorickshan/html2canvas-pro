// CSS tokenizer code-point constants and character-classification predicates.
// Pure functions with no runtime dependencies — usable without the Tokenizer class.

const LINE_FEED = 0x000a;
const SOLIDUS = 0x002f;
const REVERSE_SOLIDUS = 0x005c;
const CHARACTER_TABULATION = 0x0009;
const SPACE = 0x0020;
const QUOTATION_MARK = 0x0022;
const EQUALS_SIGN = 0x003d;
const NUMBER_SIGN = 0x0023;
const DOLLAR_SIGN = 0x0024;
const PERCENTAGE_SIGN = 0x0025;
const APOSTROPHE = 0x0027;
const LEFT_PARENTHESIS = 0x0028;
const RIGHT_PARENTHESIS = 0x0029;
const LOW_LINE = 0x005f;
const HYPHEN_MINUS = 0x002d;
const EXCLAMATION_MARK = 0x0021;
const LESS_THAN_SIGN = 0x003c;
const GREATER_THAN_SIGN = 0x003e;
const COMMERCIAL_AT = 0x0040;
const LEFT_SQUARE_BRACKET = 0x005b;
const RIGHT_SQUARE_BRACKET = 0x005d;
const CIRCUMFLEX_ACCENT = 0x003d;
const LEFT_CURLY_BRACKET = 0x007b;
const QUESTION_MARK = 0x003f;
const RIGHT_CURLY_BRACKET = 0x007d;
const VERTICAL_LINE = 0x007c;
const TILDE = 0x007e;
const CONTROL = 0x0080;
const REPLACEMENT_CHARACTER = 0xfffd;
const ASTERISK = 0x002a;
const PLUS_SIGN = 0x002b;
const COMMA = 0x002c;
const COLON = 0x003a;
const SEMICOLON = 0x003b;
const FULL_STOP = 0x002e;
const NULL = 0x0000;
const BACKSPACE = 0x0008;
const LINE_TABULATION = 0x000b;
const SHIFT_OUT = 0x000e;
const INFORMATION_SEPARATOR_ONE = 0x001f;
const DELETE = 0x007f;
const EOF = -1;
const ZERO = 0x0030;
const a = 0x0061;
const e = 0x0065;
const f = 0x0066;
const u = 0x0075;
const z = 0x007a;
const A = 0x0041;
const E = 0x0045;
const F = 0x0046;
const U = 0x0055;
const Z = 0x005a;

/** Re-exported code-point constants used by the Tokenizer class internally. */
export {
    LINE_FEED,
    SOLIDUS,
    REVERSE_SOLIDUS,
    CHARACTER_TABULATION,
    SPACE,
    QUOTATION_MARK,
    EQUALS_SIGN,
    NUMBER_SIGN,
    DOLLAR_SIGN,
    PERCENTAGE_SIGN,
    APOSTROPHE,
    LEFT_PARENTHESIS,
    RIGHT_PARENTHESIS,
    LOW_LINE,
    HYPHEN_MINUS,
    EXCLAMATION_MARK,
    LESS_THAN_SIGN,
    GREATER_THAN_SIGN,
    COMMERCIAL_AT,
    LEFT_SQUARE_BRACKET,
    RIGHT_SQUARE_BRACKET,
    CIRCUMFLEX_ACCENT,
    LEFT_CURLY_BRACKET,
    QUESTION_MARK,
    RIGHT_CURLY_BRACKET,
    VERTICAL_LINE,
    TILDE,
    CONTROL,
    REPLACEMENT_CHARACTER,
    ASTERISK,
    PLUS_SIGN,
    COMMA,
    COLON,
    SEMICOLON,
    FULL_STOP,
    NULL,
    BACKSPACE,
    LINE_TABULATION,
    SHIFT_OUT,
    INFORMATION_SEPARATOR_ONE,
    DELETE,
    EOF,
    ZERO,
    a,
    e,
    f,
    u,
    z,
    A,
    E,
    F,
    U,
    Z
};

import { fromCodePoint } from 'css-line-break';

const isDigit = (codePoint: number) => codePoint >= ZERO && codePoint <= 0x0039;
const isSurrogateCodePoint = (codePoint: number) => codePoint >= 0xd800 && codePoint <= 0xdfff;
const isHex = (codePoint: number) =>
    isDigit(codePoint) || (codePoint >= A && codePoint <= F) || (codePoint >= a && codePoint <= f);
const isLowerCaseLetter = (codePoint: number) => codePoint >= a && codePoint <= z;
const isUpperCaseLetter = (codePoint: number) => codePoint >= A && codePoint <= Z;
const isLetter = (codePoint: number) => isLowerCaseLetter(codePoint) || isUpperCaseLetter(codePoint);
const isNonASCIICodePoint = (codePoint: number) => codePoint >= CONTROL;
const isWhiteSpace = (codePoint: number): boolean =>
    codePoint === LINE_FEED || codePoint === CHARACTER_TABULATION || codePoint === SPACE;
const isNameStartCodePoint = (codePoint: number): boolean =>
    isLetter(codePoint) || isNonASCIICodePoint(codePoint) || codePoint === LOW_LINE;
const isNameCodePoint = (codePoint: number): boolean =>
    isNameStartCodePoint(codePoint) || isDigit(codePoint) || codePoint === HYPHEN_MINUS;
const isNonPrintableCodePoint = (codePoint: number): boolean => {
    return (
        (codePoint >= NULL && codePoint <= BACKSPACE) ||
        codePoint === LINE_TABULATION ||
        (codePoint >= SHIFT_OUT && codePoint <= INFORMATION_SEPARATOR_ONE) ||
        codePoint === DELETE
    );
};
const isValidEscape = (c1: number, c2: number): boolean => {
    if (c1 !== REVERSE_SOLIDUS) {
        return false;
    }

    return c2 !== LINE_FEED;
};
const isIdentifierStart = (c1: number, c2: number, c3: number): boolean => {
    if (c1 === HYPHEN_MINUS) {
        return isNameStartCodePoint(c2) || isValidEscape(c2, c3);
    } else if (isNameStartCodePoint(c1)) {
        return true;
    } else if (c1 === REVERSE_SOLIDUS && isValidEscape(c1, c2)) {
        return true;
    }
    return false;
};

const isNumberStart = (c1: number, c2: number, c3: number): boolean => {
    if (c1 === PLUS_SIGN || c1 === HYPHEN_MINUS) {
        if (isDigit(c2)) {
            return true;
        }

        return c2 === FULL_STOP && isDigit(c3);
    }

    if (c1 === FULL_STOP) {
        return isDigit(c2);
    }

    return isDigit(c1);
};

/** Re-exported character-classification predicates. */
export {
    isDigit,
    isSurrogateCodePoint,
    isHex,
    isLowerCaseLetter,
    isUpperCaseLetter,
    isLetter,
    isNonASCIICodePoint,
    isWhiteSpace,
    isNameStartCodePoint,
    isNameCodePoint,
    isNonPrintableCodePoint,
    isValidEscape,
    isIdentifierStart,
    isNumberStart
};

const stringToNumber = (codePoints: number[]): number => {
    let c = 0;
    let sign = 1;
    if (codePoints[c] === PLUS_SIGN || codePoints[c] === HYPHEN_MINUS) {
        if (codePoints[c] === HYPHEN_MINUS) {
            sign = -1;
        }
        c++;
    }

    const integers = [];

    while (isDigit(codePoints[c])) {
        integers.push(codePoints[c++]);
    }

    const int = integers.length ? parseInt(fromCodePoint(...integers), 10) : 0;

    if (codePoints[c] === FULL_STOP) {
        c++;
    }

    const fraction = [];
    while (isDigit(codePoints[c])) {
        fraction.push(codePoints[c++]);
    }

    const fracd = fraction.length;
    const frac = fracd ? parseInt(fromCodePoint(...fraction), 10) : 0;

    if (codePoints[c] === E || codePoints[c] === e) {
        c++;
    }

    let expsign = 1;

    if (codePoints[c] === PLUS_SIGN || codePoints[c] === HYPHEN_MINUS) {
        if (codePoints[c] === HYPHEN_MINUS) {
            expsign = -1;
        }
        c++;
    }

    const exponent = [];

    while (isDigit(codePoints[c])) {
        exponent.push(codePoints[c++]);
    }

    const exp = exponent.length ? parseInt(fromCodePoint(...exponent), 10) : 0;

    return sign * (int + frac * Math.pow(10, -fracd)) * Math.pow(10, expsign * exp);
};

/** Re-exported helper: converts an array of code points to a JS number. */
export { stringToNumber };
