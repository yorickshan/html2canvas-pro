import { IPropertyValueDescriptor, PropertyDescriptorParsingType } from '../IPropertyDescriptor';
import { CSSValue } from '../syntax/parser';
import { TokenType } from '../syntax/tokenizer';
import { Context } from '../../core/context';
import { angle } from '../types/angle';

export type Rotate = number | null;

export const rotate: IPropertyValueDescriptor<Rotate> = {
    name: 'rotate',
    initialValue: 'none',
    prefix: false,
    type: PropertyDescriptorParsingType.VALUE,
    parse: (_context: Context, token: CSSValue): Rotate => {
        if (token.type === TokenType.IDENT_TOKEN && token.value === 'none') {
            return null;
        }

        if (token.type === TokenType.NUMBER_TOKEN) {
            if (token.number === 0) {
                return 0;
            }
        }

        if (token.type === TokenType.DIMENSION_TOKEN) {
            // Parse angle and convert to degrees for storage
            const radians = angle.parse(_context, token);
            // Store as degrees for consistency
            return (radians * 180) / Math.PI;
        }

        return null;
    }
};
