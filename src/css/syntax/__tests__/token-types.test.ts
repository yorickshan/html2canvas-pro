import { describe, it, expect } from 'vitest';
import { TokenType, FLAG_UNRESTRICTED, FLAG_ID, FLAG_INTEGER, FLAG_NUMBER } from '../token-types';

describe('TokenType enum', () => {
    it('has expected core token types', () => {
        expect(TokenType.STRING_TOKEN).toBe(0);
        expect(TokenType.BAD_STRING_TOKEN).toBe(1);
        expect(TokenType.IDENT_TOKEN).toBe(20);
        expect(TokenType.FUNCTION_TOKEN).toBe(19);
        expect(TokenType.AT_KEYWORD_TOKEN).toBe(7);
        expect(TokenType.HASH_TOKEN).toBe(5);
        expect(TokenType.DIMENSION_TOKEN).toBe(15);
        expect(TokenType.PERCENTAGE_TOKEN).toBe(16);
        expect(TokenType.NUMBER_TOKEN).toBe(17);
        expect(TokenType.EOF_TOKEN).toBe(32);
    });
});

describe('token flags', () => {
    it('FLAG_UNRESTRICTED is 1', () => {
        expect(FLAG_UNRESTRICTED).toBe(1);
    });

    it('FLAG_ID is 2', () => {
        expect(FLAG_ID).toBe(2);
    });

    it('FLAG_INTEGER is 4', () => {
        expect(FLAG_INTEGER).toBe(4);
    });

    it('FLAG_NUMBER is 8', () => {
        expect(FLAG_NUMBER).toBe(8);
    });

    it('all flags are distinct powers of two', () => {
        const flags = [FLAG_UNRESTRICTED, FLAG_ID, FLAG_INTEGER, FLAG_NUMBER];
        const set = new Set(flags);
        expect(set.size).toBe(flags.length);
        flags.forEach((f) => {
            expect(f & (f - 1)).toBe(0); // power of two check
        });
    });
});
