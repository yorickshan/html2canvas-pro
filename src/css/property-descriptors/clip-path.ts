import { IPropertyValueDescriptor, PropertyDescriptorParsingType } from '../IPropertyDescriptor';
import { CSSValue, isIdentToken, isIdentWithValue, nonWhiteSpace, parseFunctionArgs } from '../syntax/parser';
import { StringValueToken, TokenType } from '../syntax/tokenizer';
import {
    LengthPercentage,
    FIFTY_PERCENT,
    HUNDRED_PERCENT,
    ZERO_LENGTH,
    isLengthPercentage
} from '../types/length-percentage';
import { Context } from '../../core/context';

export const enum CLIP_PATH_TYPE {
    NONE = 0,
    INSET = 1,
    CIRCLE = 2,
    ELLIPSE = 3,
    POLYGON = 4,
    PATH = 5
}

/** Radius keyword or length-percentage for circle/ellipse. */
export type ShapeRadius = LengthPercentage | 'closest-side' | 'farthest-side';

export interface NoneClipPath {
    type: CLIP_PATH_TYPE.NONE;
}

/**
 * inset(top right bottom left [ round <border-radius> ]?)
 * Amounts to cut from each side of the reference box.
 */
export interface InsetClipPath {
    type: CLIP_PATH_TYPE.INSET;
    top: LengthPercentage;
    right: LengthPercentage;
    bottom: LengthPercentage;
    left: LengthPercentage;
}

/**
 * circle( [ <shape-radius> ]? [ at <position> ]? )
 */
export interface CircleClipPath {
    type: CLIP_PATH_TYPE.CIRCLE;
    radius: ShapeRadius;
    cx: LengthPercentage;
    cy: LengthPercentage;
}

/**
 * ellipse( [ <shape-radius>{2} ]? [ at <position> ]? )
 */
export interface EllipseClipPath {
    type: CLIP_PATH_TYPE.ELLIPSE;
    rx: ShapeRadius;
    ry: ShapeRadius;
    cx: LengthPercentage;
    cy: LengthPercentage;
}

/**
 * polygon( [ <fill-rule>, ]? [ <length-percentage> <length-percentage> ]# )
 */
export interface PolygonClipPath {
    type: CLIP_PATH_TYPE.POLYGON;
    points: [LengthPercentage, LengthPercentage][];
}

/**
 * path( [ <fill-rule>, ]? <string> )
 * The string contains SVG path data in the element's local coordinate space.
 */
export interface PathClipPath {
    type: CLIP_PATH_TYPE.PATH;
    d: string;
}

export type ClipPathValue =
    | NoneClipPath
    | InsetClipPath
    | CircleClipPath
    | EllipseClipPath
    | PolygonClipPath
    | PathClipPath;

const NONE: NoneClipPath = { type: CLIP_PATH_TYPE.NONE };

/**
 * Parse a shape-radius token: <length-percentage> | closest-side | farthest-side.
 * Defaults to 'closest-side' when no tokens are provided.
 */
const parseShapeRadius = (tokens: CSSValue[]): ShapeRadius => {
    const [first] = tokens;
    if (!first) return 'closest-side';
    if (isIdentToken(first)) {
        // Any unrecognised keyword (e.g. 'closest-corner') intentionally falls back to
        // 'closest-side' as the CSS spec requires unknown values to be treated as invalid
        // and the initial value of <shape-radius> is 'closest-side'.
        return first.value === 'farthest-side' ? 'farthest-side' : 'closest-side';
    }
    return isLengthPercentage(first) ? first : 'closest-side';
};

/**
 * Parse a CSS <position> as (cx, cy), each as a LengthPercentage.
 *
 * Supports the **1–2 value** subset of the CSS `<position>` syntax.
 * The 4-value form (`at left 10px top 20px`) is not supported and will be
 * parsed on a best-effort basis.
 *
 * Axis assignment rules:
 *   - `left` / `right`  → x-axis (cx)
 *   - `top`  / `bottom` → y-axis (cy)
 *   - `center` or a <length-percentage> → fills the first unset axis, in order
 *
 * Examples:
 *   "at left"        → cx=0,    cy=50%   (left is x; y defaults to center)
 *   "at top"         → cx=50%,  cy=0     (top is y; x defaults to center)
 *   "at center 30%"  → cx=50%,  cy=30%
 *   "at 30% center"  → cx=30%,  cy=50%
 *   "at left top"    → cx=0,    cy=0
 *   "at top left"    → cx=0,    cy=0     (keyword order is irrelevant)
 *
 * Unset axes fall back to 50%.
 */
const parsePosition = (tokens: CSSValue[]): { cx: LengthPercentage; cy: LengthPercentage } => {
    let cx: LengthPercentage | null = null;
    let cy: LengthPercentage | null = null;

    for (const token of tokens) {
        if (isIdentToken(token)) {
            switch (token.value) {
                case 'left':
                    cx = ZERO_LENGTH;
                    break;
                case 'right':
                    cx = HUNDRED_PERCENT;
                    break;
                case 'top':
                    cy = ZERO_LENGTH;
                    break;
                case 'bottom':
                    cy = HUNDRED_PERCENT;
                    break;
                case 'center':
                    // `center` fills whichever axis has not yet been claimed.
                    if (cx === null) cx = FIFTY_PERCENT;
                    else if (cy === null) cy = FIFTY_PERCENT;
                    break;
            }
        } else if (isLengthPercentage(token)) {
            // Length-percentages are assigned in source order.
            if (cx === null) cx = token;
            else if (cy === null) cy = token;
        }
    }

    return { cx: cx ?? FIFTY_PERCENT, cy: cy ?? FIFTY_PERCENT };
};

/**
 * inset( <length-percentage>{1,4} [ round <'border-radius'> ]? )
 * The 1-4 shorthand follows the same expansion as margin/padding:
 *   1 value  → all four sides
 *   2 values → top/bottom | left/right
 *   3 values → top | left/right | bottom
 *   4 values → top | right | bottom | left
 * The optional `round` clause (border-radius) is parsed but ignored.
 */
const parseInset = (values: CSSValue[]): InsetClipPath => {
    const lengths: LengthPercentage[] = [];
    for (const token of values) {
        if (token.type === TokenType.WHITESPACE_TOKEN) continue;
        if (isIdentToken(token) && token.value === 'round') break;
        if (isLengthPercentage(token)) lengths.push(token);
    }
    const v0 = lengths[0] ?? ZERO_LENGTH;
    const v1 = lengths[1] ?? v0;
    const v2 = lengths[2] ?? v0;
    const v3 = lengths[3] ?? v1;
    return { type: CLIP_PATH_TYPE.INSET, top: v0, right: v1, bottom: v2, left: v3 };
};

/**
 * circle( [ <shape-radius> ]? [ at <position> ]? )
 */
const parseCircle = (values: CSSValue[]): CircleClipPath => {
    const nonWs = values.filter(nonWhiteSpace);
    const atIdx = nonWs.findIndex((t) => isIdentWithValue(t, 'at'));
    const radiusTokens = atIdx === -1 ? nonWs : nonWs.slice(0, atIdx);
    const posTokens = atIdx === -1 ? [] : nonWs.slice(atIdx + 1);
    return {
        type: CLIP_PATH_TYPE.CIRCLE,
        radius: parseShapeRadius(radiusTokens),
        ...parsePosition(posTokens)
    };
};

/**
 * ellipse( [ <shape-radius>{2} ]? [ at <position> ]? )
 */
const parseEllipse = (values: CSSValue[]): EllipseClipPath => {
    const nonWs = values.filter(nonWhiteSpace);
    const atIdx = nonWs.findIndex((t) => isIdentWithValue(t, 'at'));
    const radiusTokens = atIdx === -1 ? nonWs : nonWs.slice(0, atIdx);
    const posTokens = atIdx === -1 ? [] : nonWs.slice(atIdx + 1);
    return {
        type: CLIP_PATH_TYPE.ELLIPSE,
        rx: parseShapeRadius(radiusTokens.slice(0, 1)),
        ry: parseShapeRadius(radiusTokens.slice(1, 2)),
        ...parsePosition(posTokens)
    };
};

/**
 * polygon( [ <fill-rule>, ]? [ <length-percentage> <length-percentage> ]# )
 * Each comma-separated group defines one vertex (x y).
 * A leading fill-rule keyword (nonzero/evenodd) is skipped.
 */
const parsePolygon = (values: CSSValue[]): PolygonClipPath => {
    const args = parseFunctionArgs(values);
    const points: [LengthPercentage, LengthPercentage][] = [];
    for (const arg of args) {
        if (arg.length === 1 && isIdentToken(arg[0])) continue; // skip fill-rule
        const lengths = arg.filter(isLengthPercentage);
        if (lengths.length >= 2) {
            points.push([lengths[0], lengths[1]]);
        }
    }
    return { type: CLIP_PATH_TYPE.POLYGON, points };
};

/**
 * path( [ <fill-rule>, ]? <string> )
 * The string value is the SVG path data (coordinates in the element's local space).
 */
const parsePath = (values: CSSValue[]): PathClipPath | NoneClipPath => {
    const stringToken = values.find((t) => t.type === TokenType.STRING_TOKEN) as StringValueToken | undefined;
    if (!stringToken) return NONE;
    return { type: CLIP_PATH_TYPE.PATH, d: stringToken.value };
};

export const clipPath: IPropertyValueDescriptor<ClipPathValue> = {
    name: 'clip-path',
    initialValue: 'none',
    prefix: false,
    type: PropertyDescriptorParsingType.VALUE,
    parse: (_context: Context, token: CSSValue): ClipPathValue => {
        if (isIdentToken(token) && token.value === 'none') {
            return NONE;
        }

        if (token.type === TokenType.FUNCTION) {
            switch (token.name) {
                case 'inset':
                    return parseInset(token.values);
                case 'circle':
                    return parseCircle(token.values);
                case 'ellipse':
                    return parseEllipse(token.values);
                case 'polygon':
                    return parsePolygon(token.values);
                case 'path':
                    return parsePath(token.values);
            }
        }

        return NONE;
    }
};
