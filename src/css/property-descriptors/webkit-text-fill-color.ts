import { IPropertyValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { CSSValue, isIdentToken } from '../syntax/parser';
import { color as colorType, type Color } from '../types/color';
import { Context } from '../../core/context';

/**
 * `null` represents `currentcolor`: the text renderer falls back to `color`.
 * Computed styles resolve currentcolor in browsers, but jsdom and older
 * engines may hand us the keyword verbatim.
 */
export type WebkitTextFillColor = Color | null;

export const webkitTextFillColor: IPropertyValueDescriptor<WebkitTextFillColor> = {
    name: '-webkit-text-fill-color',
    initialValue: 'currentcolor',
    prefix: true,
    type: PropertyDescriptorParsingType.VALUE,
    parse: (context: Context, token: CSSValue): WebkitTextFillColor => {
        if (isIdentToken(token) && token.value === 'currentcolor') {
            return null;
        }
        return colorType.parse(context, token);
    }
};
