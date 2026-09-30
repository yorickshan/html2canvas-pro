import { IPropertyIdentValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { Context } from '../../core/context';

export const enum ISOLATION {
    AUTO = 0,
    ISOLATE = 1
}

export const isolation: IPropertyIdentValueDescriptor<ISOLATION> = {
    name: 'isolation',
    initialValue: 'auto',
    prefix: false,
    type: PropertyDescriptorParsingType.IDENT_VALUE,
    parse: (_context: Context, value: string): ISOLATION => {
        // `isolate` creates a stacking context so blended descendants cannot
        // composite against content outside the group.
        return value === 'isolate' ? ISOLATION.ISOLATE : ISOLATION.AUTO;
    }
};
