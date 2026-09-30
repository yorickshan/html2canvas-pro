import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { filter, type FilterValue } from './filter';
import { Context } from '../../core/context';

/**
 * backdrop-filter shares the filter value grammar and canvas filter string
 * reconstruction. Rendering captures the already-painted backdrop region and
 * applies the filter surface pipeline to it.
 */
export type BackdropFilter = FilterValue;

export const backdropFilter: IPropertyListDescriptor<BackdropFilter> = {
    name: 'backdrop-filter',
    initialValue: 'none',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (context: Context, tokens): BackdropFilter => filter.parse(context, tokens)
};
