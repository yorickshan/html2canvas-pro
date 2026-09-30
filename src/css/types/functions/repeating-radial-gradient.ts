import { CSSValue } from '../../syntax/parser';
import { CSSImageType, CSSRadialGradientImage } from '../image';
import { radialGradient } from './radial-gradient';
import { Context } from '../../../core/context';

/**
 * repeating-radial-gradient shares the radial-gradient grammar exactly; only
 * the image type differs, which switches the renderer to periodic stops.
 */
export const repeatingRadialGradient = (context: Context, tokens: CSSValue[]): CSSRadialGradientImage => {
    const gradient = radialGradient(context, tokens);
    return {
        ...gradient,
        type: CSSImageType.REPEATING_RADIAL_GRADIENT
    };
};
