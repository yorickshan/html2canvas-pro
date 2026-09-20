import { Bounds } from '../../css/layout/bounds';

export interface ShadowTransform {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}

export interface ShadowSpace {
    matrix: ShadowTransform;
    viewport: Bounds;
    scale: number;
    uniform: boolean;
}

// Map the output bitmap back into the current user space. Capture x/y are not
// in this space once CSS transforms (including ancestor transforms) are active.
// An AABB of all four inverse-transformed corners is conservative under rotation.
export const shadowSpace = (matrix: ShadowTransform, width: number, height: number): ShadowSpace | null => {
    const { a, b, c, d, e, f } = matrix;
    if (![a, b, c, d, e, f, width, height].every(Number.isFinite)) return null;
    const determinant = a * d - b * c;
    if (!Number.isFinite(determinant) || determinant === 0) return null;
    const inversePoint = (x: number, y: number) => ({
        x: (d * (x - e) - c * (y - f)) / determinant,
        y: (-b * (x - e) + a * (y - f)) / determinant
    });
    const corners = [inversePoint(0, 0), inversePoint(width, 0), inversePoint(width, height), inversePoint(0, height)];
    if (!corners.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) return null;
    const left = Math.min(...corners.map((point) => point.x));
    const top = Math.min(...corners.map((point) => point.y));
    const right = Math.max(...corners.map((point) => point.x));
    const bottom = Math.max(...corners.map((point) => point.y));
    // Largest singular value: enough local raster resolution for either output
    // axis. A scalar Canvas shadow blur is exact only for similarity transforms.
    const xx = a * a + b * b;
    const yy = c * c + d * d;
    const xy = a * c + b * d;
    const scale = Math.sqrt((xx + yy + Math.hypot(xx - yy, 2 * xy)) / 2);
    if (!Number.isFinite(scale) || scale <= 0) return null;
    const tolerance = 1e-10 * Math.max(xx, yy);
    return {
        matrix,
        viewport: new Bounds(left, top, right - left, bottom - top),
        scale,
        uniform: Math.abs(xx - yy) <= tolerance && Math.abs(xy) <= tolerance
    };
};
