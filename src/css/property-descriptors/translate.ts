import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { at } from '../../core/util';
import { CSSValue } from '../syntax/parser';
import { isLengthPercentage, LengthPercentage, ZERO_LENGTH } from '../types/length-percentage';
import { Context } from '../../core/context';

/**
 * CSS Transforms Level 2 independent `translate` property.
 * Computed values: `none`, `<length-percentage>`, `<length-percentage> <length-percentage>`
 * (a third z length may appear in computed values and is ignored — 2D renderer).
 * Percentages are resolved against the element bounds at paint time.
 */
export type TranslateValue = [LengthPercentage, LengthPercentage] | null;

export const translate: IPropertyListDescriptor<TranslateValue> = {
    name: 'translate',
    initialValue: 'none',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]): TranslateValue => {
        const values: LengthPercentage[] = [];
        for (const token of tokens) {
            if (isLengthPercentage(token)) {
                values.push(token);
            }
        }
        if (values.length === 0) {
            return null;
        }
        return [at(values, 0), values.length > 1 ? at(values, 1) : ZERO_LENGTH];
    }
};
