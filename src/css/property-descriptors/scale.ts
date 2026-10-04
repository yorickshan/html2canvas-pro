import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { at } from '../../core/util';
import { CSSValue, isNumberToken } from '../syntax/parser';
import { Context } from '../../core/context';

/**
 * CSS Transforms Level 2 independent `scale` property.
 * Computed values: `none`, `<number>` (both axes), `<number> <number>` (x y).
 * Unlike a missing value in `transform: scale()`, a single value scales both
 * axes; y defaults to x per the individual-property grammar.
 */
export type ScaleValue = [number, number] | null;

export const scale: IPropertyListDescriptor<ScaleValue> = {
    name: 'scale',
    initialValue: 'none',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]): ScaleValue => {
        const numbers: number[] = [];
        for (const token of tokens) {
            if (isNumberToken(token)) {
                numbers.push(token.number);
            }
        }
        if (numbers.length === 0) {
            return null;
        }
        return [at(numbers, 0), numbers.length > 1 ? at(numbers, 1) : at(numbers, 0)];
    }
};
