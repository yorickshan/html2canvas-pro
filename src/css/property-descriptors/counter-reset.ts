import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { CSSValue } from '../syntax/parser';
import { Context } from '../../core/context';
import { parseCounterValue } from './counter-increment';

export interface COUNTER_RESET {
    counter: string;
    reset: number;
}

export type CounterReset = COUNTER_RESET[];

export const counterReset: IPropertyListDescriptor<CounterReset> = {
    name: 'counter-reset',
    initialValue: 'none',
    prefix: true,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]) => {
        if (tokens.length === 0) {
            return [];
        }

        return parseCounterValue(tokens, 0)
            .filter(([counter]) => counter !== 'none')
            .map(([counter, reset]) => ({ counter, reset }));
    }
};
