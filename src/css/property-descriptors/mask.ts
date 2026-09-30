import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { backgroundImage } from './background-image';
import { backgroundPosition, type BackgroundPosition } from './background-position';
import { backgroundRepeat, type BackgroundRepeat } from './background-repeat';
import { backgroundSize, type BackgroundSize } from './background-size';
import { ICSSImage } from '../types/image';

/**
 * CSS Masking (mask-image / mask-position / mask-repeat / mask-size).
 *
 * Value grammars are identical to their background counterparts, so the
 * background parsers are reused verbatim — including the addImage side
 * effect that requires `skipCache` on mask-image. -webkit-mask-* aliases
 * resolve to these properties in computed style.
 *
 * mask-mode/mask-clip/mask-origin/mask-composite are accepted by the browser
 * but not parsed here; rendering assumes the default alpha masking with
 * `add` layer compositing.
 */

export type MaskImage = ICSSImage[];
export type MaskPosition = BackgroundPosition;
export type MaskRepeat = BackgroundRepeat;
export type MaskSize = BackgroundSize;

export const maskImage: IPropertyListDescriptor<MaskImage> = {
    name: 'mask-image',
    initialValue: 'none',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    skipCache: true,
    parse: backgroundImage.parse
};

export const maskPosition: IPropertyListDescriptor<MaskPosition> = {
    name: 'mask-position',
    initialValue: '0%',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: backgroundPosition.parse
};

export const maskRepeat: IPropertyListDescriptor<MaskRepeat> = {
    name: 'mask-repeat',
    initialValue: 'repeat',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: backgroundRepeat.parse
};

export const maskSize: IPropertyListDescriptor<MaskSize> = {
    name: 'mask-size',
    initialValue: 'auto',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: backgroundSize.parse
};
