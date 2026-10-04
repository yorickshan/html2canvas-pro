import { RenderConfigurations } from './canvas-renderer';
import { createForeignObjectSVG, loadSerializedSVG } from '../../core/features';
import { asString } from '../../css/types/color-utilities';
import { Context } from '../../core/context';

export class ForeignObjectRenderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    options: RenderConfigurations;
    private readonly context: Context;

    constructor(context: Context, options: RenderConfigurations) {
        this.context = context;
        this.options = options;
        this.canvas = options.canvas ? options.canvas : context.resourceDocument.createElement('canvas');
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D rendering context from canvas');
        }
        this.ctx = ctx;
        this.canvas.width = Math.floor(options.width * options.scale);
        this.canvas.height = Math.floor(options.height * options.scale);
        this.canvas.style.width = `${options.width}px`;
        this.canvas.style.height = `${options.height}px`;

        this.ctx.scale(this.options.scale, this.options.scale);
        this.ctx.translate(-options.x, -options.y);
        this.context.logger.debug(
            `EXPERIMENTAL ForeignObject renderer initialized (${options.width}x${options.height} at ${options.x},${options.y}) with scale ${options.scale}`
        );
    }

    async render(element: HTMLElement): Promise<HTMLCanvasElement> {
        if (this.options.signal?.aborted) {
            throw new DOMException('The operation was aborted.', 'AbortError');
        }

        // The clone carries the source page's margins and positional offsets,
        // but inside the SVG it is the root: the capture rect already includes
        // those offsets, so the element must paint from the foreignObject's
        // origin or the offset would be applied a second time. Stripped only
        // for serialization (the SVG string is fixed synchronously).
        const restoreRootOffsets = stripRootOffsets(element);
        // The SVG is declared at CSS-pixel size so the foreignObject lays out
        // its content at CSS scale; drawImage below rasterizes it at device
        // resolution under the scaled context.
        const svg = createForeignObjectSVG(this.options.width, this.options.height, 0, 0, element);
        // loadSerializedSVG serializes synchronously (Promise executor), so the
        // stripped inline styles are captured before the restore runs.
        const imagePromise = loadSerializedSVG(svg);
        restoreRootOffsets();

        const img = await imagePromise;

        if (this.options.signal?.aborted) {
            throw new DOMException('The operation was aborted.', 'AbortError');
        }

        if (this.options.backgroundColor) {
            // The context translates by (-x, -y), so anchor both fills and the
            // image at (x, y) — mirroring CanvasRenderer.render — or offsets
            // would be applied twice and the background would miss the canvas.
            this.ctx.fillStyle = asString(this.options.backgroundColor);
            this.ctx.fillRect(this.options.x, this.options.y, this.options.width, this.options.height);
        }

        this.ctx.drawImage(img, this.options.x, this.options.y, this.options.width, this.options.height);

        return this.canvas;
    }
}

/**
 * Temporarily neutralize the root element's layout offsets for SVG
 * serialization. `top/right/bottom/left` reset to `auto` (inset values of
 * positioned elements are baked into the capture rect); margins to `0`.
 */
const ROOT_OFFSET_PROPERTIES = [
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
    'top',
    'right',
    'bottom',
    'left'
] as const;

const stripRootOffsets = (element: HTMLElement): (() => void) => {
    const style = element.style;
    const previous = ROOT_OFFSET_PROPERTIES.map((property) => [property, style[property]] as const);
    for (const property of ROOT_OFFSET_PROPERTIES) {
        style[property] = property.startsWith('margin') ? '0px' : 'auto';
    }
    return () => {
        for (const [property, value] of previous) {
            style[property] = value;
        }
    };
};
