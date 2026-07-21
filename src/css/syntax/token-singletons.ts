// Singleton token objects used by the CSS tokenizer.
// Reusing immutable objects avoids allocations for single-character tokens.
import { TokenType } from './token-types';
import type { Token } from './token-types';

export const LEFT_PARENTHESIS_TOKEN: Token = {
    type: TokenType.LEFT_PARENTHESIS_TOKEN
};
export const RIGHT_PARENTHESIS_TOKEN: Token = {
    type: TokenType.RIGHT_PARENTHESIS_TOKEN
};
export const COMMA_TOKEN: Token = { type: TokenType.COMMA_TOKEN };
export const SUFFIX_MATCH_TOKEN: Token = { type: TokenType.SUFFIX_MATCH_TOKEN };
export const PREFIX_MATCH_TOKEN: Token = { type: TokenType.PREFIX_MATCH_TOKEN };
export const COLUMN_TOKEN: Token = { type: TokenType.COLUMN_TOKEN };
export const DASH_MATCH_TOKEN: Token = { type: TokenType.DASH_MATCH_TOKEN };
export const INCLUDE_MATCH_TOKEN: Token = { type: TokenType.INCLUDE_MATCH_TOKEN };
export const LEFT_CURLY_BRACKET_TOKEN: Token = {
    type: TokenType.LEFT_CURLY_BRACKET_TOKEN
};
export const RIGHT_CURLY_BRACKET_TOKEN: Token = {
    type: TokenType.RIGHT_CURLY_BRACKET_TOKEN
};
export const SUBSTRING_MATCH_TOKEN: Token = { type: TokenType.SUBSTRING_MATCH_TOKEN };
export const BAD_URL_TOKEN: Token = { type: TokenType.BAD_URL_TOKEN };
export const BAD_STRING_TOKEN: Token = { type: TokenType.BAD_STRING_TOKEN };
export const CDO_TOKEN: Token = { type: TokenType.CDO_TOKEN };
export const CDC_TOKEN: Token = { type: TokenType.CDC_TOKEN };
export const COLON_TOKEN: Token = { type: TokenType.COLON_TOKEN };
export const SEMICOLON_TOKEN: Token = { type: TokenType.SEMICOLON_TOKEN };
export const LEFT_SQUARE_BRACKET_TOKEN: Token = {
    type: TokenType.LEFT_SQUARE_BRACKET_TOKEN
};
export const RIGHT_SQUARE_BRACKET_TOKEN: Token = {
    type: TokenType.RIGHT_SQUARE_BRACKET_TOKEN
};
export const WHITESPACE_TOKEN: Token = { type: TokenType.WHITESPACE_TOKEN };
export const EOF_TOKEN: Token = { type: TokenType.EOF_TOKEN };
