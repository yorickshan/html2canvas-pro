import { describe, it, expect } from 'vitest';
import { Parser } from '../../syntax/parser';
import { counterIncrement, parseCounterValue } from '../counter-increment';
import { counterReset } from '../counter-reset';

describe('counter-increment', () => {
    it('parses single counter with default increment', () => {
        const tokens = Parser.parseValues('my-counter');
        const result = counterIncrement.parse(null as any, tokens);
        expect(result).toEqual([{ counter: 'my-counter', increment: 1 }]);
    });

    it('parses counter with explicit increment', () => {
        const tokens = Parser.parseValues('my-counter 3');
        const result = counterIncrement.parse(null as any, tokens);
        expect(result).toEqual([{ counter: 'my-counter', increment: 3 }]);
    });

    it('parses multiple counters', () => {
        const tokens = Parser.parseValues('a 2 b 5');
        const result = counterIncrement.parse(null as any, tokens);
        expect(result).toEqual([
            { counter: 'a', increment: 2 },
            { counter: 'b', increment: 5 }
        ]);
    });

    it('returns null for none', () => {
        const tokens = Parser.parseValues('none');
        const result = counterIncrement.parse(null as any, tokens);
        expect(result).toBeNull();
    });
});

describe('counter-reset', () => {
    it('parses single counter with default reset', () => {
        const tokens = Parser.parseValues('my-counter');
        const result = counterReset.parse(null as any, tokens);
        expect(result).toEqual([{ counter: 'my-counter', reset: 0 }]);
    });

    it('parses counter with explicit reset', () => {
        const tokens = Parser.parseValues('my-counter 5');
        const result = counterReset.parse(null as any, tokens);
        expect(result).toEqual([{ counter: 'my-counter', reset: 5 }]);
    });

    it('filters out none', () => {
        const tokens = Parser.parseValues('none');
        const result = counterReset.parse(null as any, tokens);
        expect(result).toEqual([]);
    });
});

describe('parseCounterValue', () => {
    it('returns empty for no tokens', () => {
        expect(parseCounterValue([], 1)).toEqual([]);
    });

    it('returns default number for each identifier', () => {
        const tokens = Parser.parseValues('a b c');
        expect(parseCounterValue(tokens, 0)).toEqual([
            ['a', 0],
            ['b', 0],
            ['c', 0]
        ]);
    });
});
