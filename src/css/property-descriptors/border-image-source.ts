import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { CSSValue, nonFunctionArgSeparator } from '../syntax/parser';
import { image, ICSSImage, isSupportedImage } from '../types/image';
import { Context } from '../../core/context';

export type BorderImageSource = ICSSImage | null;

export const borderImageSource: IPropertyListDescriptor<BorderImageSource> = {
    name: 'border-image-source',
    initialValue: 'none',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    skipCache: true,
    parse: (context: Context, tokens: CSSValue[]): BorderImageSource => {
        if (tokens.length === 0) {
            return null;
        }

        const filtered = tokens.filter((t) => nonFunctionArgSeparator(t) && isSupportedImage(t));
        if (filtered.length === 0) {
            return null;
        }

        return image.parse(context, filtered[0]);
    }
};
