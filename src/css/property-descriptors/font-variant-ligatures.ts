import { IPropertyIdentValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { Context } from '../../core/context';

export const enum FONT_VARIANT_LIGATURES {
    NORMAL = 0,
    NONE = 1,
    COMMON_LIGATURES = 2,
    NO_COMMON_LIGATURES = 3,
    DISCRETIONARY_LIGATURES = 4,
    NO_DISCRETIONARY_LIGATURES = 5,
    HISTORICAL_LIGATURES = 6,
    NO_HISTORICAL_LIGATURES = 7,
    CONTEXTUAL = 8,
    NO_CONTEXTUAL = 9
}

export const fontVariantLigatures: IPropertyIdentValueDescriptor<FONT_VARIANT_LIGATURES> = {
    name: 'font-variant-ligatures',
    initialValue: 'normal',
    prefix: false,
    type: PropertyDescriptorParsingType.IDENT_VALUE,
    parse: (_context: Context, value: string): FONT_VARIANT_LIGATURES => {
        switch (value) {
            case 'none':
                return FONT_VARIANT_LIGATURES.NONE;
            case 'common-ligatures':
                return FONT_VARIANT_LIGATURES.COMMON_LIGATURES;
            case 'no-common-ligatures':
                return FONT_VARIANT_LIGATURES.NO_COMMON_LIGATURES;
            case 'discretionary-ligatures':
                return FONT_VARIANT_LIGATURES.DISCRETIONARY_LIGATURES;
            case 'no-discretionary-ligatures':
                return FONT_VARIANT_LIGATURES.NO_DISCRETIONARY_LIGATURES;
            case 'historical-ligatures':
                return FONT_VARIANT_LIGATURES.HISTORICAL_LIGATURES;
            case 'no-historical-ligatures':
                return FONT_VARIANT_LIGATURES.NO_HISTORICAL_LIGATURES;
            case 'contextual':
                return FONT_VARIANT_LIGATURES.CONTEXTUAL;
            case 'no-contextual':
                return FONT_VARIANT_LIGATURES.NO_CONTEXTUAL;
            case 'normal':
            default:
                return FONT_VARIANT_LIGATURES.NORMAL;
        }
    }
};
