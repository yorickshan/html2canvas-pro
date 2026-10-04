import { ElementContainer, ElementContainerOptions } from '../element-container';
import { Context } from '../../core/context';
export class SelectElementContainer extends ElementContainer {
    readonly value: string;
    constructor(context: Context, element: HTMLSelectElement, options: ElementContainerOptions = {}) {
        super(context, element, options);
        const option = element.options[element.selectedIndex || 0];
        this.value = option ? option.text || '' : '';
    }
}
