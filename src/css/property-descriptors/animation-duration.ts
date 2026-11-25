import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { Context } from '../../core/context';
import { CSSValue, isDimensionToken } from '../syntax/parser';
import { time } from '../types/time';

export const animationDuration: IPropertyListDescriptor<number[]> = {
    name: 'animationDuration',
    initialValue: '0s',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (context: Context, tokens: CSSValue[]) => {
        return tokens.filter(isDimensionToken).map((token) => time.parse(context, token));
    }
};
