import { IPropertyTypeValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';

export const fontSize: IPropertyTypeValueDescriptor = {
    name: `font-size`,
    initialValue: '0',
    prefix: false,
    type: PropertyDescriptorParsingType.TYPE_VALUE,
    format: 'length'
};
