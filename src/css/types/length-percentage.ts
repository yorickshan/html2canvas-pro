import { DimensionToken, FLAG_INTEGER, NumberValueToken, TokenType } from '../syntax/tokenizer';
import { CSSValue, CSSFunction, isDimensionToken } from '../syntax/parser';
import { isLength } from './length';
import safeEvalArithmetic from './safe-eval';
/**
 * Internal token representing a calc() expression that has both a percentage
 * component and a pixel offset. Created at parse time and resolved at render
 * time once the container size is known.
 *
 * Extends NumberValueToken so it is structurally assignable wherever
 * LengthPercentage (DimensionToken | NumberValueToken) is expected,
 * avoiding widespread type changes.
 */
export interface CalcWithPercentage extends NumberValueToken {
    type: TokenType.NUMBER_TOKEN;
    /** The percentage coefficient (extracted from the calc expression). */
    _calcPercentage: number;
    /** The pixel offset (extracted from the calc expression). */
    _calcPixelOffset: number;
}

export type LengthPercentage = DimensionToken | NumberValueToken;
export type LengthPercentageTuple = [LengthPercentage] | [LengthPercentage, LengthPercentage];

export const isLengthPercentage = (token: CSSValue): token is LengthPercentage =>
    token.type === TokenType.PERCENTAGE_TOKEN || isLength(token) || isCalcWithPercentage(token);

/**
 * Check if a token is a CalcWithPercentage deferred token.
 * Accepts CSSValue (structural duck-type check) for use in type guards.
 */
export const isCalcWithPercentage = (token: CSSValue): token is CalcWithPercentage =>
    token.type === TokenType.NUMBER_TOKEN && (token as CalcWithPercentage)._calcPercentage !== undefined;

/**
 * Check if a token is a calc() function
 */
export const isCalcFunction = (token: CSSValue): token is CSSFunction =>
    token.type === TokenType.FUNCTION && token.name === 'calc';

/**
 * Parse a calc() token and produce a LengthPercentage.
 *
 * Uses two-point evaluation to extract the percentage coefficient and pixel
 * offset from a calc() expression so it can be resolved later at render time
 * when the container size is known.
 *
 *   evaluate(0)   → pixelOffset
 *   evaluate(100) → percentage + pixelOffset   →  percentage = evaluate(100) - pixelOffset
 *
 * If the expression has no percentage component, returns a plain NUMBER_TOKEN
 * for backwards compatibility.
 */
export const parseCalcForLengthPercentage = (calcToken: CSSFunction): LengthPercentage | null => {
    const withZero = evaluateCalcToLengthPercentage(calcToken, 0);
    if (!withZero) return null;

    const withHundred = evaluateCalcToLengthPercentage(calcToken, 100);
    if (!withHundred) return null;

    const pixelOffset = (withZero as NumberValueToken).number;
    const percentage = (withHundred as NumberValueToken).number - pixelOffset;

    // If there's no percentage component, return a plain NUMBER_TOKEN
    if (percentage === 0) {
        return withZero;
    }

    return {
        type: TokenType.NUMBER_TOKEN,
        number: pixelOffset,
        flags: FLAG_INTEGER,
        _calcPercentage: percentage,
        _calcPixelOffset: pixelOffset
    } as LengthPercentage;
};

/**
 * Convenience helper for parsing an optional calc() or length-percentage value.
 * Used by property descriptors that accept both calc() and regular length-percentage tokens.
 * Returns null if the value is neither a calc() function nor a length-percentage token.
 */
export const parseOptionalCalcOrLength = (value: CSSValue): LengthPercentage | null => {
    if (isCalcFunction(value)) {
        return parseCalcForLengthPercentage(value);
    }
    return isLengthPercentage(value) ? value : null;
};

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
        // Uses safe arithmetic evaluator instead of new Function() for CodeQL
        const result = safeEvalArithmetic(expression);

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
    if (isCalcWithPercentage(token)) {
        return (token._calcPercentage / 100) * parent + token._calcPixelOffset;
    }

    if (token.type === TokenType.PERCENTAGE_TOKEN) {
        return (token.number / 100) * parent;
    }

    if (isDimensionToken(token)) {
        switch (token.unit) {
            case 'rem':
            case 'em':
                // NOTE: Assumes a 16px root font-size for rem/em units. A fully
                // accurate implementation would require access to the element's
                // computed font-size (em) or the root element's font-size (rem),
                // which are not available in this pure-resolution function.
                return 16 * token.number;
            case 'px':
            default:
                return token.number;
        }
    }

    return token.number;
};
