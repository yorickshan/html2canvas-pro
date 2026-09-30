import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { CSSValue, isDimensionToken, isIdentToken } from '../syntax/parser';
import { TokenType } from '../syntax/tokenizer';
import { ICSSImage, image, isSupportedImage } from '../types/image';
import { Context } from '../../core/context';

export type BoxReflectDirection = 'below' | 'above' | 'left' | 'right';

export interface BoxReflect {
    direction: BoxReflectDirection;
    /** Gap between the element and its reflection, in pixels. */
    offset: number;
    /** Optional mask applied to the reflection (element coordinate space). */
    mask: ICSSImage | null;
}

export type BoxReflectValue = BoxReflect | null;

/**
 * -webkit-box-reflect: <direction> <offset>? <mask-image>?
 *
 * Chrome serialises the computed value with the mask's border-image
 * bookkeeping appended (e.g. "... linear-gradient(...) 0 fill / auto /
 * 0 stretch"), so tokens after the image are parsed and ignored.
 */
export const webkitBoxReflect: IPropertyListDescriptor<BoxReflectValue> = {
    name: '-webkit-box-reflect',
    initialValue: 'none',
    prefix: true,
    type: PropertyDescriptorParsingType.LIST,
    skipCache: true, // mask url() must reach the image cache on every pass
    parse: (context: Context, tokens: CSSValue[]): BoxReflectValue => {
        let direction: BoxReflectDirection | null = null;
        let offset = 0;
        let mask: ICSSImage | null = null;

        for (const token of tokens) {
            if (token.type === TokenType.WHITESPACE_TOKEN) continue;
            if (direction === null && isIdentToken(token)) {
                if (
                    token.value === 'below' ||
                    token.value === 'above' ||
                    token.value === 'left' ||
                    token.value === 'right'
                ) {
                    direction = token.value;
                    continue;
                }
                if (token.value === 'none') {
                    return null;
                }
            }
            if (offset === 0 && isDimensionToken(token) && token.unit === 'px') {
                offset = token.number;
                continue;
            }
            if (mask === null && isSupportedImage(token)) {
                mask = image.parse(context, token);
                continue;
            }
            // Anything else (the mask's border-image bookkeeping) is ignored.
        }

        if (direction === null) {
            return null;
        }
        return { direction, offset, mask };
    }
};
