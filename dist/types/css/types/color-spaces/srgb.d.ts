/**
 * SRGB related functions
 */
/**
 * Convert XYZ to linear-light sRGB
 *
 * @param xyz
 */
export declare const xyz2rgbLinear: (xyz: [number, number, number]) => [number, number, number];
/**
 * Convert XYZ to linear-light sRGB
 *
 * @param xyz
 */
export declare const rgbLinear2xyz: (xyz: [number, number, number]) => [number, number, number];
/**
 * Convert sRGB to RGB
 *
 * @param rgb
 */
export declare const srgbLinear2rgb: (rgb: [number, number, number]) => number[];
/**
 * Convert RGB to sRGB
 *
 * @param rgb
 */
export declare const rgb2rgbLinear: (rgb: [number, number, number]) => number[];
/**
 * XYZ to SRGB
 *
 * @param args
 */
export declare const srgbFromXYZ: (args: [number, number, number, number]) => [number, number, number, number];
/**
 * XYZ to SRGB-Linear
 * @param args
 */
export declare const srgbLinearFromXYZ: (args: [number, number, number, number]) => [number, number, number, number];
