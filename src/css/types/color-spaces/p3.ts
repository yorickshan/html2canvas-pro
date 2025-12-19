/**
 * Display-P3 related functions
 */

import { srgbLinear2rgb } from './srgb';
import { multiplyMatrices, packXYZ } from '../color-utilities';

/**
 * Convert P3 Linear to xyz
 *
 * @param p3l
 */
export const p3LinearToXyz = (p3l: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        [
            0.4865709486482162, 0.26566769316909306, 0.1982172852343625, 0.2289745640697488, 0.6917385218365064,
            0.079286914093745, 0.0, 0.04511338185890264, 1.043944368900976
        ],
        p3l
    );
};
/**
 * Convert XYZ to P3 Linear
 *
 * @param xyz
 */
export const xyzToP3Linear = (xyz: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        [
            2.493496911941425, -0.9313836179191239, -0.40271078445071684, -0.8294889695615747, 1.7626640603183463,
            0.023624685841943577, 0.03584583024378447, -0.07617238926804182, 0.9568845240076872
        ],
        xyz
    );
};

/**
 * Convert P3 to P3 linear
 *
 * @param p3
 */
export const p32p3Linear = (p3: [number, number, number]): number[] => {
    return p3.map((c: number) => {
        const sign = c < 0 ? -1 : 1,
            abs = c * sign;

        if (abs <= 0.04045) {
            return c / 12.92;
        }

        return sign * ((c + 0.055) / 1.055) ** 2.4 || 0;
    });
};

/**
 * Convert P3 Linear to P3
 *
 * @param p3l
 */
export const p3Linear2p3 = (p3l: [number, number, number]): number[] => {
    return srgbLinear2rgb(p3l);
};

/**
 * Convert P3 to XYZ
 *
 * @param args
 */
export const p3ToXYZ = (args: number[]): number[] => {
    const p3_linear = p32p3Linear([args[0], args[1], args[2]]);
    return p3LinearToXyz([p3_linear[0], p3_linear[1], p3_linear[2]]);
};

/**
 * Convert XYZ to P3
 *
 * @param args
 */
export const p3FromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [r, g, b] = p3Linear2p3(xyzToP3Linear([args[0], args[1], args[2]]));
    return [r, g, b, args[3]];
};

/**
 * Convert P3 to SRGB and Pack
 *
 * @param args
 */
export const convertP3 = (args: number[]): number => {
    const xyz = p3ToXYZ([args[0], args[1], args[2]]);
    return packXYZ([xyz[0], xyz[1], xyz[2], args[3]]);
};
