import { IPropertyIdentValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
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

export type MixBlendMode = (typeof MIX_BLEND_MODE)[keyof typeof MIX_BLEND_MODE];

const VALID_VALUES = new Set<string>(Object.values(MIX_BLEND_MODE));

export const mixBlendMode: IPropertyIdentValueDescriptor<MixBlendMode> = {
    name: 'mix-blend-mode',
    initialValue: 'normal',
    type: PropertyDescriptorParsingType.IDENT_VALUE,
    prefix: false,
    parse: (_context: Context, token: string): MixBlendMode => {
        return VALID_VALUES.has(token) ? (token as MixBlendMode) : MIX_BLEND_MODE.NORMAL;
    }
};
