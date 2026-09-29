import { PropertyDescriptorParsingType, IPropertyListDescriptor } from '../property-descriptor';
import { at } from '../../core/util';
import { CSSValue, isIdentWithValue, parseFunctionArgs } from '../syntax/parser';
import { ZERO_LENGTH } from '../types/length-percentage';
import { TRANSPARENT_COLOR, color as colorType, type Color } from '../types/color';
import { isLength, Length } from '../types/length';
import { Context } from '../../core/context';

export type TextShadow = TextShadowItem[];
interface TextShadowItem {
    color: Color;
    offsetX: Length;
    offsetY: Length;
    blur: Length;
}

export const textShadow: IPropertyListDescriptor<TextShadow> = {
    name: 'text-shadow',
    initialValue: 'none',
    type: PropertyDescriptorParsingType.LIST,
    prefix: false,
    parse: (context: Context, tokens: CSSValue[]): TextShadow => {
        if (tokens.length === 1 && isIdentWithValue(at(tokens, 0), 'none')) {
            return [];
        }

        return parseFunctionArgs(tokens).map((values: CSSValue[]) => {
            const shadow: TextShadowItem = {
                color: TRANSPARENT_COLOR,
                offsetX: ZERO_LENGTH,
                offsetY: ZERO_LENGTH,
                blur: ZERO_LENGTH
            };
            let c = 0;
            for (let i = 0; i < values.length; i++) {
                const token = values[i];
                if (!token) continue;
                if (isLength(token)) {
                    if (c === 0) {
                        shadow.offsetX = token;
                    } else if (c === 1) {
                        shadow.offsetY = token;
                    } else {
                        shadow.blur = token;
                    }
                    c++;
                } else {
                    shadow.color = colorType.parse(context, token);
                }
            }
            return shadow;
        });
    }
};
