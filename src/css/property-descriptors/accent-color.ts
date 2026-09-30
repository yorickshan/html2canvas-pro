import { IPropertyValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { CSSValue, isIdentToken } from '../syntax/parser';
import { color as colorType, type Color } from '../types/color';
import { Context } from '../../core/context';

/** `null` represents the `auto` keyword: browser-default control colour. */
export type AccentColor = Color | null;

export const accentColor: IPropertyValueDescriptor<AccentColor> = {
    name: 'accent-color',
    initialValue: 'auto',
    prefix: false,
    type: PropertyDescriptorParsingType.VALUE,
    parse: (context: Context, token: CSSValue): AccentColor => {
        if (isIdentToken(token) && token.value === 'auto') {
            return null;
        }
        return colorType.parse(context, token);
    }
};
