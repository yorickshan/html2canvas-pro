import { strictEqual } from 'assert';
import { Parser } from '../../syntax/parser';
import { TokenType } from '../../syntax/tokenizer';
import {
    FIFTY_PERCENT,
    ZERO_LENGTH,
    getAbsoluteValue,
    getAbsoluteValueForTuple,
    isCalcFunction,
    parseCalcForLengthPercentage,
    parseLengthPercentageTuple,
    parseOptionalCalcOrLength
} from '../length-percentage';
import type { CSSFunction } from '../../syntax/parser';
import type { LengthPercentage } from '../length-percentage';

const parseCalc = (value: string): CSSFunction => Parser.parseValue(value) as CSSFunction;

describe('calc length-percentage', () => {
    it('isCalcFunction detects calc only', () => {
        strictEqual(isCalcFunction(parseCalc('calc(1px + 2px)')), true);
        strictEqual(isCalcFunction(parseCalc('min(1px, 2px)')), false);
    });

    it('resolves pure pixel calc to a plain number', () => {
        const token = parseCalcForLengthPercentage(parseCalc('calc(10px + 2px)'));
        strictEqual((token as { number: number }).number, 12);
        strictEqual((token as { _calcPercentage?: number })._calcPercentage, undefined);
    });

    it('defers percentage components for later resolution', () => {
        const token = parseCalcForLengthPercentage(parseCalc('calc(10px + 5%)')) as unknown as LengthPercentage & {
            number: number;
            _calcPercentage: number;
            _calcPixelOffset: number;
        };
        strictEqual(token.number, 10);
        strictEqual(token._calcPercentage, 5);
        strictEqual(token._calcPixelOffset, 10);
        strictEqual(getAbsoluteValue(token, 200), 20);
    });

    it('supports nested calc, units and arithmetic', () => {
        strictEqual(
            (parseCalcForLengthPercentage(parseCalc('calc(calc(5px + 1px) + 2px)')) as { number: number }).number,
            8
        );
        strictEqual((parseCalcForLengthPercentage(parseCalc('calc(1rem + 1px)')) as { number: number }).number, 17);
        strictEqual((parseCalcForLengthPercentage(parseCalc('calc(1em * 2)')) as { number: number }).number, 32);
        strictEqual((parseCalcForLengthPercentage(parseCalc('calc(4px * 2)')) as { number: number }).number, 8);
        strictEqual((parseCalcForLengthPercentage(parseCalc('calc(10px / 4)')) as { number: number }).number, 2.5);
    });

    it('treats unknown units as raw numbers', () => {
        strictEqual((parseCalcForLengthPercentage(parseCalc('calc(1vh + 0px)')) as { number: number }).number, 1);
    });

    it('percentages resolve against the evaluation context', () => {
        strictEqual((parseCalcForLengthPercentage(parseCalc('calc(50%)')) as { number: number }).number, 0);
        strictEqual(getAbsoluteValue(parseCalcForLengthPercentage(parseCalc('calc(50%)')) as never, 100), 50);
    });

    it('returns null for unsupported expressions', () => {
        strictEqual(parseCalcForLengthPercentage(parseCalc('calc(var(--x))')), null);
        strictEqual(parseCalcForLengthPercentage(parseCalc('calc(foo(1px))')), null);
        strictEqual(
            parseCalcForLengthPercentage({ type: TokenType.FUNCTION, name: 'calc', values: [] } as CSSFunction),
            null
        );
    });

    it('parseOptionalCalcOrLength handles all inputs', () => {
        strictEqual((parseOptionalCalcOrLength(parseCalc('calc(1px + 1px)')) as { number: number }).number, 2);
        strictEqual(parseOptionalCalcOrLength(FIFTY_PERCENT), FIFTY_PERCENT);
        strictEqual(parseOptionalCalcOrLength({ type: TokenType.IDENT_TOKEN, value: 'auto', flags: 0 } as never), null);
    });

    it('getAbsoluteValue resolves units', () => {
        const dim = (unit: string, number = 1) => ({ type: TokenType.DIMENSION_TOKEN, number, flags: 0, unit });
        strictEqual(getAbsoluteValue(dim('px', 12) as never, 100), 12);
        strictEqual(getAbsoluteValue(dim('em', 2) as never, 100), 32);
        strictEqual(getAbsoluteValue(dim('rem', 2) as never, 100), 32);
        strictEqual(getAbsoluteValue(FIFTY_PERCENT, 100), 50);
        strictEqual(getAbsoluteValue(ZERO_LENGTH, 100), 0);
    });

    it('getAbsoluteValueForTuple falls back to x for single tuples', () => {
        deepEqualTuple(getAbsoluteValueForTuple(parseLengthPercentageTuple([FIFTY_PERCENT]), 100, 200), [50, 100]);
        deepEqualTuple(
            getAbsoluteValueForTuple(parseLengthPercentageTuple([FIFTY_PERCENT, ZERO_LENGTH]), 100, 200),
            [50, 0]
        );
    });
});

const deepEqualTuple = (actual: [number, number], expected: [number, number]) => {
    strictEqual(actual[0], expected[0]);
    strictEqual(actual[1], expected[1]);
};
