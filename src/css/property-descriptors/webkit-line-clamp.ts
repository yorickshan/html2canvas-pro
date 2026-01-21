import { IPropertyValueDescriptor, PropertyDescriptorParsingType } from '../IPropertyDescriptor';
import { CSSValue } from '../syntax/parser';
import { TokenType } from '../syntax/tokenizer';
import { Context } from '../../core/context';

/**
 * -webkit-line-clamp property descriptor
 * Used with display: -webkit-box and -webkit-box-orient: vertical
 * to limit text to a specific number of lines
 */
export const webkitLineClamp: IPropertyValueDescriptor<number> = {
    name: '-webkit-line-clamp',
    initialValue: 'none',
    prefix: true,
    type: PropertyDescriptorParsingType.VALUE,
    parse: (_context: Context, token: CSSValue) => {
        // 'none' means no line clamping
        if (token.type === TokenType.IDENT_TOKEN && token.value === 'none') {
            return 0;
        }

        // Number value specifies the number of lines
        if (token.type === TokenType.NUMBER_TOKEN) {
            return Math.max(0, Math.floor(token.number));
        }

        // Default to 0 (no clamping)
        return 0;
    }
};
