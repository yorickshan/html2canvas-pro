import { describe, it, expect } from 'vitest';
import { isLength } from '../length';
import { TokenType } from '../../syntax/token-types';

describe('isLength', () => {
    it('returns true for DIMENSION_TOKEN', () => {
        const dimToken = { type: TokenType.DIMENSION_TOKEN, flags: 0, unit: 'px', number: 10 };
        expect(isLength(dimToken)).toBe(true);
    });

    it('returns true for NUMBER_TOKEN', () => {
        const numToken = { type: TokenType.NUMBER_TOKEN, flags: 0, number: 0 };
        expect(isLength(numToken)).toBe(true);
    });

    it('returns false for PERCENTAGE_TOKEN', () => {
        const pctToken = { type: TokenType.PERCENTAGE_TOKEN, flags: 0, number: 50 };
        expect(isLength(pctToken)).toBe(false);
    });

    it('returns false for IDENT_TOKEN', () => {
        const identToken = { type: TokenType.IDENT_TOKEN, value: 'auto' };
        expect(isLength(identToken)).toBe(false);
    });

    it('returns false for STRING_TOKEN', () => {
        const strToken = { type: TokenType.STRING_TOKEN, value: 'hello' };
        expect(isLength(strToken)).toBe(false);
    });
});
