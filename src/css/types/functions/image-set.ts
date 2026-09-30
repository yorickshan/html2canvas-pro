import { CSSValue, isDimensionToken, isNumberToken, parseFunctionArgs } from '../../syntax/parser';
import { TokenType } from '../../syntax/tokenizer';
import { ICSSImage, image } from '../image';
import { Context } from '../../../core/context';
import { at } from '../../../core/util';

interface ImageSetCandidate {
    imageToken: CSSValue;
    resolution: number;
}

const parseResolution = (token: CSSValue | undefined): number => {
    if (!token) return 1;
    if (isDimensionToken(token)) {
        // Chrome serialises computed values with the dppx unit; `x` is the
        // authoring alias for the same dimension.
        if (token.unit === 'dppx' || token.unit === 'x') return token.number;
    }
    if (isNumberToken(token)) {
        return token.number; // unitless numbers mean `x` multiples
    }
    return 1;
};

/**
 * image-set(url(a.png) 1x, url(b.png) 2x)
 *
 * Browsers keep image-set in the computed value, so the candidate matching
 * the current devicePixelRatio is selected here: the smallest resolution >=
 * DPR, falling back to the largest candidate below it.
 */
export const imageSet = (context: Context, tokens: CSSValue[]): ICSSImage => {
    const args = parseFunctionArgs(tokens);
    const dpr = context.config.window.devicePixelRatio || 1;

    const candidates: ImageSetCandidate[] = [];
    for (const arg of args) {
        const imageToken = arg.find((t) => t.type === TokenType.URL_TOKEN || t.type === TokenType.FUNCTION);
        if (!imageToken) continue;
        const resolutionToken = arg.find((t) => isDimensionToken(t) || isNumberToken(t));
        candidates.push({ imageToken, resolution: parseResolution(resolutionToken) });
    }
    if (candidates.length === 0) {
        throw new Error('image-set() requires at least one image candidate');
    }

    const satisfying = candidates
        .filter((candidate) => candidate.resolution >= dpr)
        .sort((a, b) => a.resolution - b.resolution);
    // Nothing satisfies the DPR: use the largest candidate (upscaled).
    const chosen = at(
        satisfying.length > 0 ? satisfying : candidates.slice().sort((a, b) => b.resolution - a.resolution),
        0
    );

    return image.parse(context, chosen.imageToken);
};
