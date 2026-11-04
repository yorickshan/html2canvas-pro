import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { CSSValue, isIdentToken } from '../syntax/parser';
import { Context } from '../../core/context';

export const enum WILL_CHANGE {
    AUTO = 0,
    /** Any paint-affecting hint: the element creates a stacking context. */
    STACKING = 1
}

// Hints that force the element into its own layer / stacking context. For a
// static snapshot that isolation is the only observable effect, and it must
// be reflected in paint order (a `will-change: transform` element must not
// paint beneath a later sibling just because z-index is auto).
const STACKING_HINTS = new Set([
    'transform',
    'translate',
    'rotate',
    'scale',
    'opacity',
    'filter',
    'backdrop-filter',
    'mix-blend-mode',
    'isolation',
    'clip-path',
    'mask',
    'mask-image',
    'mask-border',
    'perspective',
    'contain',
    'offset-path',
    'offset-distance',
    'offset-rotate',
    'top',
    'left',
    'bottom',
    'right',
    'z-index'
]);

export const willChange: IPropertyListDescriptor<WILL_CHANGE> = {
    name: 'will-change',
    initialValue: 'auto',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]): WILL_CHANGE => {
        // `auto` and `scroll-position` carry no paint isolation; a list
        // containing any paint-affecting hint does. Unrecognised custom
        // identifiers are ignored — the spec reserves them for future
        // properties, and guessing would over-isolate.
        return tokens.some((token) => isIdentToken(token) && STACKING_HINTS.has(token.value))
            ? WILL_CHANGE.STACKING
            : WILL_CHANGE.AUTO;
    }
};
