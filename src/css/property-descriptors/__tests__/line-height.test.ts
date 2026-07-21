import { describe, it, expect } from 'vitest';
import { computeLineHeight } from '../line-height';
import { TokenType } from '../../syntax/tokenizer';

describe('computeLineHeight', () => {
    const fontSize = 16;

    it('normal returns 1.2 * fontSize', () => {
        const result = computeLineHeight({ type: TokenType.IDENT_TOKEN, value: 'normal' }, fontSize);
        expect(result).toBe(19.2);
    });

    it('number token multiplies fontSize', () => {
        const result = computeLineHeight({ type: TokenType.NUMBER_TOKEN, number: 1.5, flags: 0 }, fontSize);
        expect(result).toBe(24);
    });

    it('dimension token uses getAbsoluteValue', () => {
        const result = computeLineHeight(
            { type: TokenType.DIMENSION_TOKEN, number: 20, unit: 'px', flags: 0 },
            fontSize
        );
        expect(result).toBe(20);
    });

    it('percentage token resolves against fontSize', () => {
        const result = computeLineHeight({ type: TokenType.PERCENTAGE_TOKEN, number: 150, flags: 0 }, fontSize);
        expect(result).toBe(24);
    });

    it('unknown token falls back to fontSize', () => {
        const result = computeLineHeight({ type: TokenType.IDENT_TOKEN, value: 'unknown' }, fontSize);
        expect(result).toBe(fontSize);
    });
});
