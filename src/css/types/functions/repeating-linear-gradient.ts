import { CSSValue } from '../../syntax/parser';
import { CSSImageType, CSSLinearGradientImage } from '../image';
import { linearGradient } from './linear-gradient';
import { Context } from '../../../core/context';

export const repeatingLinearGradient = (context: Context, tokens: CSSValue[]): CSSLinearGradientImage => {
    const gradient = linearGradient(context, tokens);
    return { ...gradient, type: CSSImageType.REPEATING_LINEAR_GRADIENT };
};
