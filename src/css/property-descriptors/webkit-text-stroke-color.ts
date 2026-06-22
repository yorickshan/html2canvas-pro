import { IPropertyTypeValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
export const webkitTextStrokeColor: IPropertyTypeValueDescriptor = {
    name: `-webkit-text-stroke-color`,
    initialValue: 'currentcolor',
    prefix: false,
    type: PropertyDescriptorParsingType.TYPE_VALUE,
    format: 'color'
};
