import { describe, it, expect } from 'vitest';
import { translate, TranslateValue } from '../translate';
import { scale, ScaleValue } from '../scale';
import { Parser } from '../../syntax/parser';
import { ZERO_LENGTH } from '../../types/length-percentage';

const parseTranslate = (value: string): TranslateValue => translate.parse({} as never, Parser.parseValues(value));

const parseScale = (value: string): ScaleValue => scale.parse({} as never, Parser.parseValues(value));

describe('translate descriptor (CSS Transforms L2)', () => {
    it('parses none as null', () => {
        expect(parseTranslate('none')).toBeNull();
    });

    it('parses a single length with y defaulting to zero', () => {
        const value = parseTranslate('10px');
        expect(value).not.toBeNull();
        expect(value![0]).toMatchObject({ number: 10, unit: 'px' });
        expect(value![1]).toEqual(ZERO_LENGTH);
    });

    it('parses two lengths', () => {
        const value = parseTranslate('10px 20px');
        expect(value![0]).toMatchObject({ number: 10, unit: 'px' });
        expect(value![1]).toMatchObject({ number: 20, unit: 'px' });
    });

    it('parses percentages for later bounds-relative resolution', () => {
        const value = parseTranslate('50% 25%');
        expect(value![0]).toMatchObject({ number: 50 });
        expect(value![1]).toMatchObject({ number: 25 });
    });
});

describe('scale descriptor (CSS Transforms L2)', () => {
    it('parses none as null', () => {
        expect(parseScale('none')).toBeNull();
    });

    it('applies a single number to both axes', () => {
        expect(parseScale('2')).toEqual([2, 2]);
        expect(parseScale('-1')).toEqual([-1, -1]);
    });

    it('parses two numbers as x and y', () => {
        expect(parseScale('2 3')).toEqual([2, 3]);
        expect(parseScale('0.5 2')).toEqual([0.5, 2]);
    });
});
