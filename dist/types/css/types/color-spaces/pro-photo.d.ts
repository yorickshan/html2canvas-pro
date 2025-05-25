/**
 * Pro Photo related functions
 */
/**
 * Convert linear-light display-p3 to XYZ D65
 *
 * @param p3
 */
export declare const proPhotoLinearToXyz: (p3: [number, number, number]) => [number, number, number];
/**
 * Convert XYZ D65 to linear-light display-p3
 *
 * @param xyz
 */
export declare const xyzToProPhotoLinear: (xyz: [number, number, number]) => [number, number, number];
/**
 * Convert Pro-Photo to Pro-Photo Linear
 *
 * @param p3
 */
export declare const proPhotoToProPhotoLinear: (p3: [number, number, number]) => number[];
/**
 * Convert Pro-Photo Linear to Pro-Photo
 *
 * @param p3
 */
export declare const proPhotoLinearToProPhoto: (p3: [number, number, number]) => number[];
/**
 * Convert Pro-Photo to XYZ
 *
 * @param args
 */
export declare const proPhotoToXYZ: (args: number[]) => [number, number, number];
/**
 * Convert XYZ to Pro-Photo
 *
 * @param args
 */
export declare const proPhotoFromXYZ: (args: [number, number, number, number]) => [number, number, number, number];
/**
 * Convert Pro-Photo to XYZ and Pack
 *
 * @param args
 */
export declare const convertProPhoto: (args: number[]) => number;
