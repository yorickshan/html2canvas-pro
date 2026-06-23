import { ElementPaint } from '../stacking-context';
import { asString } from '../../css/types/color-utilities';
import { ImageElementContainer } from '../../dom/replaced-elements/image-element-container';
import { CanvasElementContainer } from '../../dom/replaced-elements/canvas-element-container';
import { SVGElementContainer } from '../../dom/replaced-elements/svg-element-container';
import { IFrameElementContainer } from '../../dom/replaced-elements/iframe-element-container';
import { ReplacedElementContainer } from '../../dom/replaced-elements';
import {
    InputElementContainer,
    CHECKBOX,
    RADIO,
    INPUT_COLOR,
    PLACEHOLDER_COLOR
} from '../../dom/replaced-elements/input-element-container';
import { TextareaElementContainer } from '../../dom/elements/textarea-element-container';
import { SelectElementContainer } from '../../dom/elements/select-element-container';
import { ElementContainer } from '../../dom/element-container';
import { Bounds } from '../../css/layout/bounds';
import { BoundCurves } from '../bound-curves';
import { TextBounds } from '../../css/layout/text';
import { Vector } from '../vector';
import { contentBox } from '../box-sizing';
import { Context } from '../../core/context';
import { TextRenderer } from './text-renderer';
import { FontMetrics } from '../font-metrics';
import { IMAGE_RENDERING } from '../../css/property-descriptors/image-rendering';
import { TEXT_ALIGN } from '../../css/property-descriptors/text-align';
import { DISPLAY } from '../../css/property-descriptors/display';
import { LIST_STYLE_TYPE } from '../../css/property-descriptors/list-style-type';
import { CSSImageType, CSSURLImage } from '../../css/types/image';
import { getAbsoluteValue } from '../../css/types/length-percentage';
import { computeLineHeight } from '../../css/property-descriptors/line-height';
import { contains } from '../../core/bitwise';
import { CanvasRenderer, RenderConfigurations } from './canvas-renderer';
import { CSSParsedDeclaration } from '../../css/index';

/**
 * Render replaced elements: Image, Canvas, SVG, IFrame.
 */
export async function renderReplacedElements(
    ctx: CanvasRenderingContext2D,
    context: Context,
    options: RenderConfigurations,
    container: ElementContainer,
    curves: BoundCurves,
    styles: CSSParsedDeclaration,
    renderReplacedElementFn: (
        container: ReplacedElementContainer,
        curves: BoundCurves,
        image: HTMLImageElement | HTMLCanvasElement
    ) => void
): Promise<void> {
    if (container instanceof ImageElementContainer) {
        try {
            const image = await context.cache.match(container.src);

            const prevSmoothing = ctx.imageSmoothingEnabled;
            if (
                styles.imageRendering === IMAGE_RENDERING.PIXELATED ||
                styles.imageRendering === IMAGE_RENDERING.CRISP_EDGES
            ) {
                ctx.imageSmoothingEnabled = false;
            } else if (styles.imageRendering === IMAGE_RENDERING.SMOOTH) {
                ctx.imageSmoothingEnabled = true;
            }

            renderReplacedElementFn(container, curves, image!);
            ctx.imageSmoothingEnabled = prevSmoothing;
        } catch (e) {
            context.logger.error(`Error loading image ${container.src}`);
        }
    }

    if (container instanceof CanvasElementContainer) {
        renderReplacedElementFn(container, curves, container.canvas);
    }

    if (container instanceof SVGElementContainer) {
        try {
            const image = await context.cache.match(container.svg);
            renderReplacedElementFn(container, curves, image!);
        } catch (e) {
            context.logger.error(`Error loading svg ${container.svg.substring(0, 255)}`);
        }
    }

    if (container instanceof IFrameElementContainer && container.tree) {
        const iframeRenderer = new CanvasRenderer(context, {
            scale: options.scale,
            backgroundColor: container.backgroundColor,
            x: 0,
            y: 0,
            width: container.width,
            height: container.height
        });

        const canvas = await iframeRenderer.render(container.tree);
        if (container.width && container.height) {
            ctx.drawImage(
                canvas,
                0,
                0,
                container.width,
                container.height,
                container.bounds.left,
                container.bounds.top,
                container.bounds.width,
                container.bounds.height
            );
        }
    }
}

/**
 * Render form element content: checkbox, radio, text input.
 */
export function renderFormElements(
    ctx: CanvasRenderingContext2D,
    fontMetrics: FontMetrics,
    textRenderer: TextRenderer,
    pathFn: (paths: Vector[]) => void,
    container: ElementContainer,
    styles: CSSParsedDeclaration
): void {
    if (container instanceof InputElementContainer) {
        const size = Math.min(container.bounds.width, container.bounds.height);

        if (container.type === CHECKBOX && container.checked) {
            ctx.save();
            pathFn([
                new Vector(container.bounds.left + size * 0.39363, container.bounds.top + size * 0.79),
                new Vector(container.bounds.left + size * 0.16, container.bounds.top + size * 0.5549),
                new Vector(container.bounds.left + size * 0.27347, container.bounds.top + size * 0.44071),
                new Vector(container.bounds.left + size * 0.39694, container.bounds.top + size * 0.5649),
                new Vector(container.bounds.left + size * 0.72983, container.bounds.top + size * 0.23),
                new Vector(container.bounds.left + size * 0.84, container.bounds.top + size * 0.34085),
                new Vector(container.bounds.left + size * 0.39363, container.bounds.top + size * 0.79)
            ]);
            ctx.fillStyle = asString(INPUT_COLOR);
            ctx.fill();
            ctx.restore();
        } else if (container.type === RADIO && container.checked) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(container.bounds.left + size / 2, container.bounds.top + size / 2, size / 4, 0, Math.PI * 2, true);
            ctx.fillStyle = asString(INPUT_COLOR);
            ctx.fill();
            ctx.restore();
        }
    }

    if (isTextInputElement(container) && container.value.length) {
        const [font, fontFamily, fontSize] = textRenderer.createFontStyle(styles);
        const { baseline } = fontMetrics.getMetrics(fontFamily, fontSize);

        ctx.font = font;
        const isPlaceholder = container instanceof InputElementContainer && container.isPlaceholder;
        ctx.fillStyle = isPlaceholder ? asString(PLACEHOLDER_COLOR) : asString(styles.color);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = canvasTextAlign(container.styles.textAlign);

        const bounds = contentBox(container);
        let x = 0;
        switch (container.styles.textAlign) {
            case TEXT_ALIGN.CENTER:
                x += bounds.width / 2;
                break;
            case TEXT_ALIGN.RIGHT:
                x += bounds.width;
                break;
        }

        let verticalOffset = 0;
        if (container instanceof InputElementContainer) {
            const fontSizeValue = getAbsoluteValue(styles.fontSize, 0);
            verticalOffset = (bounds.height - fontSizeValue) / 2;
        }

        const textBounds = bounds.add(x, verticalOffset, 0, 0);

        ctx.save();
        pathFn([
            new Vector(bounds.left, bounds.top),
            new Vector(bounds.left + bounds.width, bounds.top),
            new Vector(bounds.left + bounds.width, bounds.top + bounds.height),
            new Vector(bounds.left, bounds.top + bounds.height)
        ]);
        ctx.clip();

        textRenderer.renderTextWithLetterSpacing(
            new TextBounds(container.value, textBounds),
            styles.letterSpacing,
            baseline,
            styles.writingMode
        );
        ctx.restore();
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
    }
}

/**
 * Render list-item marker (image or text).
 */
export async function renderListMarker(
    ctx: CanvasRenderingContext2D,
    context: Context,
    textRenderer: TextRenderer,
    paint: ElementPaint,
    container: ElementContainer,
    styles: CSSParsedDeclaration
): Promise<void> {
    if (!contains(container.styles.display, DISPLAY.LIST_ITEM)) {
        return;
    }

    if (container.styles.listStyleImage !== null) {
        const img = container.styles.listStyleImage;
        if (img.type === CSSImageType.URL) {
            const url = (img as CSSURLImage).url;
            try {
                const image = await context.cache.match(url);
                ctx.drawImage(image!, container.bounds.left - (image!.width + 10), container.bounds.top);
            } catch (e) {
                context.logger.error(`Error loading list-style-image ${url}`);
            }
        }
    } else if (paint.listValue && container.styles.listStyleType !== LIST_STYLE_TYPE.NONE) {
        const [font] = textRenderer.createFontStyle(styles);
        ctx.font = font;
        ctx.fillStyle = asString(styles.color);
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';

        const bounds = new Bounds(
            container.bounds.left,
            container.bounds.top + getAbsoluteValue(container.styles.paddingTop, container.bounds.width),
            container.bounds.width,
            computeLineHeight(styles.lineHeight, styles.fontSize.number) / 2 + 1
        );

        textRenderer.renderTextWithLetterSpacing(
            new TextBounds(paint.listValue, bounds),
            styles.letterSpacing,
            computeLineHeight(styles.lineHeight, styles.fontSize.number) / 2 + 2,
            styles.writingMode
        );
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'left';
    }
}

/**
 * Type guard for text input containers.
 */
const isTextInputElement = (
    container: ElementContainer
): container is InputElementContainer | TextareaElementContainer | SelectElementContainer => {
    if (container instanceof TextareaElementContainer) {
        return true;
    } else if (container instanceof SelectElementContainer) {
        return true;
    } else if (container instanceof InputElementContainer && container.type !== RADIO && container.type !== CHECKBOX) {
        return true;
    }
    return false;
};

/**
 * Map CSS text-align to Canvas textAlign.
 */
const canvasTextAlign = (textAlign: TEXT_ALIGN): CanvasTextAlign => {
    switch (textAlign) {
        case TEXT_ALIGN.CENTER:
            return 'center';
        case TEXT_ALIGN.RIGHT:
            return 'right';
        case TEXT_ALIGN.LEFT:
        default:
            return 'left';
    }
};
