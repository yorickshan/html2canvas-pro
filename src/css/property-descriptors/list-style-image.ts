import { TokenType } from '../syntax/tokenizer';
import { ICSSImage, image, isSupportedImage } from '../types/image';
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

        // image.parse throws on unsupported image functions (e.g.
        // repeating-conic-gradient, cross-fade()), which would fail the whole
        // capture. Skip the marker image instead, like background-image does.
        if (!isSupportedImage(token)) {
            return null;
        }

        return image.parse(context, token);
    }
};
