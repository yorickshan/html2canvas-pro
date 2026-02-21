/**
 * Color mathematics utilities
 * Extracted to break circular dependency between srgb.ts and color-utilities.ts
 */

/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

/**
 * Multiply two 3x3 matrices
 */
export const multiplyMatrices = (A: number[], B: number[]): [number, number, number] => {
    return [
        A[0] * B[0] + A[1] * B[1] + A[2] * B[2],
        A[3] * B[0] + A[4] * B[1] + A[5] * B[2],
        A[6] * B[0] + A[7] * B[1] + A[8] * B[2]
    ];
};
