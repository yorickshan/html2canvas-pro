import { describe, it, expect } from 'vitest';
import safeEvalArithmetic from '../safe-eval';

describe('safeEvalArithmetic', () => {
    it('evaluates simple addition', () => {
        expect(safeEvalArithmetic('1 + 2')).toBe(3);
    });

    it('evaluates multiplication before addition', () => {
        expect(safeEvalArithmetic('1 + 2 * 3')).toBe(7);
    });

    it('evaluates parentheses', () => {
        expect(safeEvalArithmetic('(1 + 2) * 3')).toBe(9);
    });

    it('handles division', () => {
        expect(safeEvalArithmetic('10 / 2')).toBe(5);
    });

    it('handles subtraction', () => {
        expect(safeEvalArithmetic('10 - 3 - 2')).toBe(5);
    });

    it('handles subtraction without unary minus', () => {
        expect(safeEvalArithmetic('10 - 3 - 2')).toBe(5);
    });

    it('handles floating point', () => {
        expect(safeEvalArithmetic('3.5 * 2')).toBe(7);
    });

    it('returns NaN for division by zero', () => {
        expect(safeEvalArithmetic('1 / 0')).toBeNaN();
    });

    it('returns NaN for mismatched parentheses', () => {
        expect(safeEvalArithmetic('(1 + 2')).toBeNaN();
    });

    it('returns NaN for empty string', () => {
        expect(safeEvalArithmetic('')).toBeNaN();
    });

    it('returns NaN for non-math content', () => {
        expect(safeEvalArithmetic('alert("xss")')).toBeNaN();
    });

    it('returns NaN for letters', () => {
        expect(safeEvalArithmetic('abc')).toBeNaN();
    });

    it('handles complex expression', () => {
        expect(safeEvalArithmetic('(3 + 5) * (2 - 1) / 4')).toBe(2);
    });
});
