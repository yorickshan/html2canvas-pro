import {
    IPropertyValueDescriptor,
    IPropertyIdentValueDescriptor,
    PropertyDescriptorParsingType
} from '../property-descriptor';
import { CSSValue, isIdentToken, isDimensionToken, isNumberToken } from '../syntax/parser';
import { color as colorType, type Color } from '../types/color';
import { borderTopWidth } from './border-width';
import { Context } from '../../core/context';

export const enum OUTLINE_STYLE {
    NONE,
    AUTO,
    SOLID,
    DASHED,
    DOTTED,
    DOUBLE
}

export type OutlineColor = Color | null; // null = currentcolor / invert / auto

export const outlineStyle: IPropertyIdentValueDescriptor<OUTLINE_STYLE> = {
    name: 'outline-style',
    initialValue: 'none',
    prefix: false,
    type: PropertyDescriptorParsingType.IDENT_VALUE,
    parse: (_context: Context, value: string): OUTLINE_STYLE => {
        switch (value) {
            case 'solid':
                return OUTLINE_STYLE.SOLID;
            case 'dashed':
                return OUTLINE_STYLE.DASHED;
            case 'dotted':
                return OUTLINE_STYLE.DOTTED;
            case 'double':
                return OUTLINE_STYLE.DOUBLE;
            case 'auto':
                // The browser focus ring is only drawn for focused elements;
                // a static capture has no focused look to reproduce.
                return OUTLINE_STYLE.AUTO;
            default:
                return OUTLINE_STYLE.NONE;
        }
    }
};

export const outlineColor: IPropertyValueDescriptor<OutlineColor> = {
    name: 'outline-color',
    initialValue: 'currentcolor',
    prefix: false,
    type: PropertyDescriptorParsingType.VALUE,
    parse: (context: Context, token: CSSValue): OutlineColor => {
        if (isIdentToken(token) && (token.value === 'currentcolor' || token.value === 'invert')) {
            return null;
        }
        return colorType.parse(context, token);
    }
};

// Computed outline-width / outline-offset resolve to absolute pixel lengths,
// so the numeric value is used directly (same convention as border widths).
export const outlineWidth: IPropertyValueDescriptor<number> = {
    name: 'outline-width',
    initialValue: 'medium',
    prefix: false,
    type: PropertyDescriptorParsingType.VALUE,
    parse: borderTopWidth.parse
};

export const outlineOffset: IPropertyValueDescriptor<number> = {
    name: 'outline-offset',
    initialValue: '0px',
    prefix: false,
    type: PropertyDescriptorParsingType.VALUE,
    parse: (_context: Context, token: CSSValue): number => {
        return isDimensionToken(token) || isNumberToken(token) ? token.number : 0;
    }
};
