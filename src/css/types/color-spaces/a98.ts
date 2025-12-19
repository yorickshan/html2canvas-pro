/**
 * A98-RGB related functions
 */

import { multiplyMatrices, packSrgbLinear } from '../color-utilities';
import { xyz2rgbLinear } from './srgb';

/**
 * Convert XYZ to a98 linear
 *
 * @param xyz
 */
export const xyz2a98Linear = (xyz: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        [
            2.0415879038107465, -0.5650069742788596, -0.34473135077832956, -0.9692436362808795, 1.8759675015077202,
            0.04155505740717557, 0.013444280632031142, -0.11836239223101838, 1.0151749943912054
        ],
        xyz
    );
};

/**
 * Convert XYZ to a98 linear
 *
 * @param a98
 */
export const a98Linear2xyz = (a98: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        [
            0.5766690429101305, 0.1855582379065463, 0.1882286462349947, 0.29734497525053605, 0.6273635662554661,
            0.0752914584939978, 0.02703136138641234, 0.07068885253582723, 0.9913375368376388
        ],
        a98
    );
};

/**
 * Convert A98 RGB to rgb linear
 *
 * @param rgb
 */
export const a982a98Linear = (rgb: [number, number, number]): [number, number, number] => {
    const mapped = rgb.map((c: number) => {
        const sign = c < 0 ? -1 : 1,
            abs = Math.abs(c);
        return sign * abs ** (563 / 256);
    });

    return [mapped[0], mapped[1], mapped[2]];
};

/**
 * Convert A98 RGB Linear to A98
 *
 * @param rgb
 */
export const a98Linear2a98 = (rgb: [number, number, number]): [number, number, number] => {
    const mapped = rgb.map((c: number) => {
        const sign = c < 0 ? -1 : 1,
            abs = Math.abs(c);
        return sign * abs ** (256 / 563);
    });

    return [mapped[0], mapped[1], mapped[2]];
};

/**
 * Convert XYZ to A98
 *
 * @param args
 */
export const a98FromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [r, g, b] = a98Linear2a98(xyz2a98Linear([args[0], args[1], args[2]]));
    return [r, g, b, args[3]];
};

/**
 * Convert A98 to XYZ and Pack
 *
 * @param args
 */
export const convertA98rgb = (args: number[]): number => {
    const srgb_linear = xyz2rgbLinear(a98Linear2xyz(a982a98Linear([args[0], args[1], args[2]])));
    return packSrgbLinear([srgb_linear[0], srgb_linear[1], srgb_linear[2], args[3]]);
};
