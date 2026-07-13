import { Matrix } from '../css/property-descriptors/transform';
import { MixBlendMode, MIX_BLEND_MODE } from '../css/property-descriptors/mix-blend-mode';
import { Path } from './path';

export const enum EffectType {
    TRANSFORM = 0,
    CLIP = 1,
    OPACITY = 2,
    CLIP_PATH = 3,
    BLEND = 4,
    FILTER = 5
}

export const enum EffectTarget {
    BACKGROUND_BORDERS = 1 << 1,
    CONTENT = 1 << 2
}

export interface IElementEffect {
    readonly type: EffectType;
    readonly target: number;
}

export class TransformEffect implements IElementEffect {
    readonly type: EffectType = EffectType.TRANSFORM;
    readonly target: number = EffectTarget.BACKGROUND_BORDERS | EffectTarget.CONTENT;

    constructor(
        readonly offsetX: number,
        readonly offsetY: number,
        readonly matrix: Matrix
    ) {}
}

export class ClipEffect implements IElementEffect {
    readonly type: EffectType = EffectType.CLIP;

    constructor(
        readonly path: Path[],
        readonly target: EffectTarget
    ) {}
}

export class OpacityEffect implements IElementEffect {
    readonly type: EffectType = EffectType.OPACITY;
    readonly target: number = EffectTarget.BACKGROUND_BORDERS | EffectTarget.CONTENT;

    constructor(readonly opacity: number) {}
}

/**
 * Clips the element and all its descendants to an arbitrary canvas-drawn shape.
 * The `applyClip` callback is responsible for calling beginPath, the shape
 * operations, and ctx.clip() — giving each shape type full control over how
 * the path is constructed (arc, ellipse, lineTo, Path2D, etc.).
 */
export class ClipPathEffect implements IElementEffect {
    readonly type: EffectType = EffectType.CLIP_PATH;
    readonly target: number = EffectTarget.BACKGROUND_BORDERS | EffectTarget.CONTENT;

    constructor(readonly applyClip: (ctx: CanvasRenderingContext2D) => void) {}
}

/**
 * Maps a CSS mix-blend-mode value to the corresponding Canvas {@link GlobalCompositeOperation}.
 * All CSS blend mode values are supported by the Canvas 2D API except 'normal',
 * which maps to the default 'source-over'.
 */
const MIX_BLEND_MODE_TO_COMPOSITE: Record<MixBlendMode, GlobalCompositeOperation> = {
    [MIX_BLEND_MODE.NORMAL]: 'source-over',
    [MIX_BLEND_MODE.MULTIPLY]: 'multiply',
    [MIX_BLEND_MODE.SCREEN]: 'screen',
    [MIX_BLEND_MODE.OVERLAY]: 'overlay',
    [MIX_BLEND_MODE.DARKEN]: 'darken',
    [MIX_BLEND_MODE.LIGHTEN]: 'lighten',
    [MIX_BLEND_MODE.COLOR_DODGE]: 'color-dodge',
    [MIX_BLEND_MODE.COLOR_BURN]: 'color-burn',
    [MIX_BLEND_MODE.HARD_LIGHT]: 'hard-light',
    [MIX_BLEND_MODE.SOFT_LIGHT]: 'soft-light',
    [MIX_BLEND_MODE.DIFFERENCE]: 'difference',
    [MIX_BLEND_MODE.EXCLUSION]: 'exclusion',
    [MIX_BLEND_MODE.HUE]: 'hue',
    [MIX_BLEND_MODE.SATURATION]: 'saturation',
    [MIX_BLEND_MODE.COLOR]: 'color',
    [MIX_BLEND_MODE.LUMINOSITY]: 'luminosity'
};

export class BlendEffect implements IElementEffect {
    readonly type: EffectType = EffectType.BLEND;
    readonly target: number = EffectTarget.BACKGROUND_BORDERS | EffectTarget.CONTENT;
    readonly compositeOperation: GlobalCompositeOperation;

    constructor(readonly mixBlendMode: MixBlendMode) {
        this.compositeOperation = MIX_BLEND_MODE_TO_COMPOSITE[mixBlendMode];
    }
}

export class FilterEffect implements IElementEffect {
    readonly type: EffectType = EffectType.FILTER;
    readonly target: number = EffectTarget.BACKGROUND_BORDERS | EffectTarget.CONTENT;

    /** CSS filter string with drop-shadow() stripped (safe for ctx.filter). */
    readonly safeFilterString: string;
    /** Shadow params for drop-shadow(), if present and successfully parsed. */
    readonly shadow?: { offsetX: number; offsetY: number; blur: number; color: string };

    constructor(filterString: string) {
        const parsed = FilterEffect.parseDropShadow(filterString);
        this.shadow = parsed.shadow;
        this.safeFilterString = parsed.safeFilterString;
    }

    /**
     * Parse a CSS filter string, extracting drop-shadow() parameters for
     * rendering via ctx.shadow* (which avoids canvas taint), and producing
     * a safe filter string with all drop-shadow() calls removed.
     *
     * Uses paren-depth tracking to correctly handle nested function
     * arguments — e.g. rgba() / hsla() inside drop-shadow() — which
     * the previous regex-based approach ([^)]+) could not handle.
     *
     * Per CSS spec the shadow value is: <color>? && <length>{2,3}
     * (components can appear in any order).
     */
    private static parseDropShadow(filterString: string): {
        shadow?: { offsetX: number; offsetY: number; blur: number; color: string };
        safeFilterString: string;
    } {
        if (!filterString) {
            return { safeFilterString: '' };
        }

        const matches = FilterEffect.findDropShadows(filterString);

        if (matches.length === 0) {
            return { safeFilterString: filterString };
        }

        // Parse the first drop-shadow body to extract shadow params
        const shadow = FilterEffect.parseDropShadowBody(matches[0].body);

        // Build safe filter string by removing ALL drop-shadow() occurrences
        let result = '';
        let lastEnd = 0;
        for (const m of matches) {
            result += filterString.slice(lastEnd, m.start);
            lastEnd = m.end;
        }
        result += filterString.slice(lastEnd);

        return {
            shadow,
            safeFilterString: result.replace(/\s+/g, ' ').trim()
        };
    }

    /**
     * Find all drop-shadow() function calls in a CSS filter string.
     * Uses paren-depth tracking to correctly skip over nested
     * parentheses (e.g. rgba(0, 0, 0, 0.15)).
     */
    private static findDropShadows(str: string): Array<{ body: string; start: number; end: number }> {
        const results: Array<{ body: string; start: number; end: number }> = [];
        const re = /drop-shadow\(/gi;
        let m: RegExpExecArray | null;

        while ((m = re.exec(str)) !== null) {
            const openParen = m.index + 'drop-shadow('.length - 1; // position of '('
            const start = m.index;

            let depth = 1;
            let pos = openParen + 1;

            while (pos < str.length && depth > 0) {
                const ch = str[pos];
                if (ch === '(') depth++;
                else if (ch === ')') depth--;
                pos++;
            }

            if (depth !== 0) break; // malformed — stop scanning

            const body = str.slice(openParen + 1, pos - 1);
            results.push({ body, start, end: pos });
        }

        return results;
    }

    /**
     * Parse the body of a single drop-shadow() function.
     * Body format (order-independent): <offsetX> <offsetY> [<blur>] [<color>?]
     */
    private static parseDropShadowBody(
        body: string
    ): { offsetX: number; offsetY: number; blur: number; color: string } | undefined {
        const tokens = FilterEffect.tokenizeFilterArgs(body.trim());

        const lengths: number[] = [];
        let color: string | undefined;

        for (const token of tokens) {
            if (FilterEffect.isCSSLength(token)) {
                lengths.push(parseFloat(token));
            } else if (token) {
                color = token;
            }
        }

        if (lengths.length < 2 || lengths.length > 3) {
            return undefined;
        }

        return {
            offsetX: lengths[0],
            offsetY: lengths[1],
            blur: lengths[2] ?? 0,
            color: color ?? 'rgba(0,0,0,1)'
        };
    }

    /**
     * Split whitespace-separated tokens while keeping parenthesised
     * expressions intact.
     *
     * e.g. "rgba(0, 0, 0, 0.15) 0px 1px 2px"
     *   → ["rgba(0, 0, 0, 0.15)", "0px", "1px", "2px"]
     */
    private static tokenizeFilterArgs(str: string): string[] {
        const tokens: string[] = [];
        let current = '';
        let depth = 0;

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];

            if (ch === '(') {
                depth++;
                current += ch;
            } else if (ch === ')') {
                depth--;
                current += ch;
            } else if (/\s/.test(ch)) {
                if (depth > 0) {
                    current += ch;
                } else if (current) {
                    tokens.push(current);
                    current = '';
                }
            } else {
                current += ch;
            }
        }

        if (current) {
            tokens.push(current);
        }

        return tokens;
    }

    /** True when token looks like a CSS length: number with optional unit. */
    private static isCSSLength(token: string): boolean {
        return /^-?[\d.]+(px|em|rem|pt|cm|mm|in|pc|ex|ch|vw|vh|vmin|vmax|%)?$/i.test(token);
    }
}

export const isTransformEffect = (effect: IElementEffect): effect is TransformEffect =>
    effect.type === EffectType.TRANSFORM;
export const isClipEffect = (effect: IElementEffect): effect is ClipEffect => effect.type === EffectType.CLIP;
export const isOpacityEffect = (effect: IElementEffect): effect is OpacityEffect => effect.type === EffectType.OPACITY;
export const isClipPathEffect = (effect: IElementEffect): effect is ClipPathEffect =>
    effect.type === EffectType.CLIP_PATH;
export const isBlendEffect = (effect: IElementEffect): effect is BlendEffect => effect.type === EffectType.BLEND;
export const isFilterEffect = (effect: IElementEffect): effect is FilterEffect => effect.type === EffectType.FILTER;
