import { IPropertyValueDescriptor, PropertyDescriptorParsingType } from '../IPropertyDescriptor';
import { CSSValue, isIdentToken, isDimensionToken } from '../syntax/parser';
import { Context } from '../../core/context';

export type TextDecorationThickness = number | 'auto' | 'from-font';

export const textDecorationThickness: IPropertyValueDescriptor<TextDecorationThickness> = {
    name: 'text-decoration-thickness',
    initialValue: 'auto',
    prefix: false,
    type: PropertyDescriptorParsingType.VALUE,
    parse: (_context: Context, token: CSSValue): TextDecorationThickness => {
        if (isIdentToken(token)) {
            switch (token.value) {
                case 'auto':
                    return 'auto';
                case 'from-font':
                    return 'from-font';
            }
        }

        if (isDimensionToken(token)) {
            // Convert to pixels
            return token.number;
        }

        // Default to auto
        return 'auto';
    }
};
