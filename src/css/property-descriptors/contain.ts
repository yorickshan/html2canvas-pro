import { IPropertyIdentValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { Context } from '../../core/context';

export const enum CONTAIN {
    NONE = 0,
    /** `paint`, `layout`, `strict`, `content` or `size paint`-style combos. */
    PAINT_ISOLATION = 1
}

export const contain: IPropertyIdentValueDescriptor<CONTAIN> = {
    name: 'contain',
    initialValue: 'none',
    prefix: false,
    type: PropertyDescriptorParsingType.IDENT_VALUE,
    parse: (_context: Context, value: string): CONTAIN => {
        // The computed value can be a space-separated list (strict, content,
        // size paint, …). Only the paint-affecting keywords isolate the
        // element's painting into its own stacking context; `size` and
        // `style` alone do not. Layout/size effects are already correct in
        // the clone because the browser lays it out.
        return /\b(paint|strict|content)\b/.test(value) ? CONTAIN.PAINT_ISOLATION : CONTAIN.NONE;
    }
};
