import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { CSSValue, isIdentToken, nonFunctionArgSeparator } from '../syntax/parser';
import { Context } from '../../core/context';

export const MIX_BLEND_MODE = {
    NORMAL: 'normal',
    MULTIPLY: 'multiply',
    SCREEN: 'screen',
    OVERLAY: 'overlay',
    DARKEN: 'darken',
    LIGHTEN: 'lighten',
    COLOR_DODGE: 'color-dodge',
    COLOR_BURN: 'color-burn',
    HARD_LIGHT: 'hard-light',
    SOFT_LIGHT: 'soft-light',
    DIFFERENCE: 'difference',
    EXCLUSION: 'exclusion',
    HUE: 'hue',
    SATURATION: 'saturation',
    COLOR: 'color',
    LUMINOSITY: 'luminosity'
} as const;

export type BackgroundBlendMode = BlendModeValue[];

type BlendModeValue = (typeof MIX_BLEND_MODE)[keyof typeof MIX_BLEND_MODE];

const VALID_VALUES = new Set<string>(Object.values(MIX_BLEND_MODE));

export const backgroundBlendMode: IPropertyListDescriptor<BackgroundBlendMode> = {
    name: 'background-blend-mode',
    initialValue: 'normal',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]): BackgroundBlendMode => {
        const modes: BackgroundBlendMode = [];
        const filtered = tokens.filter(nonFunctionArgSeparator);

        for (const token of filtered) {
            if (isIdentToken(token)) {
                if (VALID_VALUES.has(token.value)) {
                    modes.push(token.value as BlendModeValue);
                }
            }
        }

        return modes.length > 0 ? modes : ['normal'];
    }
};
