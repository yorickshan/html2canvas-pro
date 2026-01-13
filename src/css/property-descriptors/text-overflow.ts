import { IPropertyIdentValueDescriptor, PropertyDescriptorParsingType } from '../IPropertyDescriptor';
import { Context } from '../../core/context';

export const enum TEXT_OVERFLOW {
    CLIP = 0,
    ELLIPSIS = 1
}

export const textOverflow: IPropertyIdentValueDescriptor<TEXT_OVERFLOW> = {
    name: 'text-overflow',
    initialValue: 'clip',
    prefix: false,
    type: PropertyDescriptorParsingType.IDENT_VALUE,
    parse: (_context: Context, textOverflow: string) => {
        switch (textOverflow) {
            case 'ellipsis':
                return TEXT_OVERFLOW.ELLIPSIS;
            case 'clip':
            default:
                return TEXT_OVERFLOW.CLIP;
        }
    }
};
