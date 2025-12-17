import { DimensionToken, FLAG_INTEGER, NumberValueToken, TokenType } from '../syntax/tokenizer';
import { CSSValue, CSSFunction, isDimensionToken } from '../syntax/parser';
import { isLength } from './length';
export type LengthPercentage = DimensionToken | NumberValueToken;
export type LengthPercentageTuple = [LengthPercentage] | [LengthPercentage, LengthPercentage];

export const isLengthPercentage = (token: CSSValue): token is LengthPercentage =>
    token.type === TokenType.PERCENTAGE_TOKEN || isLength(token);

/**
 * Check if a token is a calc() function
 */
export const isCalcFunction = (token: CSSValue): token is CSSFunction =>
    token.type === TokenType.FUNCTION && token.name === 'calc';

/**
 * Evaluate a calc() expression and convert to LengthPercentage token
 * Supports basic arithmetic: +, -, *, /
 * Note: Percentages in calc() are converted based on a context value
 */
export const evaluateCalcToLengthPercentage = (calcToken: CSSFunction, contextValue = 0): LengthPercentage | null => {
    // Build expression string from tokens
    const buildExpression = (values: CSSValue[]): string | null => {
        let expression = '';

        for (const value of values) {
            if (value.type === TokenType.WHITESPACE_TOKEN) {
                continue;
            }

            if (value.type === TokenType.FUNCTION) {
                if (value.name === 'calc') {
                    const nested = buildExpression(value.values);
                    if (nested === null) return null;
                    expression += `(${nested})`;
                } else {
                    return null;
                }
            } else if (value.type === TokenType.NUMBER_TOKEN) {
                expression += value.number.toString();
            } else if (value.type === TokenType.DIMENSION_TOKEN) {
                // Convert units to px
                if (value.unit === 'px') {
                    expression += value.number.toString();
                } else if (value.unit === 'rem' || value.unit === 'em') {
                    expression += (value.number * 16).toString();
                } else {
                    expression += value.number.toString();
                }
            } else if (value.type === TokenType.PERCENTAGE_TOKEN) {
                // Convert percentage to absolute value based on context
                expression += ((value.number / 100) * contextValue).toString();
            } else if (value.type === TokenType.DELIM_TOKEN) {
                const op = value.value;
                if (op === '+' || op === '-' || op === '*' || op === '/') {
                    expression += ` ${op} `;
                } else if (op === '(') {
                    expression += '(';
                } else if (op === ')') {
                    expression += ')';
                }
            }
        }

        return expression;
    };

    try {
        const expression = buildExpression(calcToken.values);
        if (expression === null || expression.trim() === '') {
            return null;
        }

        // Evaluate the expression
        // Note: Using Function constructor (similar to color.ts line 185)
        const result = new Function('return ' + expression)();

        if (typeof result === 'number' && !isNaN(result)) {
            // Return as a number token in px
            return {
                type: TokenType.NUMBER_TOKEN,
                number: result,
                flags: FLAG_INTEGER
            };
        }
    } catch (e) {
        return null;
    }

    return null;
};
export const parseLengthPercentageTuple = (tokens: LengthPercentage[]): LengthPercentageTuple =>
    tokens.length > 1 ? [tokens[0], tokens[1]] : [tokens[0]];
export const ZERO_LENGTH: NumberValueToken = {
    type: TokenType.NUMBER_TOKEN,
    number: 0,
    flags: FLAG_INTEGER
};

export const FIFTY_PERCENT: NumberValueToken = {
    type: TokenType.PERCENTAGE_TOKEN,
    number: 50,
    flags: FLAG_INTEGER
};

export const HUNDRED_PERCENT: NumberValueToken = {
    type: TokenType.PERCENTAGE_TOKEN,
    number: 100,
    flags: FLAG_INTEGER
};

export const getAbsoluteValueForTuple = (
    tuple: LengthPercentageTuple,
    width: number,
    height: number
): [number, number] => {
    const [x, y] = tuple;
    return [getAbsoluteValue(x, width), getAbsoluteValue(typeof y !== 'undefined' ? y : x, height)];
};
export const getAbsoluteValue = (token: LengthPercentage, parent: number): number => {
    if (token.type === TokenType.PERCENTAGE_TOKEN) {
        return (token.number / 100) * parent;
    }

    if (isDimensionToken(token)) {
        switch (token.unit) {
            case 'rem':
            case 'em':
                return 16 * token.number; // TODO use correct font-size
            case 'px':
            default:
                return token.number;
        }
    }

    return token.number;
};
