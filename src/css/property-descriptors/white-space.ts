import { IPropertyIdentValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { Context } from '../../core/context';

export enum WHITE_SPACE {
    NORMAL = 'normal',
    PRE = 'pre',
    NOWRAP = 'nowrap',
    PRE_WRAP = 'pre-wrap',
    PRE_LINE = 'pre-line'
}

export const whiteSpace: IPropertyIdentValueDescriptor<WHITE_SPACE> = {
    name: 'white-space',
    initialValue: 'normal',
    prefix: false,
    type: PropertyDescriptorParsingType.IDENT_VALUE,
    parse: (_context: Context, value: string): WHITE_SPACE => {
        switch (value) {
            case 'pre':
                return WHITE_SPACE.PRE;
            case 'nowrap':
                return WHITE_SPACE.NOWRAP;
            case 'pre-wrap':
                return WHITE_SPACE.PRE_WRAP;
            case 'pre-line':
                return WHITE_SPACE.PRE_LINE;
            case 'normal':
            default:
                return WHITE_SPACE.NORMAL;
        }
    }
};
