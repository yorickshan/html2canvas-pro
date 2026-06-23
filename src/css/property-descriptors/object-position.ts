import { PropertyDescriptorParsingType, IPropertyListDescriptor } from '../property-descriptor';
import { CSSValue, isIdentToken } from '../syntax/parser';
import {
    isLengthPercentage,
    LengthPercentage,
    ZERO_LENGTH,
    FIFTY_PERCENT,
    HUNDRED_PERCENT
} from '../types/length-percentage';
import { Context } from '../../core/context';

export type ObjectPosition = [LengthPercentage, LengthPercentage];

export const objectPosition: IPropertyListDescriptor<ObjectPosition> = {
    name: 'object-position',
    initialValue: '50% 50%',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]): ObjectPosition => {
        const result: LengthPercentage[] = [];
        let i = 0;

        while (i < tokens.length && result.length < 2) {
            const token = tokens[i];
            if (isIdentToken(token)) {
                switch (token.value) {
                    case 'left':
                    case 'top':
                        result.push(ZERO_LENGTH);
                        break;
                    case 'center':
                        result.push(FIFTY_PERCENT);
                        break;
                    case 'right':
                    case 'bottom':
                        result.push(HUNDRED_PERCENT);
                        break;
                }
            } else if (isLengthPercentage(token)) {
                result.push(token);
            }
            i++;
        }

        // Fill to 2 values with defaults
        while (result.length < 2) {
            result.push(FIFTY_PERCENT);
        }

        return [result[0], result[1]];
    }
};
