import { ElementContainer, ElementContainerOptions } from '../element-container';
import { Context } from '../../core/context';

export class CanvasElementContainer extends ElementContainer {
    canvas: HTMLCanvasElement;
    intrinsicWidth: number;
    intrinsicHeight: number;

    constructor(context: Context, canvas: HTMLCanvasElement, options: ElementContainerOptions = {}) {
        super(context, canvas, options);
        this.canvas = canvas;
        this.intrinsicWidth = canvas.width;
        this.intrinsicHeight = canvas.height;
    }
}
