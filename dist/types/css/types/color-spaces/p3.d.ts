/**
 * Display-P3 related functions
 */
/**
 * Convert P3 Linear to xyz
 *
 * @param p3l
 */
export declare const p3LinearToXyz: (p3l: [number, number, number]) => [number, number, number];
/**
 * Convert XYZ to P3 Linear
 *
 * @param xyz
 */
export declare const xyzToP3Linear: (xyz: [number, number, number]) => [number, number, number];
/**
 * Convert P3 to P3 linear
 *
 * @param p3
 */
export declare const p32p3Linear: (p3: [number, number, number]) => number[];
/**
 * Convert P3 Linear to P3
 *
 * @param p3l
 */
export declare const p3Linear2p3: (p3l: [number, number, number]) => number[];
/**
 * Convert P3 to XYZ
 *
 * @param args
 */
export declare const p3ToXYZ: (args: number[]) => number[];
/**
 * Convert XYZ to P3
 *
 * @param args
 */
export declare const p3FromXYZ: (args: [number, number, number, number]) => [number, number, number, number];
/**
 * Convert P3 to SRGB and Pack
 *
 * @param args
 */
export declare const convertP3: (args: number[]) => number;
