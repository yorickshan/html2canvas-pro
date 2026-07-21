import { describe, it, expect, vi } from 'vitest';
import { Parser } from '../../syntax/parser';
import { TokenType, FLAG_INTEGER } from '../../syntax/tokenizer';
import {
    isCalcFunction,
    isCalcWithPercentage,
    parseCalcForLengthPercentage,
    getAbsoluteValue,
    CalcWithPercentage
} from '../length-percentage';

vi.mock('../../../core/context');
vi.mock('../../../core/features');

const parseCalc = (value: string): ReturnType<typeof parseCalcForLengthPercentage> => {
    const parsed = Parser.parseValue(value);
    if (!isCalcFunction(parsed)) return null;
    return parseCalcForLengthPercentage(parsed);
};

describe('parseCalcForLengthPercentage', () => {
    it('handles px-only calc', () => {
        const result = parseCalc('calc(10px + 5px)');
        expect(result).not.toBeNull();
        expect(result!.type).toBe(TokenType.NUMBER_TOKEN);
    });

    it('extracts percentage coefficient', () => {
        const result = parseCalc('calc(50% + 10px)');
        expect(result).not.toBeNull();
        expect(isCalcWithPercentage(result!)).toBe(true);
        const cwp = result as CalcWithPercentage;
        expect(cwp._calcPercentage).toBe(50);
        expect(cwp._calcPixelOffset).toBe(10);
    });

    it('handles percentage-only calc', () => {
        const result = parseCalc('calc(75%)');
        expect(result).not.toBeNull();
        expect(isCalcWithPercentage(result!)).toBe(true);
        const cwp = result as CalcWithPercentage;
        expect(cwp._calcPercentage).toBe(75);
        expect(cwp._calcPixelOffset).toBe(0);
    });

    it('handles negative pixel offset', () => {
        const result = parseCalc('calc(100% - 20px)');
        expect(result).not.toBeNull();
        expect(isCalcWithPercentage(result!)).toBe(true);
        const cwp = result as CalcWithPercentage;
        expect(cwp._calcPercentage).toBe(100);
        expect(cwp._calcPixelOffset).toBe(-20);
    });

    it('handles fractional pixel offset', () => {
        const result = parseCalc('calc(25% - 7.5px)');
        expect(result).not.toBeNull();
        expect(isCalcWithPercentage(result!)).toBe(true);
        const cwp = result as CalcWithPercentage;
        expect(cwp._calcPercentage).toBe(25);
        expect(cwp._calcPixelOffset).toBe(-7.5);
    });

    it('returns null for invalid calc', () => {
        const result = parseCalc('calc(invalid)');
        expect(result).toBeNull();
    });

    it('handles nested calc', () => {
        const result = parseCalc('calc(calc(50% + 5px) + 5px)');
        expect(result).not.toBeNull();
        expect(isCalcWithPercentage(result!)).toBe(true);
        const cwp = result as CalcWithPercentage;
        expect(cwp._calcPercentage).toBe(50);
        expect(cwp._calcPixelOffset).toBe(10);
    });

    it('returns plain NUMBER_TOKEN for px-only calc (no percentage)', () => {
        const result = parseCalc('calc(10px + 5px)');
        expect(result!.type).toBe(TokenType.NUMBER_TOKEN);
        expect(isCalcWithPercentage(result!)).toBe(false);
    });

    it('handles multiplication in calc', () => {
        const result = parseCalc('calc(20% * 2 + 10px)');
        expect(result).not.toBeNull();
        expect(isCalcWithPercentage(result!)).toBe(true);
        const cwp = result as CalcWithPercentage;
        expect(cwp._calcPercentage).toBe(40);
        expect(cwp._calcPixelOffset).toBe(10);
    });
});

describe('getAbsoluteValue with CalcWithPercentage', () => {
    it('resolves calc with percentage to absolute value', () => {
        const token = {
            type: TokenType.NUMBER_TOKEN,
            number: 10,
            flags: FLAG_INTEGER,
            _calcPercentage: 50,
            _calcPixelOffset: 10
        } as CalcWithPercentage;
        // parent = 200px -> 50% of 200 = 100 + 10 = 110
        expect(getAbsoluteValue(token, 200)).toBe(110);
    });

    it('resolves when parent is 0', () => {
        const token = {
            type: TokenType.NUMBER_TOKEN,
            number: 10,
            flags: FLAG_INTEGER,
            _calcPercentage: 50,
            _calcPixelOffset: 10
        } as CalcWithPercentage;
        expect(getAbsoluteValue(token, 0)).toBe(10);
    });

    it('resolves with negative offset', () => {
        const token = {
            type: TokenType.NUMBER_TOKEN,
            number: -20,
            flags: FLAG_INTEGER,
            _calcPercentage: 100,
            _calcPixelOffset: -20
        } as CalcWithPercentage;
        // parent = 300 -> 300 - 20 = 280
        expect(getAbsoluteValue(token, 300)).toBe(280);
    });

    it('handles zero percentage', () => {
        const token = {
            type: TokenType.NUMBER_TOKEN,
            number: 50,
            flags: FLAG_INTEGER,
            _calcPercentage: 0,
            _calcPixelOffset: 50
        } as CalcWithPercentage;
        expect(getAbsoluteValue(token, 100)).toBe(50);
    });
});
