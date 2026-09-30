import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { at } from '../../core/util';
import { CSSValue, isIdentToken } from '../syntax/parser';
import { TokenType } from '../syntax/tokenizer';
import { Context } from '../../core/context';

export type BorderImageWidthSide =
    | { kind: 'auto' }
    | { kind: 'length'; value: number }
    | { kind: 'percentage'; value: number }
    | { kind: 'number'; value: number };

const fillSides = <T>(sides: T[]): [T, T, T, T] => {
    const result = [...sides];
    if (result.length === 1) {
        const only = at(result, 0);
        result.push(only, only, only);
    } else if (result.length === 2) {
        result.push(at(result, 0), at(result, 1));
    } else if (result.length === 3) {
        result.push(at(result, 1));
    }
    return [at(result, 0), at(result, 1), at(result, 2), at(result, 3)];
};

const parseSide = (token: CSSValue): BorderImageWidthSide | null => {
    if (isIdentToken(token) && token.value === 'auto') {
        return { kind: 'auto' };
    }
    if (token.type === TokenType.NUMBER_TOKEN) {
        return { kind: 'number', value: token.number };
    }
    if (token.type === TokenType.DIMENSION_TOKEN && token.unit === 'px') {
        return { kind: 'length', value: token.number };
    }
    if (token.type === TokenType.PERCENTAGE_TOKEN) {
        return { kind: 'percentage', value: token.number };
    }
    return null;
};

const parseSides = (
    tokens: CSSValue[]
): [BorderImageWidthSide, BorderImageWidthSide, BorderImageWidthSide, BorderImageWidthSide] | null => {
    const sides: BorderImageWidthSide[] = [];
    for (const token of tokens) {
        if (token.type === TokenType.WHITESPACE_TOKEN) continue;
        const side = parseSide(token);
        if (!side) return null;
        sides.push(side);
    }
    if (sides.length === 0 || sides.length > 4) return null;
    return fillSides(sides);
};

/**
 * border-image-width controls the width of the nine-slice border areas.
 * `auto` (= the corresponding border width), `number` (multiples of the
 * border width), lengths and percentages of the border image area are all
 * resolved against the border widths at render time.
 */
export const borderImageWidth: IPropertyListDescriptor<{
    top: BorderImageWidthSide;
    right: BorderImageWidthSide;
    bottom: BorderImageWidthSide;
    left: BorderImageWidthSide;
}> = {
    name: 'border-image-width',
    initialValue: 'auto',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens) => {
        const sides = parseSides(tokens);
        const auto: BorderImageWidthSide = { kind: 'auto' };
        const fallback = { top: auto, right: auto, bottom: auto, left: auto };
        return sides ? { top: sides[0], right: sides[1], bottom: sides[2], left: sides[3] } : fallback;
    }
};

export interface BorderImageOutset {
    top: BorderImageWidthSide;
    right: BorderImageWidthSide;
    bottom: BorderImageWidthSide;
    left: BorderImageWidthSide;
}

/**
 * border-image-outset pushes the border image area outside the border box.
 * Only lengths and numbers (multiples of the border width) are valid here.
 */
export const borderImageOutset: IPropertyListDescriptor<BorderImageOutset> = {
    name: 'border-image-outset',
    initialValue: '0px',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens) => {
        const sides = parseSides(tokens);
        const zero: BorderImageWidthSide = { kind: 'length', value: 0 };
        const zeroSides = { top: zero, right: zero, bottom: zero, left: zero };
        return sides ? { top: sides[0], right: sides[1], bottom: sides[2], left: sides[3] } : zeroSides;
    }
};
