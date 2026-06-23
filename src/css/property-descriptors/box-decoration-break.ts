import { IPropertyIdentValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { Context } from '../../core/context';

export const enum BOX_DECORATION_BREAK {
    SLICE = 0,
    CLONE = 1
}

export const boxDecorationBreak: IPropertyIdentValueDescriptor<BOX_DECORATION_BREAK> = {
    name: 'box-decoration-break',
    initialValue: 'slice',
    prefix: false,
    type: PropertyDescriptorParsingType.IDENT_VALUE,
    parse: (_context: Context, token: string): BOX_DECORATION_BREAK => {
        switch (token) {
            case 'clone':
                return BOX_DECORATION_BREAK.CLONE;
            case 'slice':
            default:
                return BOX_DECORATION_BREAK.SLICE;
        }
    }
};
