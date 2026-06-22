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
import { clipPath, ClipPathValue } from './property-descriptors/clip-path';
import { color } from './property-descriptors/color';
import { direction } from './property-descriptors/direction';
import { display, DISPLAY } from './property-descriptors/display';
import { float, FLOAT } from './property-descriptors/float';
import { letterSpacing } from './property-descriptors/letter-spacing';
import { lineBreak } from './property-descriptors/line-break';
import { lineHeight } from './property-descriptors/line-height';
import { listStyleImage } from './property-descriptors/list-style-image';
import { listStylePosition } from './property-descriptors/list-style-position';
import { listStyleType } from './property-descriptors/list-style-type';
import { marginBottom, marginLeft, marginRight, marginTop } from './property-descriptors/margin';
import { overflow, OVERFLOW } from './property-descriptors/overflow';
import { overflowWrap } from './property-descriptors/overflow-wrap';
import { paddingBottom, paddingLeft, paddingRight, paddingTop } from './property-descriptors/padding';
import { textAlign } from './property-descriptors/text-align';
import { position, POSITION } from './property-descriptors/position';
import { textShadow } from './property-descriptors/text-shadow';
import { textTransform } from './property-descriptors/text-transform';
import { transform } from './property-descriptors/transform';
import { transformOrigin } from './property-descriptors/transform-origin';
import { rotate } from './property-descriptors/rotate';
import { visibility, VISIBILITY } from './property-descriptors/visibility';
import { wordBreak } from './property-descriptors/word-break';
import { writingMode } from './property-descriptors/writing-mode';
import { zIndex } from './property-descriptors/z-index';
import { CSSValue, isIdentToken, Parser } from './syntax/parser';
import { Tokenizer } from './syntax/tokenizer';
import { Color, color as colorType } from './types/color';
import { isTransparent } from './types/color-utilities';
import { angle } from './types/angle';
import { image } from './types/image';
import { time } from './types/time';
import { opacity } from './property-descriptors/opacity';
import { textDecorationColor } from './property-descriptors/text-decoration-color';
import { textDecorationLine } from './property-descriptors/text-decoration-line';
import { textDecorationStyle } from './property-descriptors/text-decoration-style';
import { textDecorationThickness } from './property-descriptors/text-decoration-thickness';
import { textUnderlineOffset } from './property-descriptors/text-underline-offset';
import { isLengthPercentage, LengthPercentage, ZERO_LENGTH } from './types/length-percentage';
import { fontFamily } from './property-descriptors/font-family';
import { fontSize } from './property-descriptors/font-size';
import { isLength } from './types/length';
import { fontWeight } from './property-descriptors/font-weight';
import { fontVariant } from './property-descriptors/font-variant';
import { fontStyle } from './property-descriptors/font-style';
import { contains } from '../core/bitwise';
import { content } from './property-descriptors/content';
import { counterIncrement } from './property-descriptors/counter-increment';
import { counterReset } from './property-descriptors/counter-reset';
import { duration } from './property-descriptors/duration';
import { quotes } from './property-descriptors/quotes';
import { boxShadow } from './property-descriptors/box-shadow';
import { paintOrder } from './property-descriptors/paint-order';
import { webkitTextStrokeColor } from './property-descriptors/webkit-text-stroke-color';
import { webkitTextStrokeWidth } from './property-descriptors/webkit-text-stroke-width';
import { webkitLineClamp } from './property-descriptors/webkit-line-clamp';
import { Context } from '../core/context';
import { objectFit } from './property-descriptors/object-fit';
import { textOverflow } from './property-descriptors/text-overflow';
import { imageRendering } from './property-descriptors/image-rendering';

export class CSSParsedDeclaration {
    animationDuration!: ReturnType<typeof duration.parse>;
    backgroundClip!: ReturnType<typeof backgroundClip.parse>;
    backgroundColor!: Color;
    backgroundImage!: ReturnType<typeof backgroundImage.parse>;
    backgroundOrigin!: ReturnType<typeof backgroundOrigin.parse>;
    backgroundPosition!: ReturnType<typeof backgroundPosition.parse>;
    backgroundRepeat!: ReturnType<typeof backgroundRepeat.parse>;
    backgroundSize!: ReturnType<typeof backgroundSize.parse>;
    borderTopColor!: Color;
    borderRightColor!: Color;
    borderBottomColor!: Color;
    borderLeftColor!: Color;
    borderTopLeftRadius!: ReturnType<typeof borderTopLeftRadius.parse>;
    borderTopRightRadius!: ReturnType<typeof borderTopRightRadius.parse>;
    borderBottomRightRadius!: ReturnType<typeof borderBottomRightRadius.parse>;
    borderBottomLeftRadius!: ReturnType<typeof borderBottomLeftRadius.parse>;
    borderTopStyle!: ReturnType<typeof borderTopStyle.parse>;
    borderRightStyle!: ReturnType<typeof borderRightStyle.parse>;
    borderBottomStyle!: ReturnType<typeof borderBottomStyle.parse>;
    borderLeftStyle!: ReturnType<typeof borderLeftStyle.parse>;
    borderTopWidth!: ReturnType<typeof borderTopWidth.parse>;
    borderRightWidth!: ReturnType<typeof borderRightWidth.parse>;
    borderBottomWidth!: ReturnType<typeof borderBottomWidth.parse>;
    borderLeftWidth!: ReturnType<typeof borderLeftWidth.parse>;
    boxShadow!: ReturnType<typeof boxShadow.parse>;
    clipPath!: ClipPathValue;
    color!: Color;
    direction!: ReturnType<typeof direction.parse>;
    display!: ReturnType<typeof display.parse>;
    float!: ReturnType<typeof float.parse>;
    fontFamily!: ReturnType<typeof fontFamily.parse>;
    fontSize!: LengthPercentage;
    fontStyle!: ReturnType<typeof fontStyle.parse>;
    fontVariant!: ReturnType<typeof fontVariant.parse>;
    fontWeight!: ReturnType<typeof fontWeight.parse>;
    letterSpacing!: ReturnType<typeof letterSpacing.parse>;
    lineBreak!: ReturnType<typeof lineBreak.parse>;
    lineHeight!: CSSValue;
    listStyleImage!: ReturnType<typeof listStyleImage.parse>;
    listStylePosition!: ReturnType<typeof listStylePosition.parse>;
    listStyleType!: ReturnType<typeof listStyleType.parse>;
    marginTop!: CSSValue;
    marginRight!: CSSValue;
    marginBottom!: CSSValue;
    marginLeft!: CSSValue;
    opacity!: ReturnType<typeof opacity.parse>;
    overflowX!: OVERFLOW;
    overflowY!: OVERFLOW;
    overflowWrap!: ReturnType<typeof overflowWrap.parse>;
    paddingTop!: LengthPercentage;
    paddingRight!: LengthPercentage;
    paddingBottom!: LengthPercentage;
    paddingLeft!: LengthPercentage;
    paintOrder!: ReturnType<typeof paintOrder.parse>;
    position!: ReturnType<typeof position.parse>;
    textAlign!: ReturnType<typeof textAlign.parse>;
    textDecorationColor!: Color;
    textDecorationLine!: ReturnType<typeof textDecorationLine.parse>;
    textDecorationStyle!: ReturnType<typeof textDecorationStyle.parse>;
    textDecorationThickness!: ReturnType<typeof textDecorationThickness.parse>;
    textUnderlineOffset!: ReturnType<typeof textUnderlineOffset.parse>;
    textShadow!: ReturnType<typeof textShadow.parse>;
    textTransform!: ReturnType<typeof textTransform.parse>;
    textOverflow!: ReturnType<typeof textOverflow.parse>;
    transform!: ReturnType<typeof transform.parse>;
    transformOrigin!: ReturnType<typeof transformOrigin.parse>;
    rotate!: ReturnType<typeof rotate.parse>;
    visibility!: ReturnType<typeof visibility.parse>;
    webkitTextStrokeColor!: Color;
    webkitTextStrokeWidth!: ReturnType<typeof webkitTextStrokeWidth.parse>;
    webkitLineClamp!: ReturnType<typeof webkitLineClamp.parse>;
    wordBreak!: ReturnType<typeof wordBreak.parse>;
    writingMode!: ReturnType<typeof writingMode.parse>;
    zIndex!: ReturnType<typeof zIndex.parse>;
    objectFit!: ReturnType<typeof objectFit.parse>;
    imageRendering!: ReturnType<typeof imageRendering.parse>;

    private static readonly standardProps: [keyof CSSParsedDeclaration, CSSPropertyDescriptor<unknown>, string][] = [
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
        ['writingMode', writingMode, 'writingMode'],
        ['zIndex', zIndex, 'zIndex'],
        ['objectFit', objectFit, 'objectFit'],
        ['imageRendering', imageRendering, 'imageRendering']
    ];

    constructor(context: Context, declaration: CSSStyleDeclaration) {
        const standardProps = CSSParsedDeclaration.standardProps;

        // Fast path: display:none elements are invisible and their descendants
        // are never rendered. Parse only initial values instead of full computed styles.
        if (declaration.display === 'none') {
            this.display = DISPLAY.NONE;
            for (const [key, descriptor] of standardProps) {
                if (key !== 'display') {
                    (this as Record<string, unknown>)[key] = parse(context, descriptor, undefined);
                }
            }
            this.float = parse(context, float, undefined);
            this.textDecorationColor = parse(context, textDecorationColor, undefined);
            this.textDecorationLine = parse(context, textDecorationLine, undefined);
            const overflowTuple = parse(context, overflow, undefined);
            this.overflowX = overflowTuple[0];
            this.overflowY = overflowTuple[overflowTuple.length > 1 ? 1 : 0];
            return;
        }

        for (const [key, descriptor, cssProp] of standardProps) {
            (this as Record<string, unknown>)[key] = parse(
                context,
                descriptor,
                (declaration as Record<string, string | undefined>)[cssProp]
            );
        }

        // Special cases that need different CSS property names or fallback values
        this.float = parse(context, float, declaration.cssFloat);
        this.textDecorationColor = parse(
            context,
            textDecorationColor,
            declaration.textDecorationColor ?? declaration.color
        );
        this.textDecorationLine = parse(
            context,
            textDecorationLine,
            declaration.textDecorationLine ?? declaration.textDecoration
        );

        // overflow returns a tuple that must be split into X/Y
        const overflowTuple = parse(context, overflow, declaration.overflow);
        this.overflowX = overflowTuple[0];
        this.overflowY = overflowTuple[overflowTuple.length > 1 ? 1 : 0];
    }

    isVisible(): boolean {
        return this.display > 0 && this.opacity > 0 && this.visibility === VISIBILITY.VISIBLE;
    }

    isTransparent(): boolean {
        return isTransparent(this.backgroundColor);
    }

    isTransformed(): boolean {
        return this.transform !== null || this.rotate !== null;
    }

    isPositioned(): boolean {
        return this.position !== POSITION.STATIC;
    }

    isPositionedWithZIndex(): boolean {
        return this.isPositioned() && !this.zIndex.auto;
    }

    isFloating(): boolean {
        return this.float !== FLOAT.NONE;
    }

    isInlineLevel(): boolean {
        return (
            contains(this.display, DISPLAY.INLINE) ||
            contains(this.display, DISPLAY.INLINE_BLOCK) ||
            contains(this.display, DISPLAY.INLINE_FLEX) ||
            contains(this.display, DISPLAY.INLINE_GRID) ||
            contains(this.display, DISPLAY.INLINE_LIST_ITEM) ||
            contains(this.display, DISPLAY.INLINE_TABLE)
        );
    }
}

export class CSSParsedPseudoDeclaration {
    content: ReturnType<typeof content.parse>;
    quotes: ReturnType<typeof quotes.parse>;

    constructor(context: Context, declaration: CSSStyleDeclaration) {
        this.content = parse(context, content, declaration.content);
        this.quotes = parse(context, quotes, declaration.quotes);
    }
}

export class CSSParsedCounterDeclaration {
    counterIncrement: ReturnType<typeof counterIncrement.parse>;
    counterReset: ReturnType<typeof counterReset.parse>;

    constructor(context: Context, declaration: CSSStyleDeclaration) {
        this.counterIncrement = parse(context, counterIncrement, declaration.counterIncrement);
        this.counterReset = parse(context, counterReset, declaration.counterReset);
    }
}

const parseCache = new Map<CSSPropertyDescriptor<any>, Map<string, unknown>>();
const PARSE_CACHE_MAX_PER_DESCRIPTOR = 200;

const parse = (context: Context, descriptor: CSSPropertyDescriptor<any>, style?: string | null) => {
    const rawValue = style !== null && typeof style !== 'undefined' ? style.toString() : descriptor.initialValue;

    let valueCache = parseCache.get(descriptor);
    if (valueCache) {
        const cached = valueCache.get(rawValue);
        if (cached !== undefined) {
            return cached;
        }
    }

    const tokenizer = Tokenizer.get();
    tokenizer.write(rawValue);
    const parser = new Parser(tokenizer.read());
    Tokenizer.release(tokenizer);

    let result: any;
    switch (descriptor.type) {
        case PropertyDescriptorParsingType.IDENT_VALUE: {
            const token = parser.parseComponentValue();
            result = descriptor.parse(context, isIdentToken(token) ? token.value : descriptor.initialValue);
            break;
        }
        case PropertyDescriptorParsingType.VALUE:
            result = descriptor.parse(context, parser.parseComponentValue());
            break;
        case PropertyDescriptorParsingType.LIST:
            result = descriptor.parse(context, parser.parseComponentValues());
            break;
        case PropertyDescriptorParsingType.TOKEN_VALUE:
            result = parser.parseComponentValue();
            break;
        case PropertyDescriptorParsingType.TYPE_VALUE:
            switch (descriptor.format) {
                case 'angle':
                    result = angle.parse(context, parser.parseComponentValue());
                    break;
                case 'color':
                    result = colorType.parse(context, parser.parseComponentValue());
                    break;
                case 'image':
                    result = image.parse(context, parser.parseComponentValue());
                    break;
                case 'length': {
                    const length = parser.parseComponentValue();
                    result = isLength(length) ? length : ZERO_LENGTH;
                    break;
                }
                case 'length-percentage': {
                    const value = parser.parseComponentValue();
                    result = isLengthPercentage(value) ? value : ZERO_LENGTH;
                    break;
                }
                case 'time':
                    result = time.parse(context, parser.parseComponentValue());
                    break;
            }
            break;
    }

    if (!valueCache) {
        valueCache = new Map();
        parseCache.set(descriptor, valueCache);
    }
    if (valueCache.size >= PARSE_CACHE_MAX_PER_DESCRIPTOR) {
        valueCache.clear();
    }
    valueCache.set(rawValue, result);

    return result;
};
