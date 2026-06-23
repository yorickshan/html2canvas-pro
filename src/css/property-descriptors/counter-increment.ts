import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { CSSValue, isNumberToken, nonWhiteSpace } from '../syntax/parser';
import { TokenType } from '../syntax/tokenizer';
import { Context } from '../../core/context';

export interface COUNTER_INCREMENT {
    counter: string;
    increment: number;
}

export type CounterIncrement = COUNTER_INCREMENT[] | null;

/** Shared counter-ID parsing: returns next number or a fallback default. */
export const parseCounterValue = (tokens: CSSValue[], defaultNumber: number): [string, number][] => {
    const entries: [string, number][] = [];
    const filtered = tokens.filter(nonWhiteSpace);

    for (let i = 0; i < filtered.length; i++) {
        const counter = filtered[i];
        const next = filtered[i + 1];
        if (counter.type === TokenType.IDENT_TOKEN) {
            const num = next && isNumberToken(next) ? next.number : defaultNumber;
            entries.push([counter.value, num]);
        }
    }

    return entries;
};

export const counterIncrement: IPropertyListDescriptor<CounterIncrement> = {
    name: 'counter-increment',
    initialValue: 'none',
    prefix: true,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]) => {
        if (tokens.length === 0) {
            return null;
        }

        const first = tokens[0];
        if (first.type === TokenType.IDENT_TOKEN && first.value === 'none') {
            return null;
        }

        return parseCounterValue(tokens, 1).map(([counter, increment]) => ({ counter, increment }));
    }
};
