import { IPropertyValueDescriptor, PropertyDescriptorParsingType } from '../IPropertyDescriptor';
import { CSSValue, isIdentToken, isDimensionToken } from '../syntax/parser';
import { Context } from '../../core/context';

export type TextUnderlineOffset = number | 'auto';

export const textUnderlineOffset: IPropertyValueDescriptor<TextUnderlineOffset> = {
    name: 'text-underline-offset',
    initialValue: 'auto',
    prefix: false,
    type: PropertyDescriptorParsingType.VALUE,
    parse: (_context: Context, token: CSSValue): TextUnderlineOffset => {
        if (isIdentToken(token)) {
            if (token.value === 'auto') {
                return 'auto';
            }
        }

        if (isDimensionToken(token)) {
            // Return pixel value
            return token.number;
        }

        // Default to auto
        return 'auto';
    }
};
