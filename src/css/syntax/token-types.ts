// https://www.w3.org/TR/css-syntax-3
// Token type system — enums, interfaces, and union types consumed by
// the tokenizer, parser, and property descriptors.

export const enum TokenType {
    STRING_TOKEN,
    BAD_STRING_TOKEN,
    LEFT_PARENTHESIS_TOKEN,
    RIGHT_PARENTHESIS_TOKEN,
    COMMA_TOKEN,
    HASH_TOKEN,
    DELIM_TOKEN,
    AT_KEYWORD_TOKEN,
    PREFIX_MATCH_TOKEN,
    DASH_MATCH_TOKEN,
    INCLUDE_MATCH_TOKEN,
    LEFT_CURLY_BRACKET_TOKEN,
    RIGHT_CURLY_BRACKET_TOKEN,
    SUFFIX_MATCH_TOKEN,
    SUBSTRING_MATCH_TOKEN,
    DIMENSION_TOKEN,
    PERCENTAGE_TOKEN,
    NUMBER_TOKEN,
    FUNCTION,
    FUNCTION_TOKEN,
    IDENT_TOKEN,
    COLUMN_TOKEN,
    URL_TOKEN,
    BAD_URL_TOKEN,
    CDC_TOKEN,
    CDO_TOKEN,
    COLON_TOKEN,
    SEMICOLON_TOKEN,
    LEFT_SQUARE_BRACKET_TOKEN,
    RIGHT_SQUARE_BRACKET_TOKEN,
    UNICODE_RANGE_TOKEN,
    WHITESPACE_TOKEN,
    EOF_TOKEN
}

interface IToken {
    type: TokenType;
}

export interface Token extends IToken {
    type:
        | TokenType.BAD_URL_TOKEN
        | TokenType.BAD_STRING_TOKEN
        | TokenType.LEFT_PARENTHESIS_TOKEN
        | TokenType.RIGHT_PARENTHESIS_TOKEN
        | TokenType.COMMA_TOKEN
        | TokenType.SUBSTRING_MATCH_TOKEN
        | TokenType.PREFIX_MATCH_TOKEN
        | TokenType.SUFFIX_MATCH_TOKEN
        | TokenType.COLON_TOKEN
        | TokenType.SEMICOLON_TOKEN
        | TokenType.LEFT_SQUARE_BRACKET_TOKEN
        | TokenType.RIGHT_SQUARE_BRACKET_TOKEN
        | TokenType.LEFT_CURLY_BRACKET_TOKEN
        | TokenType.RIGHT_CURLY_BRACKET_TOKEN
        | TokenType.DASH_MATCH_TOKEN
        | TokenType.INCLUDE_MATCH_TOKEN
        | TokenType.COLUMN_TOKEN
        | TokenType.WHITESPACE_TOKEN
        | TokenType.CDC_TOKEN
        | TokenType.CDO_TOKEN
        | TokenType.EOF_TOKEN;
}

export interface StringValueToken extends IToken {
    type:
        | TokenType.STRING_TOKEN
        | TokenType.DELIM_TOKEN
        | TokenType.FUNCTION_TOKEN
        | TokenType.IDENT_TOKEN
        | TokenType.URL_TOKEN
        | TokenType.AT_KEYWORD_TOKEN;
    value: string;
}

export interface HashToken extends IToken {
    type: TokenType.HASH_TOKEN;
    flags: number;
    value: string;
}

export interface NumberValueToken extends IToken {
    type: TokenType.PERCENTAGE_TOKEN | TokenType.NUMBER_TOKEN;
    flags: number;
    number: number;
}

export interface DimensionToken extends IToken {
    type: TokenType.DIMENSION_TOKEN;
    flags: number;
    unit: string;
    number: number;
}

export interface UnicodeRangeToken extends IToken {
    type: TokenType.UNICODE_RANGE_TOKEN;
    start: number;
    end: number;
}

export type CSSToken = Token | StringValueToken | NumberValueToken | DimensionToken | UnicodeRangeToken | HashToken;

export const FLAG_UNRESTRICTED = 1 << 0;
export const FLAG_ID = 1 << 1;
export const FLAG_INTEGER = 1 << 2;
export const FLAG_NUMBER = 1 << 3;
