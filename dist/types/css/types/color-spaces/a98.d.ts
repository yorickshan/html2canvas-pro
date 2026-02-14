/**
 * A98-RGB related functions
 */
/**
 * Convert XYZ to a98 linear
 *
 * @param xyz
 */
export declare const xyz2a98Linear: (xyz: [number, number, number]) => [number, number, number];
/**
 * Convert XYZ to a98 linear
 *
 * @param a98
 */
export declare const a98Linear2xyz: (a98: [number, number, number]) => [number, number, number];
/**
 * Convert A98 RGB to rgb linear
 *
 * @param rgb
 */
export declare const a982a98Linear: (rgb: [number, number, number]) => [number, number, number];
/**
 * Convert A98 RGB Linear to A98
 *
 * @param rgb
 */
export declare const a98Linear2a98: (rgb: [number, number, number]) => [number, number, number];
/**
 * Convert XYZ to A98
 *
 * @param args
 */
export declare const a98FromXYZ: (args: [number, number, number, number]) => [number, number, number, number];
/**
 * Convert A98 to XYZ and Pack
 *
 * @param args
 */
export declare const convertA98rgb: (args: number[]) => number;
