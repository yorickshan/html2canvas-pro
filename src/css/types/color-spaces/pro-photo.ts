/**
 * Pro Photo related functions
 */

import {d50toD65, d65toD50, multiplyMatrices, packXYZ} from '../color-utilities';

/**
 * Convert linear-light display-p3 to XYZ D65
 *
 * @param p3
 */
export const proPhotoLinearToXyz = (p3: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        // eslint-disable-next-line prettier/prettier
        [
            0.7977666449006423, 0.13518129740053308, 0.0313477341283922, 0.2880748288194013, 0.711835234241873,
            0.00008993693872564, 0.0, 0.0, 0.8251046025104602
        ],
        p3
    );
};

/**
 * Convert XYZ D65 to linear-light display-p3
 *
 * @param xyz
 */
export const xyzToProPhotoLinear = (xyz: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        // eslint-disable-next-line prettier/prettier
        [
            1.3457868816471583, -0.25557208737979464, -0.05110186497554526, -0.5446307051249019, 1.5082477428451468,
            0.02052744743642139, 0.0, 0.0, 1.2119675456389452
        ],
        xyz
    );
};

/**
 * Convert Pro-Photo to Pro-Photo Linear
 *
 * @param p3
 */
export const proPhotoToProPhotoLinear = (p3: [number, number, number]): number[] => {
    return p3.map((c: number) => {
        return c < 16 / 512 ? c / 16 : c ** 1.8;
    });
};

/**
 * Convert Pro-Photo Linear to Pro-Photo
 *
 * @param p3
 */
export const proPhotoLinearToProPhoto = (p3: [number, number, number]): number[] => {
    return p3.map((c: number) => {
        return c > 1 / 512 ? c ** (1 / 1.8) : c * 16;
    });
};

/**
 * Convert Pro-Photo to XYZ
 *
 * @param args
 */
export const proPhotoToXYZ = (args: number[]): [number, number, number] => {
    const prophoto_linear = proPhotoToProPhotoLinear([args[0], args[1], args[2]]);
    return d50toD65(proPhotoLinearToXyz([prophoto_linear[0], prophoto_linear[1], prophoto_linear[2]]));
};

/**
 * Convert XYZ to Pro-Photo
 *
 * @param args
 */
export const proPhotoFromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [r, g, b] = proPhotoLinearToProPhoto(xyzToProPhotoLinear(d65toD50([args[0], args[1], args[2]])));
    return [r, g, b, args[3]];
};

/**
 * Convert Pro-Photo to XYZ and Pack
 *
 * @param args
 */
export const convertProPhoto = (args: number[]): number => {
    const xyz = proPhotoToXYZ([args[0], args[1], args[2]]);
    return packXYZ([xyz[0], xyz[1], xyz[2], args[3]]);
};
