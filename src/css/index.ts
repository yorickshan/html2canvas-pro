import { CSSValue } from './syntax/parser';
import { Color } from './types/color';
import { isTransparent } from './types/color-utilities';
import { DISPLAY } from './property-descriptors/display';
import { float, FLOAT } from './property-descriptors/float';
import { overflow, OVERFLOW } from './property-descriptors/overflow';
import { textDecorationColor } from './property-descriptors/text-decoration-color';
import { textDecorationLine } from './property-descriptors/text-decoration-line';
import { content } from './property-descriptors/content';
import { quotes } from './property-descriptors/quotes';
import { counterIncrement } from './property-descriptors/counter-increment';
import { counterReset } from './property-descriptors/counter-reset';
import { contains } from '../core/bitwise';
import { Context } from '../core/context';
import { parse, STANDARD_PROPERTIES } from './parse';
import { BorderStyles } from './grouped/border-styles';
import { BackgroundStyles } from './grouped/background-styles';
import { FontStyles } from './grouped/font-styles';
import { LayoutStyles } from './grouped/layout-styles';

// Descriptors referenced by the special-case declarations below and by the
// pseudo/counter declaration classes.
import { position, POSITION } from './property-descriptors/position';
import { visibility, VISIBILITY } from './property-descriptors/visibility';
import { letterSpacing } from './property-descriptors/letter-spacing';
import { lineBreak } from './property-descriptors/line-break';
import { listStyleImage } from './property-descriptors/list-style-image';
import { listStylePosition } from './property-descriptors/list-style-position';
import { listStyleType } from './property-descriptors/list-style-type';
import { opacity } from './property-descriptors/opacity';
import { textShadow } from './property-descriptors/text-shadow';
import { textTransform } from './property-descriptors/text-transform';
import { textDecorationStyle } from './property-descriptors/text-decoration-style';
import { textDecorationThickness } from './property-descriptors/text-decoration-thickness';
import { textUnderlineOffset } from './property-descriptors/text-underline-offset';
import { paintOrder } from './property-descriptors/paint-order';
import { webkitLineClamp } from './property-descriptors/webkit-line-clamp';
import { wordBreak } from './property-descriptors/word-break';
import { whiteSpace } from './property-descriptors/white-space';
import { writingMode } from './property-descriptors/writing-mode';
import { zIndex } from './property-descriptors/z-index';
import { MixBlendMode } from './property-descriptors/mix-blend-mode';
import { filter } from './property-descriptors/filter';
import { zoom } from './property-descriptors/zoom';
import { ClipPathValue } from './property-descriptors/clip-path';
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
import { backgroundClip } from './property-descriptors/background-clip';
import { backgroundImage } from './property-descriptors/background-image';
import { backgroundOrigin } from './property-descriptors/background-origin';
import { backgroundPosition } from './property-descriptors/background-position';
import { backgroundRepeat } from './property-descriptors/background-repeat';
import { backgroundSize } from './property-descriptors/background-size';
import { boxShadow } from './property-descriptors/box-shadow';
import { direction } from './property-descriptors/direction';
import { display } from './property-descriptors/display';
import { fontFamily } from './property-descriptors/font-family';
import { fontStyle } from './property-descriptors/font-style';
import { fontVariant } from './property-descriptors/font-variant';
import { fontWeight } from './property-descriptors/font-weight';
import { duration } from './property-descriptors/duration';
import { overflowWrap } from './property-descriptors/overflow-wrap';
import { textAlign } from './property-descriptors/text-align';
import { transform } from './property-descriptors/transform';
import { transformOrigin } from './property-descriptors/transform-origin';
import { rotate } from './property-descriptors/rotate';
import { LengthPercentage } from './types/length-percentage';
import { webkitTextStrokeWidth } from './property-descriptors/webkit-text-stroke-width';
import { objectFit } from './property-descriptors/object-fit';
import { textOverflow } from './property-descriptors/text-overflow';
import { imageRendering } from './property-descriptors/image-rendering';
import { fontVariantLigatures } from './property-descriptors/font-variant-ligatures';
import { objectPosition } from './property-descriptors/object-position';
import { backgroundBlendMode } from './property-descriptors/background-blend-mode';
import { borderImageSource } from './property-descriptors/border-image-source';
import { borderImageSlice } from './property-descriptors/border-image-slice';
import { borderImageRepeat } from './property-descriptors/border-image-repeat';
import { boxDecorationBreak } from './property-descriptors/box-decoration-break';
import { type AccentColor } from './property-descriptors/accent-color';
import { type WebkitTextFillColor } from './property-descriptors/webkit-text-fill-color';
import { type ISOLATION } from './property-descriptors/isolation';
import { type OUTLINE_STYLE, type OutlineColor } from './property-descriptors/outline';
import { type FilterValue } from './property-descriptors/filter';
import { type MaskImage, type MaskPosition, type MaskRepeat, type MaskSize } from './property-descriptors/mask';

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
    whiteSpace!: ReturnType<typeof whiteSpace.parse>;
    writingMode!: ReturnType<typeof writingMode.parse>;
    zIndex!: ReturnType<typeof zIndex.parse>;
    objectFit!: ReturnType<typeof objectFit.parse>;
    imageRendering!: ReturnType<typeof imageRendering.parse>;
    mixBlendMode!: MixBlendMode;
    filter!: ReturnType<typeof filter.parse>;
    fontVariantLigatures!: ReturnType<typeof fontVariantLigatures.parse>;
    zoom!: ReturnType<typeof zoom.parse>;
    objectPosition!: ReturnType<typeof objectPosition.parse>;
    backgroundBlendMode!: ReturnType<typeof backgroundBlendMode.parse>;
    borderImageSource!: ReturnType<typeof borderImageSource.parse>;
    borderImageSlice!: ReturnType<typeof borderImageSlice.parse>;
    borderImageRepeat!: ReturnType<typeof borderImageRepeat.parse>;
    boxDecorationBreak!: ReturnType<typeof boxDecorationBreak.parse>;
    accentColor!: AccentColor;
    webkitTextFillColor!: WebkitTextFillColor;
    isolation!: ISOLATION;
    outlineColor!: OutlineColor;
    outlineStyle!: OUTLINE_STYLE;
    outlineWidth!: number;
    outlineOffset!: number;
    backdropFilter!: FilterValue;
    maskImage!: MaskImage;
    maskPosition!: MaskPosition;
    maskRepeat!: MaskRepeat;
    maskSize!: MaskSize;

    // ── Grouped read-only accessors ──────────────────────────────
    private _border?: BorderStyles;
    private _background?: BackgroundStyles;
    private _font?: FontStyles;
    private _layout?: LayoutStyles;

    get border(): BorderStyles {
        return this._border ?? (this._border = new BorderStyles(this));
    }
    get background(): BackgroundStyles {
        return this._background ?? (this._background = new BackgroundStyles(this));
    }
    get font(): FontStyles {
        return this._font ?? (this._font = new FontStyles(this));
    }
    get layout(): LayoutStyles {
        return this._layout ?? (this._layout = new LayoutStyles(this));
    }

    constructor(context: Context, declaration: CSSStyleDeclaration) {
        // Fast path: display:none elements are invisible and their descendants
        // are never rendered. Parse only initial values instead of full computed styles.
        if (declaration.display === 'none') {
            this.display = DISPLAY.NONE;
            for (const [key, descriptor] of STANDARD_PROPERTIES) {
                if (key !== 'display') {
                    (this as Record<string, unknown>)[key] = parse(context, descriptor, undefined);
                }
            }
            Object.assign(this, parseSpecialDeclarations(context, null));
            return;
        }

        for (const [key, descriptor, cssProp] of STANDARD_PROPERTIES) {
            (this as Record<string, unknown>)[key] = parse(
                context,
                descriptor,
                (declaration as unknown as Record<string, string | undefined>)[cssProp]
            );
        }

        // Special cases that need different CSS property names or fallback values
        Object.assign(this, parseSpecialDeclarations(context, declaration));
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

/**
 * Special cases that need different CSS property names or fallback values.
 * Shared by the full parse path and the display:none fast path (which passes
 * `null` to fall back to initial values).
 */
const parseSpecialDeclarations = (context: Context, declaration: CSSStyleDeclaration | null) => {
    const value = (prop: string, fallback?: string): string | undefined => {
        if (!declaration) {
            return undefined;
        }
        const source = declaration as unknown as Record<string, string | undefined>;
        return source[prop] ?? fallback;
    };

    // overflow returns a tuple that must be split into X/Y
    const overflowTuple = parse(context, overflow, value('overflow'));
    return {
        float: parse(context, float, value('cssFloat')),
        textDecorationColor: parse(context, textDecorationColor, value('textDecorationColor', value('color'))),
        textDecorationLine: parse(context, textDecorationLine, value('textDecorationLine', value('textDecoration'))),
        overflowX: overflowTuple[0],
        overflowY: overflowTuple[overflowTuple.length > 1 ? 1 : 0]
    };
};

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
