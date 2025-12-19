/**
 * SRGB related functions
 */

import { clamp, multiplyMatrices } from '../color-utilities';

/**
 * Convert XYZ to linear-light sRGB
 *
 * @param xyz
 */
export const xyz2rgbLinear = (xyz: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        [
            3.2409699419045226, -1.537383177570094, -0.4986107602930034, -0.9692436362808796, 1.8759675015077202,
            0.04155505740717559, 0.05563007969699366, -0.20397695888897652, 1.0569715142428786
        ],
        xyz
    );
};

/**
 * Convert XYZ to linear-light sRGB
 *
 * @param xyz
 */
export const rgbLinear2xyz = (xyz: [number, number, number]): [number, number, number] => {
    return multiplyMatrices(
        [
            0.41239079926595934, 0.357584339383878, 0.1804807884018343, 0.21263900587151027, 0.715168678767756,
            0.07219231536073371, 0.01933081871559182, 0.11919477979462598, 0.9505321522496607
        ],
        xyz
    );
};

/**
 * Convert sRGB to RGB
 *
 * @param rgb
 */
export const srgbLinear2rgb = (rgb: [number, number, number]): number[] => {
    return rgb.map((c: number) => {
        const sign = c < 0 ? -1 : 1,
            abs = Math.abs(c);

        return abs > 0.0031308 ? sign * (1.055 * abs ** (1 / 2.4) - 0.055) : 12.92 * c;
    });
};

/**
 * Convert RGB to sRGB
 *
 * @param rgb
 */
export const rgb2rgbLinear = (rgb: [number, number, number]): number[] => {
    return rgb.map((c: number) => {
        const sign = c < 0 ? -1 : 1,
            abs = Math.abs(c);

        return abs <= 0.04045 ? c / 12.92 : sign * ((abs + 0.055) / 1.055) ** 2.4;
    });
};

/**
 * XYZ to SRGB
 *
 * @param args
 */
export const srgbFromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [r, g, b] = srgbLinear2rgb(xyz2rgbLinear([args[0], args[1], args[2]]));
    return [r, g, b, args[3]];
};

/**
 * XYZ to SRGB-Linear
 * @param args
 */
export const srgbLinearFromXYZ = (args: [number, number, number, number]): [number, number, number, number] => {
    const [r, g, b] = xyz2rgbLinear([args[0], args[1], args[2]]);
    return [
        clamp(Math.round(r * 255), 0, 255),
        clamp(Math.round(g * 255), 0, 255),
        clamp(Math.round(b * 255), 0, 255),
        args[3]
    ];
};
