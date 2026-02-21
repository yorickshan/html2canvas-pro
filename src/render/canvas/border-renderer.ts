/**
 * Border Renderer
 *
 * Handles rendering of element borders including:
 * - Solid borders
 * - Double borders
 * - Dashed borders
 * - Dotted borders
 */

import { Color } from '../../css/types/color';
import { asString } from '../../css/types/color-utilities';
import { BoundCurves } from '../bound-curves';
import { BORDER_STYLE } from '../../css/property-descriptors/border-style';
import {
    parsePathForBorder,
    parsePathForBorderDoubleInner,
    parsePathForBorderDoubleOuter,
    parsePathForBorderStroke
} from '../border';
import { isBezierCurve, BezierCurve } from '../bezier-curve';
import { Vector } from '../vector';
import { Path } from '../path';

/**
 * Dependencies required for BorderRenderer
 */
export interface BorderRendererDependencies {
    ctx: CanvasRenderingContext2D;
}

/**
 * Path creation callbacks
 * The main CanvasRenderer retains path() and formatPath() methods,
 * so we inject them as callbacks to avoid duplication
 */
export interface PathCallbacks {
    path(paths: Path[]): void;
    formatPath(paths: Path[]): void;
}

/**
 * Border Renderer
 *
 * Specialized renderer for element borders.
 * Extracted from CanvasRenderer to improve code organization and maintainability.
 */
export class BorderRenderer {
    private readonly ctx: CanvasRenderingContext2D;
    private pathCallbacks: PathCallbacks;

    constructor(deps: BorderRendererDependencies, pathCallbacks: PathCallbacks) {
        this.ctx = deps.ctx;
        this.pathCallbacks = pathCallbacks;
    }

    /**
     * Render a solid border
     *
     * @param color - Border color
     * @param side - Border side (0=top, 1=right, 2=bottom, 3=left)
     * @param curvePoints - Border curve points
     */
    async renderSolidBorder(color: Color, side: number, curvePoints: BoundCurves): Promise<void> {
        this.pathCallbacks.path(parsePathForBorder(curvePoints, side));
        this.ctx.fillStyle = asString(color);
        this.ctx.fill();
    }

    /**
     * Render a double border
     * Falls back to solid border if width is too small
     *
     * @param color - Border color
     * @param width - Border width
     * @param side - Border side (0=top, 1=right, 2=bottom, 3=left)
     * @param curvePoints - Border curve points
     */
    async renderDoubleBorder(color: Color, width: number, side: number, curvePoints: BoundCurves): Promise<void> {
        if (width < 3) {
            await this.renderSolidBorder(color, side, curvePoints);
            return;
        }

        const outerPaths = parsePathForBorderDoubleOuter(curvePoints, side);
        this.pathCallbacks.path(outerPaths);
        this.ctx.fillStyle = asString(color);
        this.ctx.fill();
        const innerPaths = parsePathForBorderDoubleInner(curvePoints, side);
        this.pathCallbacks.path(innerPaths);
        this.ctx.fill();
    }

    /**
     * Render a dashed or dotted border
     *
     * @param color - Border color
     * @param width - Border width
     * @param side - Border side (0=top, 1=right, 2=bottom, 3=left)
     * @param curvePoints - Border curve points
     * @param style - Border style (DASHED or DOTTED)
     */
    async renderDashedDottedBorder(
        color: Color,
        width: number,
        side: number,
        curvePoints: BoundCurves,
        style: BORDER_STYLE
    ): Promise<void> {
        this.ctx.save();

        const strokePaths = parsePathForBorderStroke(curvePoints, side);
        const boxPaths = parsePathForBorder(curvePoints, side);

        if (style === BORDER_STYLE.DASHED) {
            this.pathCallbacks.path(boxPaths);
            this.ctx.clip();
        }

        // Extract start and end coordinates
        let startX, startY, endX, endY;
        if (isBezierCurve(boxPaths[0])) {
            startX = (boxPaths[0] as BezierCurve).start.x;
            startY = (boxPaths[0] as BezierCurve).start.y;
        } else {
            startX = (boxPaths[0] as Vector).x;
            startY = (boxPaths[0] as Vector).y;
        }
        if (isBezierCurve(boxPaths[1])) {
            endX = (boxPaths[1] as BezierCurve).end.x;
            endY = (boxPaths[1] as BezierCurve).end.y;
        } else {
            endX = (boxPaths[1] as Vector).x;
            endY = (boxPaths[1] as Vector).y;
        }

        // Calculate border length
        let length;
        if (side === 0 || side === 2) {
            length = Math.abs(startX - endX);
        } else {
            length = Math.abs(startY - endY);
        }

        this.ctx.beginPath();
        if (style === BORDER_STYLE.DOTTED) {
            this.pathCallbacks.formatPath(strokePaths);
        } else {
            this.pathCallbacks.formatPath(boxPaths.slice(0, 2));
        }

        // Calculate dash and space lengths
        let dashLength = width < 3 ? width * 3 : width * 2;
        let spaceLength = width < 3 ? width * 2 : width;
        if (style === BORDER_STYLE.DOTTED) {
            dashLength = width;
            spaceLength = width;
        }

        // Adjust dash pattern for border length
        let useLineDash = true;
        if (length <= dashLength * 2) {
            useLineDash = false;
        } else if (length <= dashLength * 2 + spaceLength) {
            const multiplier = length / (2 * dashLength + spaceLength);
            dashLength *= multiplier;
            spaceLength *= multiplier;
        } else {
            const numberOfDashes = Math.floor((length + spaceLength) / (dashLength + spaceLength));
            const minSpace = (length - numberOfDashes * dashLength) / (numberOfDashes - 1);
            const maxSpace = (length - (numberOfDashes + 1) * dashLength) / numberOfDashes;
            spaceLength =
                maxSpace <= 0 || Math.abs(spaceLength - minSpace) < Math.abs(spaceLength - maxSpace)
                    ? minSpace
                    : maxSpace;
        }

        // Apply line dash pattern
        if (useLineDash) {
            if (style === BORDER_STYLE.DOTTED) {
                this.ctx.setLineDash([0, dashLength + spaceLength]);
            } else {
                this.ctx.setLineDash([dashLength, spaceLength]);
            }
        }

        // Set line style and stroke
        if (style === BORDER_STYLE.DOTTED) {
            this.ctx.lineCap = 'round';
            this.ctx.lineWidth = width;
        } else {
            this.ctx.lineWidth = width * 2 + 1.1;
        }
        this.ctx.strokeStyle = asString(color);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Fill dashed round edge gaps
        if (style === BORDER_STYLE.DASHED) {
            if (isBezierCurve(boxPaths[0])) {
                const path1 = boxPaths[3] as BezierCurve;
                const path2 = boxPaths[0] as BezierCurve;
                this.ctx.beginPath();
                this.pathCallbacks.formatPath([
                    new Vector(path1.end.x, path1.end.y),
                    new Vector(path2.start.x, path2.start.y)
                ]);
                this.ctx.stroke();
            }
            if (isBezierCurve(boxPaths[1])) {
                const path1 = boxPaths[1] as BezierCurve;
                const path2 = boxPaths[2] as BezierCurve;
                this.ctx.beginPath();
                this.pathCallbacks.formatPath([
                    new Vector(path1.end.x, path1.end.y),
                    new Vector(path2.start.x, path2.start.y)
                ]);
                this.ctx.stroke();
            }
        }

        this.ctx.restore();
    }
}
