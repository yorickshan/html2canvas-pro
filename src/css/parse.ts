/**
 * CSS property registry and value parser.
 *
 * Owns the canonical list of parsed standard properties (the single place to
 * register a new CSS property: add the descriptor import and one table row)
 * and the shared LRU parse cache that turns computed style strings into
 * strongly-typed values.
 *
 * Extracted from css/index.ts so the declaration data class stays free of
 * parsing machinery.
 */

import { CSSPropertyDescriptor, PropertyDescriptorParsingType } from './property-descriptor';
import { backgroundClip } from './property-descriptors/background-clip';
import { backgroundColor } from './property-descriptors/background-color';
import { backgroundImage } from './property-descriptors/background-image';
import { backgroundOrigin } from './property-descriptors/background-origin';
import { backgroundPosition } from './property-descriptors/background-position';
import { backgroundRepeat } from './property-descriptors/background-repeat';
import { backgroundSize } from './property-descriptors/background-size';
import {
    borderBottomColor,
    borderLeftColor,
    borderRightColor,
    borderTopColor
} from './property-descriptors/border-color';
import {
    borderBottomLeftRadius,
    borderBottomRightRadius,
    borderTopLeftRadius,
    borderTopRightRadius
} from './property-descriptors/border-radius';
import {
    borderBottomStyle,
    borderLeftStyle,
    borderRightStyle,
    borderTopStyle
} from './property-descriptors/border-style';
import {
    borderBottomWidth,
    borderLeftWidth,
    borderRightWidth,
    borderTopWidth
} from './property-descriptors/border-width';
import { clipPath } from './property-descriptors/clip-path';
import { color } from './property-descriptors/color';
import { direction } from './property-descriptors/direction';
import { display } from './property-descriptors/display';
import { fontFamily } from './property-descriptors/font-family';
import { fontSize } from './property-descriptors/font-size';
import { letterSpacing } from './property-descriptors/letter-spacing';
import { lineBreak } from './property-descriptors/line-break';
import { lineHeight } from './property-descriptors/line-height';
import { listStyleImage } from './property-descriptors/list-style-image';
import { listStylePosition } from './property-descriptors/list-style-position';
import { listStyleType } from './property-descriptors/list-style-type';
import { marginBottom, marginLeft, marginRight, marginTop } from './property-descriptors/margin';
import { overflowWrap } from './property-descriptors/overflow-wrap';
import { paddingBottom, paddingLeft, paddingRight, paddingTop } from './property-descriptors/padding';
import { textAlign } from './property-descriptors/text-align';
import { position } from './property-descriptors/position';
import { textShadow } from './property-descriptors/text-shadow';
import { textTransform } from './property-descriptors/text-transform';
import { transform } from './property-descriptors/transform';
import { transformOrigin } from './property-descriptors/transform-origin';
import { rotate } from './property-descriptors/rotate';
import { visibility } from './property-descriptors/visibility';
import { wordBreak } from './property-descriptors/word-break';
import { whiteSpace } from './property-descriptors/white-space';
import { writingMode } from './property-descriptors/writing-mode';
import { zIndex } from './property-descriptors/z-index';
import { isIdentToken, Parser } from './syntax/parser';
import { Tokenizer } from './syntax/tokenizer';
import { color as colorType } from './types/color';
import { angle } from './types/angle';
import { image } from './types/image';
import { time } from './types/time';
import { opacity } from './property-descriptors/opacity';
import { textDecorationStyle } from './property-descriptors/text-decoration-style';
import { textDecorationThickness } from './property-descriptors/text-decoration-thickness';
import { textUnderlineOffset } from './property-descriptors/text-underline-offset';
import { isLengthPercentage, ZERO_LENGTH } from './types/length-percentage';
import { isLength } from './types/length';
import { fontWeight } from './property-descriptors/font-weight';
import { fontVariant } from './property-descriptors/font-variant';
import { fontStyle } from './property-descriptors/font-style';
import { duration } from './property-descriptors/duration';
import { boxShadow } from './property-descriptors/box-shadow';
import { paintOrder } from './property-descriptors/paint-order';
import { webkitTextStrokeColor } from './property-descriptors/webkit-text-stroke-color';
import { webkitTextStrokeWidth } from './property-descriptors/webkit-text-stroke-width';
import { webkitLineClamp } from './property-descriptors/webkit-line-clamp';
import { Context } from '../core/context';
import { objectFit } from './property-descriptors/object-fit';
import { textOverflow } from './property-descriptors/text-overflow';
import { imageRendering } from './property-descriptors/image-rendering';
import { mixBlendMode } from './property-descriptors/mix-blend-mode';
import { filter } from './property-descriptors/filter';
import { fontVariantLigatures } from './property-descriptors/font-variant-ligatures';
import { zoom } from './property-descriptors/zoom';
import { objectPosition } from './property-descriptors/object-position';
import { backgroundBlendMode } from './property-descriptors/background-blend-mode';
import { borderImageSource } from './property-descriptors/border-image-source';
import { borderImageSlice } from './property-descriptors/border-image-slice';
import { borderImageRepeat } from './property-descriptors/border-image-repeat';
import { boxDecorationBreak } from './property-descriptors/box-decoration-break';
import { accentColor } from './property-descriptors/accent-color';
import { webkitTextFillColor } from './property-descriptors/webkit-text-fill-color';
import { isolation } from './property-descriptors/isolation';
import { outlineColor, outlineOffset, outlineStyle, outlineWidth } from './property-descriptors/outline';
import { backdropFilter } from './property-descriptors/backdrop-filter';
import { maskImage, maskPosition, maskRepeat, maskSize } from './property-descriptors/mask';
import { textEmphasisColor, textEmphasisPosition, textEmphasisStyle } from './property-descriptors/text-emphasis';
import { borderImageOutset, borderImageWidth } from './property-descriptors/border-image-width';
import { webkitBoxReflect } from './property-descriptors/webkit-box-reflect';
import { PARSE_CACHE_MAX_PER_DESCRIPTOR } from '../core/constants';

export const STANDARD_PROPERTIES: [string, CSSPropertyDescriptor<unknown>, string][] = [
    ['animationDuration', duration, 'animationDuration'],
    ['backgroundClip', backgroundClip, 'backgroundClip'],
    ['backgroundColor', backgroundColor, 'backgroundColor'],
    ['backgroundImage', backgroundImage, 'backgroundImage'],
    ['backgroundOrigin', backgroundOrigin, 'backgroundOrigin'],
    ['backgroundPosition', backgroundPosition, 'backgroundPosition'],
    ['backgroundRepeat', backgroundRepeat, 'backgroundRepeat'],
    ['backgroundSize', backgroundSize, 'backgroundSize'],
    ['borderTopColor', borderTopColor, 'borderTopColor'],
    ['borderRightColor', borderRightColor, 'borderRightColor'],
    ['borderBottomColor', borderBottomColor, 'borderBottomColor'],
    ['borderLeftColor', borderLeftColor, 'borderLeftColor'],
    ['borderTopLeftRadius', borderTopLeftRadius, 'borderTopLeftRadius'],
    ['borderTopRightRadius', borderTopRightRadius, 'borderTopRightRadius'],
    ['borderBottomRightRadius', borderBottomRightRadius, 'borderBottomRightRadius'],
    ['borderBottomLeftRadius', borderBottomLeftRadius, 'borderBottomLeftRadius'],
    ['borderTopStyle', borderTopStyle, 'borderTopStyle'],
    ['borderRightStyle', borderRightStyle, 'borderRightStyle'],
    ['borderBottomStyle', borderBottomStyle, 'borderBottomStyle'],
    ['borderLeftStyle', borderLeftStyle, 'borderLeftStyle'],
    ['borderTopWidth', borderTopWidth, 'borderTopWidth'],
    ['borderRightWidth', borderRightWidth, 'borderRightWidth'],
    ['borderBottomWidth', borderBottomWidth, 'borderBottomWidth'],
    ['borderLeftWidth', borderLeftWidth, 'borderLeftWidth'],
    ['boxShadow', boxShadow, 'boxShadow'],
    ['clipPath', clipPath, 'clipPath'],
    ['color', color, 'color'],
    ['direction', direction, 'direction'],
    ['display', display, 'display'],
    ['fontFamily', fontFamily, 'fontFamily'],
    ['fontSize', fontSize, 'fontSize'],
    ['fontStyle', fontStyle, 'fontStyle'],
    ['fontVariant', fontVariant, 'fontVariant'],
    ['fontWeight', fontWeight, 'fontWeight'],
    ['letterSpacing', letterSpacing, 'letterSpacing'],
    ['lineBreak', lineBreak, 'lineBreak'],
    ['lineHeight', lineHeight, 'lineHeight'],
    ['listStyleImage', listStyleImage, 'listStyleImage'],
    ['listStylePosition', listStylePosition, 'listStylePosition'],
    ['listStyleType', listStyleType, 'listStyleType'],
    ['marginTop', marginTop, 'marginTop'],
    ['marginRight', marginRight, 'marginRight'],
    ['marginBottom', marginBottom, 'marginBottom'],
    ['marginLeft', marginLeft, 'marginLeft'],
    ['opacity', opacity, 'opacity'],
    ['overflowWrap', overflowWrap, 'overflowWrap'],
    ['paddingTop', paddingTop, 'paddingTop'],
    ['paddingRight', paddingRight, 'paddingRight'],
    ['paddingBottom', paddingBottom, 'paddingBottom'],
    ['paddingLeft', paddingLeft, 'paddingLeft'],
    ['paintOrder', paintOrder, 'paintOrder'],
    ['position', position, 'position'],
    ['textAlign', textAlign, 'textAlign'],
    ['textDecorationStyle', textDecorationStyle, 'textDecorationStyle'],
    ['textDecorationThickness', textDecorationThickness, 'textDecorationThickness'],
    ['textUnderlineOffset', textUnderlineOffset, 'textUnderlineOffset'],
    ['textShadow', textShadow, 'textShadow'],
    ['textTransform', textTransform, 'textTransform'],
    ['textOverflow', textOverflow, 'textOverflow'],
    ['transform', transform, 'transform'],
    ['transformOrigin', transformOrigin, 'transformOrigin'],
    ['rotate', rotate, 'rotate'],
    ['visibility', visibility, 'visibility'],
    ['webkitTextStrokeColor', webkitTextStrokeColor, 'webkitTextStrokeColor'],
    ['webkitTextStrokeWidth', webkitTextStrokeWidth, 'webkitTextStrokeWidth'],
    ['webkitLineClamp', webkitLineClamp, 'webkitLineClamp'],
    ['wordBreak', wordBreak, 'wordBreak'],
    ['whiteSpace', whiteSpace, 'whiteSpace'],
    ['writingMode', writingMode, 'writingMode'],
    ['zIndex', zIndex, 'zIndex'],
    ['objectFit', objectFit, 'objectFit'],
    ['imageRendering', imageRendering, 'imageRendering'],
    ['mixBlendMode', mixBlendMode, 'mixBlendMode'],
    ['filter', filter, 'filter'],
    ['fontVariantLigatures', fontVariantLigatures, 'fontVariantLigatures'],
    ['zoom', zoom, 'zoom'],
    ['objectPosition', objectPosition, 'objectPosition'],
    ['backgroundBlendMode', backgroundBlendMode, 'backgroundBlendMode'],
    ['borderImageSource', borderImageSource, 'borderImageSource'],
    ['borderImageSlice', borderImageSlice, 'borderImageSlice'],
    ['borderImageRepeat', borderImageRepeat, 'borderImageRepeat'],
    ['boxDecorationBreak', boxDecorationBreak, 'boxDecorationBreak'],
    ['accentColor', accentColor, 'accentColor'],
    ['webkitTextFillColor', webkitTextFillColor, 'webkitTextFillColor'],
    ['isolation', isolation, 'isolation'],
    ['outlineColor', outlineColor, 'outlineColor'],
    ['outlineStyle', outlineStyle, 'outlineStyle'],
    ['outlineWidth', outlineWidth, 'outlineWidth'],
    ['outlineOffset', outlineOffset, 'outlineOffset'],
    ['backdropFilter', backdropFilter, 'backdropFilter'],
    ['maskImage', maskImage, 'maskImage'],
    ['maskPosition', maskPosition, 'maskPosition'],
    ['maskRepeat', maskRepeat, 'maskRepeat'],
    ['maskSize', maskSize, 'maskSize'],
    ['textEmphasisStyle', textEmphasisStyle, 'textEmphasisStyle'],
    ['textEmphasisColor', textEmphasisColor, 'textEmphasisColor'],
    ['textEmphasisPosition', textEmphasisPosition, 'textEmphasisPosition'],
    ['borderImageWidth', borderImageWidth, 'borderImageWidth'],
    ['borderImageOutset', borderImageOutset, 'borderImageOutset'],
    ['webkitBoxReflect', webkitBoxReflect, 'webkitBoxReflect']
];

const parseCache = new Map<CSSPropertyDescriptor<any>, Map<string, unknown>>();

export const parse = (context: Context, descriptor: CSSPropertyDescriptor<any>, style?: string | null) => {
    let rawValue = style !== null && typeof style !== 'undefined' ? style.toString() : descriptor.initialValue;

    // A whitespace-only (or empty) computed value makes the tokenizer emit only an
    // EOF token, which parseComponentValue() turns into a "unexpected EOF" SyntaxError.
    // Some browsers produce such values for web-component shadow styles (see #225);
    // fall back to the descriptor's initialValue so capture never crashes on them.
    if (rawValue.trim() === '') {
        rawValue = descriptor.initialValue;
    }

    let valueCache = parseCache.get(descriptor);
    if (valueCache) {
        const cached = valueCache.get(rawValue);
        if (cached !== undefined) {
            valueCache.delete(rawValue);
            valueCache.set(rawValue, cached);
            return cached;
        }
    }

    const tokenizer = Tokenizer.get();
    tokenizer.write(rawValue);
    const parser = new Parser(tokenizer.read());
    Tokenizer.release(tokenizer);

    // Use IIFE so TS infers the return type of each branch (no `let result: any`)
    const result = (() => {
        switch (descriptor.type) {
            case PropertyDescriptorParsingType.IDENT_VALUE: {
                const token = parser.parseComponentValue();
                return descriptor.parse(context, isIdentToken(token) ? token.value : descriptor.initialValue);
            }
            case PropertyDescriptorParsingType.VALUE:
                return descriptor.parse(context, parser.parseComponentValue());
            case PropertyDescriptorParsingType.LIST:
                return descriptor.parse(context, parser.parseComponentValues());
            case PropertyDescriptorParsingType.TOKEN_VALUE:
                return parser.parseComponentValue();
            case PropertyDescriptorParsingType.TYPE_VALUE:
                switch (descriptor.format) {
                    case 'angle':
                        return angle.parse(context, parser.parseComponentValue());
                    case 'color':
                        return colorType.parse(context, parser.parseComponentValue());
                    case 'image':
                        return image.parse(context, parser.parseComponentValue());
                    case 'length': {
                        const length = parser.parseComponentValue();
                        return isLength(length) ? length : ZERO_LENGTH;
                    }
                    case 'length-percentage': {
                        const value = parser.parseComponentValue();
                        return isLengthPercentage(value) ? value : ZERO_LENGTH;
                    }
                    case 'time':
                        return time.parse(context, parser.parseComponentValue());
                }
        }
    })();

    if (!valueCache) {
        valueCache = new Map();
        parseCache.set(descriptor, valueCache);
    }
    // Skip caching for descriptors whose parse() has the critical side effect
    // of calling context.cache.addImage() which must run on every render pass
    // (different cache instances per html2canvas call). Two paths:
    // 1. Per-descriptor skipCache flag (backgroundImage, listStyleImage,
    //    borderImageSource — all call image.parse() internally).
    // 2. TYPE_VALUE + format 'image' — the image type descriptor itself,
    //    which calls addImage() directly.
    const skipCache =
        descriptor.skipCache ||
        (descriptor.type === PropertyDescriptorParsingType.TYPE_VALUE && descriptor.format === 'image');
    if (!skipCache) {
        if (valueCache.size >= PARSE_CACHE_MAX_PER_DESCRIPTOR) {
            const oldestKey = valueCache.keys().next().value;
            if (oldestKey !== undefined) {
                valueCache.delete(oldestKey);
            }
        }
        valueCache.set(rawValue, result);
    }

    return result;
};
