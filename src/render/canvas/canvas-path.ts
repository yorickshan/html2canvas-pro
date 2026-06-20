import { isBezierCurve } from '../bezier-curve';
import { Path } from '../path';
import { Vector } from '../vector';

export const formatCanvasPath = (ctx: CanvasRenderingContext2D, paths: Path[]): void => {
    paths.forEach((point, index) => {
        const start: Vector = isBezierCurve(point) ? point.start : point;
        if (index === 0) {
            ctx.moveTo(start.x, start.y);
        } else {
            ctx.lineTo(start.x, start.y);
        }

        if (isBezierCurve(point)) {
            ctx.bezierCurveTo(
                point.startControl.x,
                point.startControl.y,
                point.endControl.x,
                point.endControl.y,
                point.end.x,
                point.end.y
            );
        }
    });
};

export const createCanvasPath = (ctx: CanvasRenderingContext2D, paths: Path[]): void => {
    ctx.beginPath();
    formatCanvasPath(ctx, paths);
    ctx.closePath();
};
