import { ElementContainer, ElementContainerOptions } from '../element-container';
import { Context } from '../../core/context';
export class TextareaElementContainer extends ElementContainer {
    readonly value: string;
    constructor(context: Context, element: HTMLTextAreaElement, options: ElementContainerOptions = {}) {
        super(context, element, options);
        this.value = element.value;
    }
}
