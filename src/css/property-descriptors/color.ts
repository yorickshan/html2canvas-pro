import { IPropertyTypeValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';

export const color: IPropertyTypeValueDescriptor = {
    name: `color`,
    initialValue: 'transparent',
    prefix: false,
    type: PropertyDescriptorParsingType.TYPE_VALUE,
    format: 'color'
};
