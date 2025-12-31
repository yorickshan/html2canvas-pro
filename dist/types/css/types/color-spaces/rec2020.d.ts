/**
 * REC2020 related functions
 */
/**
 * Convert rec2020 to rec2020 linear
 *
 * @param rgb
 */
export declare const rec20202rec2020Linear: (rgb: [number, number, number]) => number[];
/**
 * Convert rec2020 linear to rec2020
 *
 * @param rgb
 */
export declare const rec2020Linear2rec2020: (rgb: [number, number, number]) => number[];
/**
 * Convert rec2020 linear to XYZ D65
 *
 * @param rec
 */
export declare const rec2020LinearToXyz: (rec: [number, number, number]) => [number, number, number];
/**
 * Convert XYZ D65 to rec2020 linear
 *
 * @param xyz
 */
export declare const xyzToRec2020Linear: (xyz: [number, number, number]) => [number, number, number];
/**
 * Convert Rec2020 to XYZ
 *
 * @param args
 */
export declare const rec2020ToXYZ: (args: number[]) => [number, number, number];
/**
 * Convert XYZ to Rec2020
 *
 * @param args
 */
export declare const rec2020FromXYZ: (args: [number, number, number, number]) => [number, number, number, number];
/**
 * Convert Rec2020 to SRGB and Pack
 *
 * @param args
 */
export declare const convertRec2020: (args: number[]) => number;
