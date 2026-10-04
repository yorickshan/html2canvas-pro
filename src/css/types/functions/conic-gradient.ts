import { CSSValue, isIdentToken, parseFunctionArgs } from '../../syntax/parser';
import { CSSConicGradientImage, CSSImageType, UnprocessedGradientColorStop } from '../image';
import { parseColorStop } from './gradient';
import { angle } from '../angle';
import {
    FIFTY_PERCENT,
    HUNDRED_PERCENT,
    isLengthPercentage,
    LengthPercentage,
    ZERO_LENGTH
} from '../length-percentage';
import { Context } from '../../../core/context';

/**
 * conic-gradient( [ from <angle> ]? [ at <position> ]?, <color-stop-list> )
 *
 * The gradient sweeps clockwise from `from <angle>` (0deg = 12 o'clock)
 * around `at <position>` (default: center). The first comma-separated group
 * may carry the from/at clauses; every following group is a color stop.
 */
export const conicGradient = (context: Context, tokens: CSSValue[]): CSSConicGradientImage => {
    let fromAngle = 0;
    const position: LengthPercentage[] = [];
    const stops: UnprocessedGradientColorStop[] = [];

    const args = parseFunctionArgs(tokens);
    args.forEach((arg, i) => {
        let isColorStop = true;
        if (i === 0) {
            let afterFrom = false;
            let afterAt = false;
            // The reduce result tracks whether the group ended as a plain
            // color stop: clause keywords and their values consume tokens and
            // keep the accumulator false, so `at top` is never parsed as one.
            isColorStop = arg.reduce((acc, token) => {
                if (isIdentToken(token)) {
                    switch (token.value) {
                        case 'from':
                            afterFrom = true;
                            afterAt = false;
                            return false;
                        case 'at':
                            afterFrom = false;
                            afterAt = true;
                            return false;
                        case 'center':
                            position.push(FIFTY_PERCENT);
                            return acc;
                        case 'top':
                        case 'left':
                            position.push(ZERO_LENGTH);
                            return acc;
                        case 'right':
                        case 'bottom':
                            position.push(HUNDRED_PERCENT);
                            return acc;
                    }
                }
                if (afterFrom) {
                    fromAngle = angle.parse(context, token);
                    return false;
                }
                if (afterAt && isLengthPercentage(token)) {
                    position.push(token);
                    return acc;
                }
                return acc;
            }, true);
        }
        if (isColorStop && arg.length > 0) {
            stops.push(parseColorStop(context, arg));
        }
    });

    return {
        type: CSSImageType.CONIC_GRADIENT,
        angle: fromAngle,
        position,
        stops
    };
};

/**
 * repeating-conic-gradient shares the conic-gradient grammar exactly; only
 * the image type differs, which switches the renderer to periodic stops
 * stacked across the full sweep.
 */
export const repeatingConicGradient = (context: Context, tokens: CSSValue[]): CSSConicGradientImage => {
    const gradient = conicGradient(context, tokens);
    return {
        ...gradient,
        type: CSSImageType.REPEATING_CONIC_GRADIENT
    };
};
