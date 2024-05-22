/**
 * Pro Photo related functions
 */

import {d50toD65, d65toD50, multiplyMatrices, packXYZ} from '../color-utilities';

/**
 * Convert linear-light display-p3 to XYZ D65
 *
 * @param p3
 */
export const proPhotoLinearToXyz = (p3: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            0.79776664490064230, 0.13518129740053308, 0.03134773412839220,
            // eslint-disable-next-line prettier/prettier
            0.28807482881940130, 0.71183523424187300, 0.00008993693872564,
            // eslint-disable-next-line prettier/prettier
            0.00000000000000000, 0.00000000000000000, 0.82510460251046020
        ],
        p3
    );
};

/**
 * Convert XYZ D65 to linear-light display-p3
 *
 * @param xyz
 */
export const xyzToProPhotoLinear = (xyz: [number, number, number]) => {
    return multiplyMatrices(
        [
            // eslint-disable-next-line prettier/prettier
            1.34578688164715830, -0.25557208737979464, -0.05110186497554526,
            // eslint-disable-next-line prettier/prettier
            -0.54463070512490190, 1.50824774284514680, 0.02052744743642139,
            // eslint-disable-next-line prettier/prettier
            0.00000000000000000, 0.00000000000000000, 1.21196754563894520
        ],
        xyz
    );
};

/**
 * Convert Pro-Photo to Pro-Photo Linear
 *
 * @param p3
 */
export const proPhotoToProPhotoLinear = (p3: [number, number, number]) => {
    return p3.map((c: number) => {
        return c < 16 / 512 ? c / 16 : c ** 1.8;
    });
};

/**
 * Convert Pro-Photo Linear to Pro-Photo
 *
 * @param p3
 */
export const proPhotoLinearToProPhoto = (p3: [number, number, number]) => {
    return p3.map((c: number) => {
        return c > 1 / 512 ? c ** (1 / 1.8) : c * 16;
    });
};

/**
 * Convert Pro-Photo to XYZ
 *
 * @param args
 */
export const proPhotoToXYZ = (args: number[]) => {
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
export const convertProPhoto = (args: number[]) => {
    const xyz = proPhotoToXYZ([args[0], args[1], args[2]]);
    return packXYZ([xyz[0], xyz[1], xyz[2], args[3]]);
};
