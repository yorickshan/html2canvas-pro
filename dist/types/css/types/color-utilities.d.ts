import { Context } from '../../core/context';
import { CSSValue } from '../syntax/parser';
type Color = number;
export declare const isTransparent: (color: Color) => boolean;
export declare const asString: (color: Color) => string;
export declare const pack: (r: number, g: number, b: number, a: number) => Color;
export declare const getTokenColorValue: (token: CSSValue, i: number) => number;
export declare const isRelativeTransform: (tokens: CSSValue[]) => boolean;
export declare const clamp: (value: number, min: number, max: number) => number;
export declare const multiplyMatrices: (A: number[], B: number[]) => [number, number, number];
export declare const packSrgb: (args: number[]) => number;
export declare const packSrgbLinear: ([r, g, b, a]: [number, number, number, number]) => number;
export declare const packXYZ: (args: number[]) => number;
export declare const packLab: (_context: Context, args: CSSValue[]) => number;
export declare const packOkLab: (_context: Context, args: CSSValue[]) => number;
export declare const packOkLch: (_context: Context, args: CSSValue[]) => number;
export declare const packLch: (_context: Context, args: CSSValue[]) => number;
export declare const extractHslComponents: (context: Context, args: CSSValue[]) => [number, number, number, number];
export declare const packHSL: (context: Context, args: CSSValue[]) => number;
export declare const extractLchComponents: (args: CSSValue[]) => [number, number, number, number];
export declare const extractLabComponents: (args: CSSValue[]) => [number, number, number, number];
export declare const extractOkLchComponents: (args: CSSValue[]) => [number, number, number, number];
/**
 * Convert D65 to D50
 *
 * @param xyz
 */
export declare const d65toD50: (xyz: [number, number, number]) => [number, number, number];
/**
 * Convert D50 to D65
 *
 * @param xyz
 */
export declare const d50toD65: (xyz: [number, number, number]) => [number, number, number];
export declare const hue2rgb: (t1: number, t2: number, hue: number) => number;
/**
 * Convert RGB to XYZ
 *
 * @param _context
 * @param args
 */
export declare const rgbToXyz: (_context: Context, args: CSSValue[]) => [number, number, number, number];
/**
 * HSL to XYZ
 *
 * @param context
 * @param args
 */
export declare const hslToXyz: (context: Context, args: CSSValue[]) => [number, number, number, number];
/**
 * LAB to XYZ
 *
 * @param _context
 * @param args
 */
export declare const labToXyz: (_context: Context, args: CSSValue[]) => [number, number, number, number];
/**
 * LCH to XYZ
 *
 * @param _context
 * @param args
 */
export declare const lchToXyz: (_context: Context, args: CSSValue[]) => [number, number, number, number];
/**
 * OKLch to XYZ
 *
 * @param _context
 * @param args
 */
export declare const oklchToXyz: (_context: Context, args: CSSValue[]) => [number, number, number, number];
/**
 * OKLab to XYZ
 *
 * @param _context
 * @param args
 */
export declare const oklabToXyz: (_context: Context, args: CSSValue[]) => [number, number, number, number];
/**
 * XYZ-50 to XYZ
 *
 * @param args
 */
export declare const xyz50ToXYZ: (args: number[]) => [number, number, number];
/**
 * Does nothing, required for SUPPORTED_COLOR_SPACES_FROM_XYZ in the _color() function
 *
 * @param args
 */
export declare const xyzFromXYZ: (args: [number, number, number, number]) => [number, number, number, number];
/**
 * XYZ-65 to XYZ-50
 *
 * @param args
 */
export declare const xyz50FromXYZ: (args: [number, number, number, number]) => [number, number, number, number];
/**
 * Convert XYZ to SRGB and Pack
 *
 * @param args
 */
export declare const convertXyz: (args: number[]) => number;
/**
 * Convert XYZ-50 to SRGB and Pack
 *
 * @param args
 */
export declare const convertXyz50: (args: number[]) => number;
export {};
