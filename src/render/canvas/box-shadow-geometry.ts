import { BezierCurve, isBezierCurve } from '../bezier-curve';
import { Path } from '../path';
import { Vector } from '../vector';

// CSS Backgrounds 3, 6.1.1: growing a small corner needs the cubic adjustment
// to approach a square continuously as the original radius approaches zero.
export const shadowRadius = (radius: number, spread: number): number => {
    const delta = spread > radius ? spread * (1 + Math.pow(radius / spread - 1, 3)) : spread;
    return Math.max(0, radius + delta);
};

// Input is the four clockwise border/padding corner segments from BoundCurves.
// Translation alone preserves the old radii and turns a spread circle into a
// rounded square. Resize each quarter ellipse around its box corner instead.
export const spreadShadowPath = (paths: Path[], spread: number): Path[] => {
    if (spread === 0) return paths;
    const corners = paths.map((point, index) => {
        if (!isBezierCurve(point)) return { x: point.x, y: point.y, rx: 0, ry: 0 };
        return {
            x: index % 2 === 0 ? point.start.x : point.end.x,
            y: index % 2 === 0 ? point.end.y : point.start.y,
            rx: Math.abs(point.end.x - point.start.x),
            ry: Math.abs(point.end.y - point.start.y)
        };
    });
    const width = corners[1].x - corners[0].x + 2 * spread;
    const height = corners[3].y - corners[0].y + 2 * spread;
    if (width <= 0 || height <= 0) return [];
    const radii = corners.map((c) => ({ x: shadowRadius(c.rx, spread), y: shadowRadius(c.ry, spread) }));
    const ratio = (size: number, sum: number): number => (sum > 0 ? size / sum : 1);
    const factor = Math.min(
        1,
        ratio(width, radii[0].x + radii[1].x),
        ratio(width, radii[3].x + radii[2].x),
        ratio(height, radii[0].y + radii[3].y),
        ratio(height, radii[1].y + radii[2].y)
    );
    return paths.map((point, index) => {
        const corner = corners[index];
        const x = corner.x + (index === 1 || index === 2 ? spread : -spread);
        const y = corner.y + (index >= 2 ? spread : -spread);
        if (!isBezierCurve(point)) return new Vector(x, y);
        const rx = radii[index].x * factor;
        const ry = radii[index].y * factor;
        if (!rx || !ry) return new Vector(x, y);
        const sx = rx / corner.rx;
        const sy = ry / corner.ry;
        const resize = (v: Vector): Vector => new Vector(x + (v.x - corner.x) * sx, y + (v.y - corner.y) * sy);
        return new BezierCurve(
            resize(point.start),
            resize(point.startControl),
            resize(point.endControl),
            resize(point.end)
        );
    });
};
