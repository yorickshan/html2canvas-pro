// https://www.w3.org/TR/css-syntax-3

import { toCodePoints, fromCodePoint } from 'css-line-break';
import { TokenType, FLAG_UNRESTRICTED, FLAG_ID, FLAG_INTEGER, FLAG_NUMBER } from './token-types';
import type {
    CSSToken,
    StringValueToken,
    UnicodeRangeToken,
    NumberValueToken,
    DimensionToken,
    Token
} from './token-types';
import {
    QUOTATION_MARK,
    NUMBER_SIGN,
    EQUALS_SIGN,
    DOLLAR_SIGN,
    APOSTROPHE,
    LEFT_PARENTHESIS,
    RIGHT_PARENTHESIS,
    ASTERISK,
    COMMA,
    HYPHEN_MINUS,
    GREATER_THAN_SIGN,
    FULL_STOP,
    SOLIDUS,
    COLON,
    SEMICOLON,
    LESS_THAN_SIGN,
    EXCLAMATION_MARK,
    COMMERCIAL_AT,
    LEFT_SQUARE_BRACKET,
    REVERSE_SOLIDUS,
    RIGHT_SQUARE_BRACKET,
    CIRCUMFLEX_ACCENT,
    LEFT_CURLY_BRACKET,
    RIGHT_CURLY_BRACKET,
    PLUS_SIGN,
    VERTICAL_LINE,
    TILDE,
    EOF,
    QUESTION_MARK,
    ZERO,
    PERCENTAGE_SIGN,
    REPLACEMENT_CHARACTER,
    F,
    E,
    e,
    u,
    U,
    LINE_FEED
} from './token-constants';
import {
    isDigit,
    isHex,
    isWhiteSpace,
    isNameCodePoint,
    isNonPrintableCodePoint,
    isValidEscape,
    isIdentifierStart,
    isNameStartCodePoint,
    isSurrogateCodePoint,
    isNumberStart,
    stringToNumber
} from './token-constants';
import {
    LEFT_PARENTHESIS_TOKEN,
    RIGHT_PARENTHESIS_TOKEN,
    COMMA_TOKEN,
    SUFFIX_MATCH_TOKEN,
    PREFIX_MATCH_TOKEN,
    COLUMN_TOKEN,
    DASH_MATCH_TOKEN,
    INCLUDE_MATCH_TOKEN,
    LEFT_CURLY_BRACKET_TOKEN,
    RIGHT_CURLY_BRACKET_TOKEN,
    SUBSTRING_MATCH_TOKEN,
    BAD_URL_TOKEN,
    BAD_STRING_TOKEN,
    CDO_TOKEN,
    CDC_TOKEN,
    COLON_TOKEN,
    SEMICOLON_TOKEN,
    LEFT_SQUARE_BRACKET_TOKEN,
    RIGHT_SQUARE_BRACKET_TOKEN,
    WHITESPACE_TOKEN,
    EOF_TOKEN
} from './token-singletons';

// ── Re-export the full public surface from sub-modules ──────────────────
// This preserves every existing import path. Consumers that currently write
//   import { TokenType, CSSToken, Tokenizer } from './tokenizer'
// continue to work without changes.
export { TokenType } from './token-types';
export type {
    Token,
    StringValueToken,
    HashToken,
    NumberValueToken,
    DimensionToken,
    UnicodeRangeToken,
    CSSToken
} from './token-types';
export { FLAG_UNRESTRICTED, FLAG_ID, FLAG_INTEGER, FLAG_NUMBER } from './token-types';
export {
    isDigit,
    isHex,
    isWhiteSpace,
    isNameCodePoint,
    isValidEscape,
    isIdentifierStart,
    isNameStartCodePoint,
    isNumberStart
} from './token-constants';
export {
    COMMA_TOKEN,
    COLON_TOKEN,
    SEMICOLON_TOKEN,
    LEFT_PARENTHESIS_TOKEN,
    RIGHT_PARENTHESIS_TOKEN,
    LEFT_CURLY_BRACKET_TOKEN,
    RIGHT_CURLY_BRACKET_TOKEN,
    LEFT_SQUARE_BRACKET_TOKEN,
    RIGHT_SQUARE_BRACKET_TOKEN,
    WHITESPACE_TOKEN,
    EOF_TOKEN,
    BAD_URL_TOKEN,
    BAD_STRING_TOKEN,
    CDC_TOKEN,
    CDO_TOKEN,
    PREFIX_MATCH_TOKEN,
    SUFFIX_MATCH_TOKEN,
    SUBSTRING_MATCH_TOKEN,
    DASH_MATCH_TOKEN,
    INCLUDE_MATCH_TOKEN,
    COLUMN_TOKEN
} from './token-singletons';

export class Tokenizer {
    private static _pool: Tokenizer[] = [];
    private static readonly MAX_POOL_SIZE = 40;

    static get(): Tokenizer {
        return Tokenizer._pool.pop() || new Tokenizer();
    }

    static release(tokenizer: Tokenizer): void {
        if (Tokenizer._pool.length < Tokenizer.MAX_POOL_SIZE) {
            tokenizer._reset();
            Tokenizer._pool.push(tokenizer);
        }
    }

    private _value: number[];

    constructor() {
        this._value = [];
    }

    private _reset(): void {
        this._value = [];
    }

    write(chunk: string): void {
        this._value = this._value.concat(toCodePoints(chunk));
    }

    read(): CSSToken[] {
        const tokens = [];
        let token = this.consumeToken();
        while (token !== EOF_TOKEN) {
            tokens.push(token);
            token = this.consumeToken();
        }
        return tokens;
    }

    private consumeToken(): CSSToken {
        const codePoint = this.consumeCodePoint();

        switch (codePoint) {
            case QUOTATION_MARK:
                return this.consumeStringToken(QUOTATION_MARK);
            case NUMBER_SIGN: {
                const c1 = this.peekCodePoint(0);
                const c2 = this.peekCodePoint(1);
                const c3 = this.peekCodePoint(2);
                if (isNameCodePoint(c1) || isValidEscape(c2, c3)) {
                    const flags = isIdentifierStart(c1, c2, c3) ? FLAG_ID : FLAG_UNRESTRICTED;
                    const value = this.consumeName();

                    return { type: TokenType.HASH_TOKEN, value, flags };
                }
                break;
            }
            case DOLLAR_SIGN:
                if (this.peekCodePoint(0) === EQUALS_SIGN) {
                    this.consumeCodePoint();
                    return SUFFIX_MATCH_TOKEN;
                }
                break;
            case APOSTROPHE:
                return this.consumeStringToken(APOSTROPHE);
            case LEFT_PARENTHESIS:
                return LEFT_PARENTHESIS_TOKEN;
            case RIGHT_PARENTHESIS:
                return RIGHT_PARENTHESIS_TOKEN;
            case ASTERISK:
                if (this.peekCodePoint(0) === EQUALS_SIGN) {
                    this.consumeCodePoint();
                    return SUBSTRING_MATCH_TOKEN;
                }
                break;
            case PLUS_SIGN:
                if (isNumberStart(codePoint, this.peekCodePoint(0), this.peekCodePoint(1))) {
                    this.reconsumeCodePoint(codePoint);
                    return this.consumeNumericToken();
                }
                break;
            case COMMA:
                return COMMA_TOKEN;
            case HYPHEN_MINUS: {
                const e1 = codePoint;
                const e2 = this.peekCodePoint(0);
                const e3 = this.peekCodePoint(1);

                if (isNumberStart(e1, e2, e3)) {
                    this.reconsumeCodePoint(codePoint);
                    return this.consumeNumericToken();
                }

                if (isIdentifierStart(e1, e2, e3)) {
                    this.reconsumeCodePoint(codePoint);
                    return this.consumeIdentLikeToken();
                }

                if (e2 === HYPHEN_MINUS && e3 === GREATER_THAN_SIGN) {
                    this.consumeCodePoint();
                    this.consumeCodePoint();
                    return CDC_TOKEN;
                }
                break;
            }
            case FULL_STOP:
                if (isNumberStart(codePoint, this.peekCodePoint(0), this.peekCodePoint(1))) {
                    this.reconsumeCodePoint(codePoint);
                    return this.consumeNumericToken();
                }
                break;
            case SOLIDUS:
                if (this.peekCodePoint(0) === ASTERISK) {
                    this.consumeCodePoint();
                    while (true) {
                        let c = this.consumeCodePoint();
                        if (c === ASTERISK) {
                            c = this.consumeCodePoint();
                            if (c === SOLIDUS) {
                                return this.consumeToken();
                            }
                        }
                        if (c === EOF) {
                            return this.consumeToken();
                        }
                    }
                }
                break;
            case COLON:
                return COLON_TOKEN;
            case SEMICOLON:
                return SEMICOLON_TOKEN;
            case LESS_THAN_SIGN:
                if (
                    this.peekCodePoint(0) === EXCLAMATION_MARK &&
                    this.peekCodePoint(1) === HYPHEN_MINUS &&
                    this.peekCodePoint(2) === HYPHEN_MINUS
                ) {
                    this.consumeCodePoint();
                    this.consumeCodePoint();
                    return CDO_TOKEN;
                }
                break;
            case COMMERCIAL_AT: {
                const a1 = this.peekCodePoint(0);
                const a2 = this.peekCodePoint(1);
                const a3 = this.peekCodePoint(2);
                if (isIdentifierStart(a1, a2, a3)) {
                    const value = this.consumeName();
                    return { type: TokenType.AT_KEYWORD_TOKEN, value };
                }
                break;
            }
            case LEFT_SQUARE_BRACKET:
                return LEFT_SQUARE_BRACKET_TOKEN;
            case REVERSE_SOLIDUS:
                if (isValidEscape(codePoint, this.peekCodePoint(0))) {
                    this.reconsumeCodePoint(codePoint);
                    return this.consumeIdentLikeToken();
                }
                break;
            case RIGHT_SQUARE_BRACKET:
                return RIGHT_SQUARE_BRACKET_TOKEN;
            case CIRCUMFLEX_ACCENT:
                if (this.peekCodePoint(0) === EQUALS_SIGN) {
                    this.consumeCodePoint();
                    return PREFIX_MATCH_TOKEN;
                }
                break;
            case LEFT_CURLY_BRACKET:
                return LEFT_CURLY_BRACKET_TOKEN;
            case RIGHT_CURLY_BRACKET:
                return RIGHT_CURLY_BRACKET_TOKEN;
            case u:
            case U: {
                const u1 = this.peekCodePoint(0);
                const u2 = this.peekCodePoint(1);
                if (u1 === PLUS_SIGN && (isHex(u2) || u2 === QUESTION_MARK)) {
                    this.consumeCodePoint();
                    this.consumeUnicodeRangeToken();
                }
                this.reconsumeCodePoint(codePoint);
                return this.consumeIdentLikeToken();
            }
            case VERTICAL_LINE:
                if (this.peekCodePoint(0) === EQUALS_SIGN) {
                    this.consumeCodePoint();
                    return DASH_MATCH_TOKEN;
                }
                if (this.peekCodePoint(0) === VERTICAL_LINE) {
                    this.consumeCodePoint();
                    return COLUMN_TOKEN;
                }
                break;
            case TILDE:
                if (this.peekCodePoint(0) === EQUALS_SIGN) {
                    this.consumeCodePoint();
                    return INCLUDE_MATCH_TOKEN;
                }
                break;
            case EOF:
                return EOF_TOKEN;
        }

        if (isWhiteSpace(codePoint)) {
            this.consumeWhiteSpace();
            return WHITESPACE_TOKEN;
        }

        if (isDigit(codePoint)) {
            this.reconsumeCodePoint(codePoint);
            return this.consumeNumericToken();
        }

        if (isNameStartCodePoint(codePoint)) {
            this.reconsumeCodePoint(codePoint);
            return this.consumeIdentLikeToken();
        }

        return { type: TokenType.DELIM_TOKEN, value: fromCodePoint(codePoint) };
    }

    private consumeCodePoint(): number {
        const value = this._value.shift();

        return typeof value === 'undefined' ? -1 : value;
    }

    private reconsumeCodePoint(codePoint: number) {
        this._value.unshift(codePoint);
    }

    private peekCodePoint(delta: number): number {
        if (delta >= this._value.length) {
            return -1;
        }

        return this._value[delta];
    }

    private consumeUnicodeRangeToken(): UnicodeRangeToken {
        const digits = [];
        let codePoint = this.consumeCodePoint();
        while (isHex(codePoint) && digits.length < 6) {
            digits.push(codePoint);
            codePoint = this.consumeCodePoint();
        }
        let questionMarks = false;
        while (codePoint === QUESTION_MARK && digits.length < 6) {
            digits.push(codePoint);
            codePoint = this.consumeCodePoint();
            questionMarks = true;
        }

        if (questionMarks) {
            const start = parseInt(
                fromCodePoint(...digits.map((digit) => (digit === QUESTION_MARK ? ZERO : digit))),
                16
            );
            const end = parseInt(fromCodePoint(...digits.map((digit) => (digit === QUESTION_MARK ? F : digit))), 16);
            return { type: TokenType.UNICODE_RANGE_TOKEN, start, end };
        }

        const start = parseInt(fromCodePoint(...digits), 16);
        if (this.peekCodePoint(0) === HYPHEN_MINUS && isHex(this.peekCodePoint(1))) {
            this.consumeCodePoint();
            codePoint = this.consumeCodePoint();
            const endDigits = [];
            while (isHex(codePoint) && endDigits.length < 6) {
                endDigits.push(codePoint);
                codePoint = this.consumeCodePoint();
            }
            const end = parseInt(fromCodePoint(...endDigits), 16);

            return { type: TokenType.UNICODE_RANGE_TOKEN, start, end };
        } else {
            return { type: TokenType.UNICODE_RANGE_TOKEN, start, end: start };
        }
    }

    private consumeIdentLikeToken(): StringValueToken | Token {
        const value = this.consumeName();
        if (value.toLowerCase() === 'url' && this.peekCodePoint(0) === LEFT_PARENTHESIS) {
            this.consumeCodePoint();
            return this.consumeUrlToken();
        } else if (this.peekCodePoint(0) === LEFT_PARENTHESIS) {
            this.consumeCodePoint();
            return { type: TokenType.FUNCTION_TOKEN, value };
        }

        return { type: TokenType.IDENT_TOKEN, value };
    }

    private consumeUrlToken(): StringValueToken | Token {
        const value = [];
        this.consumeWhiteSpace();

        if (this.peekCodePoint(0) === EOF) {
            return { type: TokenType.URL_TOKEN, value: '' };
        }

        const next = this.peekCodePoint(0);
        if (next === APOSTROPHE || next === QUOTATION_MARK) {
            const stringToken = this.consumeStringToken(this.consumeCodePoint());
            if (stringToken.type === TokenType.STRING_TOKEN) {
                this.consumeWhiteSpace();

                if (this.peekCodePoint(0) === EOF || this.peekCodePoint(0) === RIGHT_PARENTHESIS) {
                    this.consumeCodePoint();
                    return { type: TokenType.URL_TOKEN, value: (stringToken as StringValueToken).value };
                }
            }

            this.consumeBadUrlRemnants();
            return BAD_URL_TOKEN;
        }

        while (true) {
            const codePoint = this.consumeCodePoint();
            if (codePoint === EOF || codePoint === RIGHT_PARENTHESIS) {
                return { type: TokenType.URL_TOKEN, value: fromCodePoint(...value) };
            } else if (isWhiteSpace(codePoint)) {
                this.consumeWhiteSpace();
                if (this.peekCodePoint(0) === EOF || this.peekCodePoint(0) === RIGHT_PARENTHESIS) {
                    this.consumeCodePoint();
                    return { type: TokenType.URL_TOKEN, value: fromCodePoint(...value) };
                }
                this.consumeBadUrlRemnants();
                return BAD_URL_TOKEN;
            } else if (
                codePoint === QUOTATION_MARK ||
                codePoint === APOSTROPHE ||
                codePoint === LEFT_PARENTHESIS ||
                isNonPrintableCodePoint(codePoint)
            ) {
                this.consumeBadUrlRemnants();
                return BAD_URL_TOKEN;
            } else if (codePoint === REVERSE_SOLIDUS) {
                if (isValidEscape(codePoint, this.peekCodePoint(0))) {
                    value.push(this.consumeEscapedCodePoint());
                } else {
                    this.consumeBadUrlRemnants();
                    return BAD_URL_TOKEN;
                }
            } else {
                value.push(codePoint);
            }
        }
    }

    private consumeWhiteSpace(): void {
        while (isWhiteSpace(this.peekCodePoint(0))) {
            this.consumeCodePoint();
        }
    }

    private consumeBadUrlRemnants(): void {
        while (true) {
            const codePoint = this.consumeCodePoint();
            if (codePoint === RIGHT_PARENTHESIS || codePoint === EOF) {
                return;
            }

            if (isValidEscape(codePoint, this.peekCodePoint(0))) {
                this.consumeEscapedCodePoint();
            }
        }
    }

    private consumeStringSlice(count: number): string {
        const SLICE_STACK_SIZE = 50000;
        let value = '';
        while (count > 0) {
            const amount = Math.min(SLICE_STACK_SIZE, count);
            value += fromCodePoint(...this._value.splice(0, amount));
            count -= amount;
        }
        this._value.shift();

        return value;
    }

    private consumeStringToken(endingCodePoint: number): StringValueToken | Token {
        let value = '';
        let i = 0;

        do {
            const codePoint = this._value[i];
            if (codePoint === EOF || codePoint === undefined || codePoint === endingCodePoint) {
                value += this.consumeStringSlice(i);
                return { type: TokenType.STRING_TOKEN, value };
            }

            if (codePoint === LINE_FEED) {
                this._value.splice(0, i);
                return BAD_STRING_TOKEN;
            }

            if (codePoint === REVERSE_SOLIDUS) {
                const next = this._value[i + 1];
                if (next !== EOF && next !== undefined) {
                    if (next === LINE_FEED) {
                        value += this.consumeStringSlice(i);
                        i = -1;
                        this._value.shift();
                    } else if (isValidEscape(codePoint, next)) {
                        value += this.consumeStringSlice(i);
                        value += fromCodePoint(this.consumeEscapedCodePoint());
                        i = -1;
                    }
                }
            }

            i++;
        } while (true);
    }

    private consumeNumber() {
        const repr = [];
        let type = FLAG_INTEGER;
        let c1 = this.peekCodePoint(0);
        if (c1 === PLUS_SIGN || c1 === HYPHEN_MINUS) {
            repr.push(this.consumeCodePoint());
        }

        while (isDigit(this.peekCodePoint(0))) {
            repr.push(this.consumeCodePoint());
        }
        c1 = this.peekCodePoint(0);
        let c2 = this.peekCodePoint(1);
        if (c1 === FULL_STOP && isDigit(c2)) {
            repr.push(this.consumeCodePoint(), this.consumeCodePoint());
            type = FLAG_NUMBER;
            while (isDigit(this.peekCodePoint(0))) {
                repr.push(this.consumeCodePoint());
            }
        }

        c1 = this.peekCodePoint(0);
        c2 = this.peekCodePoint(1);
        const c3 = this.peekCodePoint(2);
        if ((c1 === E || c1 === e) && (((c2 === PLUS_SIGN || c2 === HYPHEN_MINUS) && isDigit(c3)) || isDigit(c2))) {
            repr.push(this.consumeCodePoint(), this.consumeCodePoint());
            type = FLAG_NUMBER;
            while (isDigit(this.peekCodePoint(0))) {
                repr.push(this.consumeCodePoint());
            }
        }

        return [stringToNumber(repr), type];
    }

    private consumeNumericToken(): NumberValueToken | DimensionToken {
        const [number, flags] = this.consumeNumber();
        const c1 = this.peekCodePoint(0);
        const c2 = this.peekCodePoint(1);
        const c3 = this.peekCodePoint(2);

        if (isIdentifierStart(c1, c2, c3)) {
            const unit = this.consumeName();
            return { type: TokenType.DIMENSION_TOKEN, number, flags, unit };
        }

        if (c1 === PERCENTAGE_SIGN) {
            this.consumeCodePoint();
            return { type: TokenType.PERCENTAGE_TOKEN, number, flags };
        }

        return { type: TokenType.NUMBER_TOKEN, number, flags };
    }

    private consumeEscapedCodePoint(): number {
        const codePoint = this.consumeCodePoint();

        if (isHex(codePoint)) {
            let hex = fromCodePoint(codePoint);
            while (isHex(this.peekCodePoint(0)) && hex.length < 6) {
                hex += fromCodePoint(this.consumeCodePoint());
            }

            if (isWhiteSpace(this.peekCodePoint(0))) {
                this.consumeCodePoint();
            }

            const hexCodePoint = parseInt(hex, 16);

            if (hexCodePoint === 0 || isSurrogateCodePoint(hexCodePoint) || hexCodePoint > 0x10ffff) {
                return REPLACEMENT_CHARACTER;
            }

            return hexCodePoint;
        }

        if (codePoint === EOF) {
            return REPLACEMENT_CHARACTER;
        }

        return codePoint;
    }

    private consumeName(): string {
        let result = '';
        while (true) {
            const codePoint = this.consumeCodePoint();
            if (isNameCodePoint(codePoint)) {
                result += fromCodePoint(codePoint);
            } else if (isValidEscape(codePoint, this.peekCodePoint(0))) {
                result += fromCodePoint(this.consumeEscapedCodePoint());
            } else {
                this.reconsumeCodePoint(codePoint);
                return result;
            }
        }
    }
}
