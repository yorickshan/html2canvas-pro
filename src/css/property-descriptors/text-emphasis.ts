import {
    IPropertyListDescriptor,
    IPropertyValueDescriptor,
    PropertyDescriptorParsingType
} from '../property-descriptor';
import { CSSValue, isIdentToken, nonWhiteSpace } from '../syntax/parser';
import { StringValueToken, TokenType } from '../syntax/tokenizer';
import { color as colorType, type Color } from '../types/color';
import { at } from '../../core/util';
import { Context } from '../../core/context';

export type TextEmphasisShape = 'dot' | 'circle' | 'double-circle' | 'triangle' | 'sesame';

/**
 * `null` — `none`. A string — custom mark character(s). Otherwise the keyword
 * pair resolved from the computed value (e.g. "filled circle").
 */
export type TextEmphasisStyle = { fill: boolean; shape: TextEmphasisShape } | string | null;

const SHAPES: TextEmphasisShape[] = ['dot', 'circle', 'double-circle', 'triangle', 'sesame'];

export const textEmphasisStyle: IPropertyListDescriptor<TextEmphasisStyle> = {
    name: 'text-emphasis-style',
    initialValue: 'none',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]): TextEmphasisStyle => {
        const values = tokens.filter(nonWhiteSpace);
        if (values.length === 0) {
            return null;
        }
        const first = at(values, 0);
        if (first.type === TokenType.STRING_TOKEN) {
            // Custom string styles serialize as a quoted string.
            return (first as StringValueToken).value;
        }
        if (isIdentToken(first)) {
            if (first.value === 'none') {
                return null;
            }
            if (
                first.value !== 'filled' &&
                first.value !== 'open' &&
                SHAPES.indexOf(first.value as TextEmphasisShape) === -1
            ) {
                return first.value;
            }
        }

        let fill = true; // initial value: filled
        let shape: TextEmphasisShape = 'circle';
        for (const token of values) {
            if (!isIdentToken(token)) continue;
            if (token.value === 'filled') {
                fill = true;
            } else if (token.value === 'open') {
                fill = false;
            } else if (SHAPES.indexOf(token.value as TextEmphasisShape) !== -1) {
                shape = token.value as TextEmphasisShape;
            }
        }
        return { fill, shape };
    }
};

/** `null` = currentcolor; the renderer falls back to the text colour. */
export type TextEmphasisColor = Color | null;

export const textEmphasisColor: IPropertyValueDescriptor<TextEmphasisColor> = {
    name: 'text-emphasis-color',
    initialValue: 'currentcolor',
    prefix: false,
    type: PropertyDescriptorParsingType.VALUE,
    parse: (context: Context, token: CSSValue): TextEmphasisColor => {
        if (isIdentToken(token) && token.value === 'currentcolor') {
            return null;
        }
        return colorType.parse(context, token);
    }
};

export interface TextEmphasisPosition {
    /** Marks above the text (over) or below (under). */
    over: boolean;
    /** Vertical-writing side for horizontal default; kept for completeness. */
    right: boolean;
}

export const textEmphasisPosition: IPropertyListDescriptor<TextEmphasisPosition> = {
    name: 'text-emphasis-position',
    initialValue: 'over right',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]): TextEmphasisPosition => {
        let over = true;
        let right = true;
        for (const token of tokens) {
            if (!isIdentToken(token)) continue;
            switch (token.value) {
                case 'over':
                    over = true;
                    break;
                case 'under':
                    over = false;
                    break;
                case 'right':
                    right = true;
                    break;
                case 'left':
                    right = false;
                    break;
            }
        }
        return { over, right };
    }
};
