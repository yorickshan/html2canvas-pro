import { ElementContainer, ElementContainerOptions } from '../element-container';
import { Context } from '../../core/context';
export class LIElementContainer extends ElementContainer {
    readonly value: number;

    constructor(context: Context, element: HTMLLIElement, options: ElementContainerOptions = {}) {
        super(context, element, options);
        this.value = element.value;
    }
}
