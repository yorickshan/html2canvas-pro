import { ElementContainer, ElementContainerOptions } from '../element-container';
import { Context } from '../../core/context';
export class OLElementContainer extends ElementContainer {
    readonly start: number;
    readonly reversed: boolean;

    constructor(context: Context, element: HTMLOListElement, options: ElementContainerOptions = {}) {
        super(context, element, options);
        this.start = element.start;
        this.reversed = typeof element.reversed === 'boolean' && element.reversed === true;
    }
}
