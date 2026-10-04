import { ElementContainer, ElementContainerOptions } from '../element-container';
import { parseColor, type Color } from '../../css/types/color';
import { TRANSPARENT_COLOR } from '../../css/types/color';
import { isTransparent } from '../../css/types/color-utilities';
import { Context } from '../../core/context';

// Parser function type to break circular dependency
type ParseTreeFunction = (context: Context, node: HTMLElement) => ElementContainer;

export class IFrameElementContainer extends ElementContainer {
    src: string;
    width: number;
    height: number;
    tree?: ElementContainer;
    backgroundColor: Color;
    private parseTreeFn?: ParseTreeFunction;

    constructor(
        context: Context,
        iframe: HTMLIFrameElement,
        parseTreeFn?: ParseTreeFunction,
        options: ElementContainerOptions = {}
    ) {
        super(context, iframe, options);
        this.src = iframe.src;
        this.width = parseInt(iframe.width, 10) || 0;
        this.height = parseInt(iframe.height, 10) || 0;
        this.backgroundColor = this.styles.backgroundColor;
        this.parseTreeFn = parseTreeFn;
        try {
            const contentWindow = iframe.contentWindow;
            const contentDocument = contentWindow?.document;
            if (contentWindow && contentDocument && contentDocument.documentElement && this.parseTreeFn) {
                this.tree = this.parseTreeFn(context, contentDocument.documentElement);

                // http://www.w3.org/TR/css3-background/#special-backgrounds
                const documentBackgroundColor = parseColor(
                    context,
                    contentWindow.getComputedStyle(contentDocument.documentElement).backgroundColor as string
                );
                const bodyBackgroundColor = contentDocument.body
                    ? parseColor(
                          context,
                          contentWindow.getComputedStyle(contentDocument.body).backgroundColor as string
                      )
                    : TRANSPARENT_COLOR;

                this.backgroundColor = isTransparent(documentBackgroundColor)
                    ? isTransparent(bodyBackgroundColor)
                        ? this.styles.backgroundColor
                        : bodyBackgroundColor
                    : documentBackgroundColor;
            }
        } catch (e) {
            // Cross-origin frames (and same-origin access failures) cannot be
            // parsed; capture continues with the iframe's painted box only.
            // Report instead of failing silently — a blank region is otherwise
            // indistinguishable from a genuinely empty frame.
            const error = e instanceof Error ? e : new Error(String(e));
            this.context.logger.warn(
                `Unable to render iframe content${this.src ? ` from ${this.src}` : ''}: ${error.message}`
            );
            this.context.onError?.(error);
        }
    }
}
