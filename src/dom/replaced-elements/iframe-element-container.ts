import { ElementContainer } from '../element-container';
import { Color, parseColor, COLORS } from '../../css/types/color';
import { isTransparent } from '../../css/types/color-utilities';
import { Context } from '../../core/context';

// Parser function type to break circular dependency
type ParseTreeFunction = (context: Context, node: Node) => ElementContainer;

export class IFrameElementContainer extends ElementContainer {
    src: string;
    width: number;
    height: number;
    tree?: ElementContainer;
    backgroundColor: Color;
    private parseTreeFn?: ParseTreeFunction;

    constructor(context: Context, iframe: HTMLIFrameElement, parseTreeFn?: ParseTreeFunction) {
        super(context, iframe);
        this.src = iframe.src;
        this.width = parseInt(iframe.width, 10) || 0;
        this.height = parseInt(iframe.height, 10) || 0;
        this.backgroundColor = this.styles.backgroundColor;
        this.parseTreeFn = parseTreeFn;
        try {
            if (
                iframe.contentWindow &&
                iframe.contentWindow.document &&
                iframe.contentWindow.document.documentElement &&
                this.parseTreeFn
            ) {
                this.tree = this.parseTreeFn(context, iframe.contentWindow.document.documentElement);

                // http://www.w3.org/TR/css3-background/#special-backgrounds
                const documentBackgroundColor = iframe.contentWindow.document.documentElement
                    ? parseColor(
                          context,
                          getComputedStyle(iframe.contentWindow.document.documentElement).backgroundColor as string
                      )
                    : COLORS.TRANSPARENT;
                const bodyBackgroundColor = iframe.contentWindow.document.body
                    ? parseColor(
                          context,
                          getComputedStyle(iframe.contentWindow.document.body).backgroundColor as string
                      )
                    : COLORS.TRANSPARENT;

                this.backgroundColor = isTransparent(documentBackgroundColor)
                    ? isTransparent(bodyBackgroundColor)
                        ? this.styles.backgroundColor
                        : bodyBackgroundColor
                    : documentBackgroundColor;
            }
        } catch (e) {}
    }
}
