import { ElementContainer, ElementContainerOptions } from '../element-container';
import { Context } from '../../core/context';

export class ImageElementContainer extends ElementContainer {
    src: string;
    intrinsicWidth: number;
    intrinsicHeight: number;

    constructor(context: Context, img: HTMLImageElement, options: ElementContainerOptions = {}) {
        super(context, img, options);
        this.src = img.currentSrc || img.src;
        this.intrinsicWidth = img.naturalWidth;
        this.intrinsicHeight = img.naturalHeight;
        this.context.cache.addImage(this.src);
    }
}
