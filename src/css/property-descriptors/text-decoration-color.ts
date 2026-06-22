import { IPropertyTypeValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';

export const textDecorationColor: IPropertyTypeValueDescriptor = {
    name: `text-decoration-color`,
    initialValue: 'transparent',
    prefix: false,
    type: PropertyDescriptorParsingType.TYPE_VALUE,
    format: 'color'
};
