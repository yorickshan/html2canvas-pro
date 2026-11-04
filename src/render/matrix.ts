/**
 * 2D affine matrix utilities for the composited-surface render path.
 *
 * Matrices use the canvas `transform(a, b, c, d, e, f)` column-vector
 * convention:
 *
 *     | a c e |       | x' |   | a·x + c·y + e |
 *     | b d f |  ×    | y' | = | b·x + d·y + f |
 *     | 0 0 1 |       |  1 |   |       1       |
 *
 * `TransformEffect` carries the same tuple order, so effects and bounds can
 * share these helpers. Composition follows the canvas post-multiply rule:
 * `multiplyMatrix(ancestor, own)` equals `ancestor` followed by `own`.
 */
import { Bounds } from '../css/layout/bounds';
import type { Matrix } from '../css/property-descriptors/transform';

export const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];

export const isIdentityMatrix = (m: Matrix): boolean =>
    m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;

/**
 * Compose two transforms: the result applies `a` first, then `b`
 * (canvas post-multiply, matching successive `ctx.transform` calls).
 */
export const multiplyMatrix = (a: Matrix, b: Matrix): Matrix => [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5]
];

/** Apply a matrix to a point, returning the mapped [x, y]. */
export const applyMatrixToPoint = (m: Matrix, x: number, y: number): [number, number] => [
    m[0] * x + m[2] * y + m[4],
    m[1] * x + m[3] * y + m[5]
];

/**
 * Map a layout-space Bounds through the matrix and return the axis-aligned
 * bounding box of the four transformed corners. Non-uniform scales and
 * rotations grow the box; this is intentionally conservative.
 */
export const transformBoundsToAabb = (m: Matrix, bounds: Bounds): Bounds => {
    const corners = [
        applyMatrixToPoint(m, bounds.left, bounds.top),
        applyMatrixToPoint(m, bounds.left + bounds.width, bounds.top),
        applyMatrixToPoint(m, bounds.left, bounds.top + bounds.height),
        applyMatrixToPoint(m, bounds.left + bounds.width, bounds.top + bounds.height)
    ];
    const left = Math.min(...corners.map((p) => p[0]));
    const right = Math.max(...corners.map((p) => p[0]));
    const top = Math.min(...corners.map((p) => p[1]));
    const bottom = Math.max(...corners.map((p) => p[1]));
    return new Bounds(left, top, right - left, bottom - top);
};

/**
 * Invert an affine matrix. Returns null for singular matrices
 * (zero-scale transforms have no meaningful inverse).
 */
export const invertMatrix = (m: Matrix): Matrix | null => {
    const det = m[0] * m[3] - m[1] * m[2];
    if (!Number.isFinite(det) || det === 0) {
        return null;
    }
    const invDet = 1 / det;
    return [
        m[3] * invDet,
        -m[1] * invDet,
        -m[2] * invDet,
        m[0] * invDet,
        (m[2] * m[5] - m[3] * m[4]) * invDet,
        (m[1] * m[4] - m[0] * m[5]) * invDet
    ];
};

/**
 * Map a visual-space viewport back into the layout space of `m`'s inputs.
 * Used where a crop window (visual coordinates) must select content measured
 * in layout coordinates: the conservative answer is the AABB of the inverse
 * viewport corners.
 */
export const inverseTransformBoundsToAabb = (m: Matrix, bounds: Bounds): Bounds | null => {
    const inverse = invertMatrix(m);
    if (!inverse) {
        return null;
    }
    return transformBoundsToAabb(inverse, bounds);
};
