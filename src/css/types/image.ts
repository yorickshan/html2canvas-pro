import { CSSValue } from '../syntax/parser';
import { TokenType } from '../syntax/tokenizer';
import { Color } from './color';
import { linearGradient } from './functions/linear-gradient';
import { prefixLinearGradient } from './functions/-prefix-linear-gradient';
import { ITypeDescriptor } from '../type-descriptor';
import { LengthPercentage } from './length-percentage';
import { webkitGradient } from './functions/-webkit-gradient';
import { radialGradient } from './functions/radial-gradient';
import { prefixRadialGradient } from './functions/-prefix-radial-gradient';
import { repeatingLinearGradient } from './functions/repeating-linear-gradient';
import { repeatingRadialGradient } from './functions/repeating-radial-gradient';
import { conicGradient, repeatingConicGradient } from './functions/conic-gradient';
import { imageSet } from './functions/image-set';
import { Context } from '../../core/context';

export const enum CSSImageType {
    URL,
    LINEAR_GRADIENT,
    RADIAL_GRADIENT,
    REPEATING_LINEAR_GRADIENT,
    REPEATING_RADIAL_GRADIENT,
    CONIC_GRADIENT,
    REPEATING_CONIC_GRADIENT
}

export const isLinearGradient = (background: ICSSImage): background is CSSLinearGradientImage => {
    return background.type === CSSImageType.LINEAR_GRADIENT;
};

export const isRadialGradient = (background: ICSSImage): background is CSSRadialGradientImage => {
    return background.type === CSSImageType.RADIAL_GRADIENT;
};

export const isRepeatingLinearGradient = (background: ICSSImage): background is CSSLinearGradientImage => {
    return background.type === CSSImageType.REPEATING_LINEAR_GRADIENT;
};

export const isRepeatingRadialGradient = (background: ICSSImage): background is CSSRadialGradientImage => {
    return background.type === CSSImageType.REPEATING_RADIAL_GRADIENT;
};

export const isConicGradient = (background: ICSSImage): background is CSSConicGradientImage => {
    return background.type === CSSImageType.CONIC_GRADIENT;
};

export const isRepeatingConicGradient = (background: ICSSImage): background is CSSConicGradientImage => {
    return background.type === CSSImageType.REPEATING_CONIC_GRADIENT;
};

export interface UnprocessedGradientColorStop {
    color: Color;
    stop: LengthPercentage | null;
}

export interface GradientColorStop {
    color: Color;
    stop: number;
}

export interface ICSSImage {
    type: CSSImageType;
}

export interface CSSURLImage extends ICSSImage {
    url: string;
    type: CSSImageType.URL;
}

// interface ICSSGeneratedImage extends ICSSImage {}

export type GradientCorner = [LengthPercentage, LengthPercentage];

interface ICSSGradientImage extends ICSSImage {
    stops: UnprocessedGradientColorStop[];
}

export interface CSSLinearGradientImage extends ICSSGradientImage {
    angle: number | GradientCorner;
    type: CSSImageType.LINEAR_GRADIENT | CSSImageType.REPEATING_LINEAR_GRADIENT;
}

export const enum CSSRadialShape {
    CIRCLE,
    ELLIPSE
}

export const enum CSSRadialExtent {
    CLOSEST_SIDE,
    FARTHEST_SIDE,
    CLOSEST_CORNER,
    FARTHEST_CORNER
}

export type CSSRadialSize = CSSRadialExtent | LengthPercentage[];

export interface CSSRadialGradientImage extends ICSSGradientImage {
    type: CSSImageType.RADIAL_GRADIENT | CSSImageType.REPEATING_RADIAL_GRADIENT;
    shape: CSSRadialShape;
    size: CSSRadialSize;
    position: LengthPercentage[];
}

/**
 * conic-gradient( [ from <angle> ]? [ at <position> ]?, <color-stop-list> )
 * `angle` is the `from` angle in radians, measured clockwise from 12 o'clock.
 */
export interface CSSConicGradientImage extends ICSSGradientImage {
    type: CSSImageType.CONIC_GRADIENT | CSSImageType.REPEATING_CONIC_GRADIENT;
    angle: number;
    position: LengthPercentage[];
}

export const image: ITypeDescriptor<ICSSImage> = {
    name: 'image',
    parse: (context: Context, value: CSSValue): ICSSImage => {
        if (value.type === TokenType.URL_TOKEN) {
            const image: CSSURLImage = { url: value.value, type: CSSImageType.URL };
            context.cache.addImage(value.value);
            return image;
        }

        if (value.type === TokenType.FUNCTION) {
            const imageFunction = SUPPORTED_IMAGE_FUNCTIONS[value.name];
            if (typeof imageFunction === 'undefined') {
                throw new Error(`Attempting to parse an unsupported image function "${value.name}"`);
            }
            return imageFunction(context, value.values);
        }

        throw new Error(`Unsupported image type ${value.type}`);
    }
};

export function isSupportedImage(value: CSSValue): boolean {
    return (
        !(value.type === TokenType.IDENT_TOKEN && value.value === 'none') &&
        (value.type !== TokenType.FUNCTION || !!SUPPORTED_IMAGE_FUNCTIONS[value.name])
    );
}

const SUPPORTED_IMAGE_FUNCTIONS: Record<string, (context: Context, args: CSSValue[]) => ICSSImage> = {
    'linear-gradient': linearGradient,
    '-moz-linear-gradient': prefixLinearGradient,
    '-ms-linear-gradient': prefixLinearGradient,
    '-o-linear-gradient': prefixLinearGradient,
    '-webkit-linear-gradient': prefixLinearGradient,
    'radial-gradient': radialGradient,
    '-moz-radial-gradient': prefixRadialGradient,
    '-ms-radial-gradient': prefixRadialGradient,
    '-o-radial-gradient': prefixRadialGradient,
    '-webkit-radial-gradient': prefixRadialGradient,
    '-webkit-gradient': webkitGradient,
    'repeating-linear-gradient': repeatingLinearGradient,
    '-webkit-repeating-linear-gradient': repeatingLinearGradient,
    '-moz-repeating-linear-gradient': repeatingLinearGradient,
    '-ms-repeating-linear-gradient': repeatingLinearGradient,
    '-o-repeating-linear-gradient': repeatingLinearGradient,
    'repeating-radial-gradient': repeatingRadialGradient,
    '-webkit-repeating-radial-gradient': repeatingRadialGradient,
    '-moz-repeating-radial-gradient': repeatingRadialGradient,
    'conic-gradient': conicGradient,
    '-webkit-conic-gradient': conicGradient,
    '-moz-conic-gradient': conicGradient,
    'repeating-conic-gradient': repeatingConicGradient,
    '-webkit-repeating-conic-gradient': repeatingConicGradient,
    '-moz-repeating-conic-gradient': repeatingConicGradient,
    'image-set': imageSet,
    '-webkit-image-set': imageSet
};
