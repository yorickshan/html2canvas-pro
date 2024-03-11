import {IPropertyListDescriptor, PropertyDescriptorParsingType} from '../IPropertyDescriptor';
import {CSSValue, isIdentToken} from '../syntax/parser';
import {Context} from '../../core/context';
export const enum OBJECT_FIT {
    FILL = 0,
    CONTAIN = 1 << 1,
    COVER = 1 << 2,
    NONE = 1 << 3,
    SCALE_DOWN = 1 << 4
}

export type ObjectFit = number;

export const objectFit: IPropertyListDescriptor<ObjectFit> = {
    name: 'objectFit',
    initialValue: 'fill',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]): ObjectFit => {
        return tokens.filter(isIdentToken).reduce((bit, token) => {
            return bit | parseDisplayValue(token.value);
        }, OBJECT_FIT.FILL);
    }
};

const parseDisplayValue = (display: string): ObjectFit => {
    switch (display) {
        case 'contain':
            return OBJECT_FIT.CONTAIN;
        case 'cover':
            return OBJECT_FIT.COVER;
        case 'none':
            return OBJECT_FIT.NONE;
        case 'scale-down':
            return OBJECT_FIT.SCALE_DOWN;
    }

    return OBJECT_FIT.FILL;
};
