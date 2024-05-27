/**
 * REC2020 related functions
 */

import {multiplyMatrices, packXYZ} from '../color-utilities';

const _a = 1.09929682680944;
const _b = 0.018053968510807;

/**
 * Convert rec2020 to rec2020 linear
 *
 * @param rgb
 */
export const rec20202rec2020Linear = (rgb: [number, number, number]): number[] => {
    return rgb.map(function (c) {
        return c < _b * 4.5 ? c / 4.5 : Math.pow((c + _a - 1) / _a, 1 / 0.45);
    });
};

/**
 * Convert rec2020 linear to rec2020
 *
 * @param rgb
 */
export const rec2020Linear2rec2020 = (rgb: [number, number, number]): number[] => {
    return rgb.map(function (c) {
        return c >= _b ? _a * Math.pow(c, 0.45) - (_a - 1) : 4.5 * c;
    });
};

/**
 * Convert rec2020 linear to XYZ D65
 *
 * @param rec
 */
export const rec2020LinearToXyz = (rec: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        // eslint-disable-next-line prettier/prettier
        [0.6369580483012914, 0.14461690358620832, 0.1688809751641721, 0.2627002120112671, 0.6779980715188708, 0.05930171646986196, 0.0, 0.028072693049087428, 1.060985057710791
        ],
        rec
    );
};

/**
 * Convert XYZ D65 to rec2020 linear
 *
 * @param xyz
 */
export const xyzToRec2020Linear = (xyz: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        // eslint-disable-next-line prettier/prettier
        [1.716651187971268, -0.355670783776392, -0.253366281373660,  -0.666684351832489, 1.616481236634939, 0.0157685458139111, 0.017639857445311, -0.042770613257809, 0.942103121235474],
        xyz
    );
};

/**
 * Convert Rec2020 to XYZ
 *
 * @param args
 */
export const rec2020ToXYZ = (args: number[]): [number, number, number] => {
    const rec2020_linear = rec20202rec2020Linear([args[0], args[1], args[2]]);
    return rec2020LinearToXyz([rec2020_linear[0], rec2020_linear[1], rec2020_linear[2]]);
};

/**
 * Convert XYZ to Rec2020
 *
 * @param args
 */
export const rec2020FromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [r, g, b] = rec2020Linear2rec2020(xyzToRec2020Linear([args[0], args[1], args[2]]));
    return [r, g, b, args[3]];
};

/**
 * Convert Rec2020 to SRGB and Pack
 *
 * @param args
 */
export const convertRec2020 = (args: number[]): number => {
    const xyz = rec2020ToXYZ([args[0], args[1], args[2]]);
    return packXYZ([xyz[0], xyz[1], xyz[2], args[3]]);
};
