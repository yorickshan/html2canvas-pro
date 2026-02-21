import { IPropertyIdentValueDescriptor, PropertyDescriptorParsingType } from '../IPropertyDescriptor';
import { Context } from '../../core/context';

export enum IMAGE_RENDERING {
    AUTO = 0,
    CRISP_EDGES = 1,
    PIXELATED = 2,
    SMOOTH = 3
}

export const imageRendering: IPropertyIdentValueDescriptor<IMAGE_RENDERING> = {
    name: 'image-rendering',
    initialValue: 'auto',
    prefix: false,
    type: PropertyDescriptorParsingType.IDENT_VALUE,
    parse: (_context: Context, value: string): IMAGE_RENDERING => {
        switch (value.toLowerCase()) {
            case 'crisp-edges':
            case '-webkit-crisp-edges':
            case '-moz-crisp-edges':
                return IMAGE_RENDERING.CRISP_EDGES;
            case 'pixelated':
            case '-webkit-optimize-contrast':
                return IMAGE_RENDERING.PIXELATED;
            case 'smooth':
            case 'high-quality':
                return IMAGE_RENDERING.SMOOTH;
            case 'auto':
            default:
                return IMAGE_RENDERING.AUTO;
        }
    }
};
