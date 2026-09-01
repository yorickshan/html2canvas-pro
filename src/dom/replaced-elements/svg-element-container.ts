import { ElementContainer } from '../element-container';
import { parseBounds } from '../../css/layout/bounds';
import { Context } from '../../core/context';

const BOX_OFFSET_PROPERTIES = [
    'position',
    'inset',
    'top',
    'right',
    'bottom',
    'left',
    'inset-inline',
    'inset-inline-start',
    'inset-inline-end',
    'inset-block',
    'inset-block-start',
    'inset-block-end',
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'margin-inline',
    'margin-inline-start',
    'margin-inline-end',
    'margin-block',
    'margin-block-start',
    'margin-block-end'
];

export const serializeWithoutBoxOffsets = (serializer: XMLSerializer, img: SVGSVGElement): string => {
    const style = img.getAttribute('style');
    BOX_OFFSET_PROPERTIES.forEach((property) => img.style.removeProperty(property));
    const serialized = serializer.serializeToString(img);

    if (style === null) {
        img.removeAttribute('style');
    } else {
        img.setAttribute('style', style);
    }

    return serialized;
};

export class SVGElementContainer extends ElementContainer {
    svg: string;
    intrinsicWidth: number;
    intrinsicHeight: number;

    constructor(context: Context, img: SVGSVGElement) {
        super(context, img);
        const s = new XMLSerializer();
        const bounds = parseBounds(context, img);
        img.setAttribute('width', `${bounds.width}px`);
        img.setAttribute('height', `${bounds.height}px`);

        this.svg = `data:image/svg+xml,${encodeURIComponent(serializeWithoutBoxOffsets(s, img))}`;
        this.intrinsicWidth = img.width.baseVal.value;
        this.intrinsicHeight = img.height.baseVal.value;

        this.context.cache.addImage(this.svg);
    }
}
