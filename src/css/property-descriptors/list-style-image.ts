import { TokenType } from '../syntax/tokenizer';
import { ICSSImage, image } from '../types/image';
import { IPropertyValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { CSSValue } from '../syntax/parser';
import { Context } from '../../core/context';

export const listStyleImage: IPropertyValueDescriptor<ICSSImage | null> = {
    name: 'list-style-image',
    initialValue: 'none',
    type: PropertyDescriptorParsingType.VALUE,
    prefix: false,
    skipCache: true,
    parse: (context: Context, token: CSSValue) => {
        if (token.type === TokenType.IDENT_TOKEN && token.value === 'none') {
            return null;
        }

        return image.parse(context, token);
    }
};
