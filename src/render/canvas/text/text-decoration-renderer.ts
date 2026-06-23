/**
 * Text Decoration Renderer
 *
 * Handles rendering of text-decoration lines:
 * - underline, overline, line-through
 * - solid, double, dotted, dashed, wavy styles
 * Extracted from TextRenderer to reduce file size.
 */
import { Bounds } from '../../../css/layout/bounds';
import { CSSParsedDeclaration } from '../../../css';
import { TEXT_DECORATION_LINE } from '../../../css/property-descriptors/text-decoration-line';
import { TEXT_DECORATION_STYLE } from '../../../css/property-descriptors/text-decoration-style';
import { asString } from '../../../css/types/color-utilities';

export class TextDecorationRenderer {
    constructor(private readonly ctx: CanvasRenderingContext2D) {}

    render(bounds: Bounds, styles: CSSParsedDeclaration): void {
        this.ctx.fillStyle = asString(styles.textDecorationColor || styles.color);

        let thickness = 1;
        if (typeof styles.textDecorationThickness === 'number') {
            thickness = styles.textDecorationThickness;
        } else if (styles.textDecorationThickness === 'from-font') {
            thickness = Math.max(1, Math.floor(styles.fontSize.number * 0.05));
        }

        let underlineOffset = 0;
        if (typeof styles.textUnderlineOffset === 'number') {
            underlineOffset = styles.textUnderlineOffset;
        }

        const decorationStyle = styles.textDecorationStyle;

        styles.textDecorationLine.forEach((line) => {
            let y = 0;
            switch (line) {
                case TEXT_DECORATION_LINE.UNDERLINE:
                    y = bounds.top + bounds.height - thickness + underlineOffset;
                    break;
                case TEXT_DECORATION_LINE.OVERLINE:
                    y = bounds.top;
                    break;
                case TEXT_DECORATION_LINE.LINE_THROUGH:
                    y = bounds.top + (bounds.height / 2 - thickness / 2);
                    break;
                default:
                    return;
            }
            this.draw(bounds.left, y, bounds.width, thickness, decorationStyle);
        });
    }

    private draw(x: number, y: number, width: number, thickness: number, style: number): void {
        switch (style) {
            case TEXT_DECORATION_STYLE.SOLID:
                this.ctx.fillRect(x, y, width, thickness);
                break;
            case TEXT_DECORATION_STYLE.DOUBLE: {
                const gap = Math.max(1, thickness);
                this.ctx.fillRect(x, y, width, thickness);
                this.ctx.fillRect(x, y + thickness + gap, width, thickness);
                break;
            }
            case TEXT_DECORATION_STYLE.DOTTED:
                this.drawPattern(x, y, width, thickness, [thickness, thickness * 2]);
                break;
            case TEXT_DECORATION_STYLE.DASHED:
                this.drawPattern(x, y, width, thickness, [thickness * 3, thickness * 2]);
                break;
            case TEXT_DECORATION_STYLE.WAVY:
                this.drawWavy(x, y, width, thickness);
                break;
            default:
                this.ctx.fillRect(x, y, width, thickness);
        }
    }

    private drawPattern(x: number, y: number, width: number, thickness: number, dash: number[]): void {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.setLineDash(dash);
        this.ctx.lineWidth = thickness;
        this.ctx.strokeStyle = this.ctx.fillStyle;
        this.ctx.moveTo(x, y + thickness / 2);
        this.ctx.lineTo(x + width, y + thickness / 2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    private drawWavy(x: number, y: number, width: number, thickness: number): void {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.lineWidth = thickness;
        this.ctx.strokeStyle = this.ctx.fillStyle;

        const amplitude = thickness * 2;
        const wavelength = thickness * 4;
        let currentX = x;
        this.ctx.moveTo(currentX, y + thickness / 2);

        while (currentX < x + width) {
            const nextX = Math.min(currentX + wavelength / 2, x + width);
            this.ctx.quadraticCurveTo(
                currentX + wavelength / 4,
                y + thickness / 2 - amplitude,
                nextX,
                y + thickness / 2
            );
            currentX = nextX;
            if (currentX < x + width) {
                const nextX2 = Math.min(currentX + wavelength / 2, x + width);
                this.ctx.quadraticCurveTo(
                    currentX + wavelength / 4,
                    y + thickness / 2 + amplitude,
                    nextX2,
                    y + thickness / 2
                );
                currentX = nextX2;
            }
        }

        this.ctx.stroke();
        this.ctx.restore();
    }
}
