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
    /** Shadow params for drop-shadow(), if present. */
    readonly shadow?: { offsetX: number; offsetY: number; blur: number; color: string };

    constructor(filterString: string) {
        // Parse drop-shadow(...) out of the filter string so we can render it
        // via ctx.shadow* instead of ctx.filter (which taints the canvas).
        const dropShadowMatch = filterString.match(
            /drop-shadow\(\s*([\d.-]+)(px)?\s+([\d.-]+)(px)?\s+([\d.-]+)(px)?\s+(.+?)\s*\)/
        );
        if (dropShadowMatch) {
            this.shadow = {
                offsetX: parseFloat(dropShadowMatch[1]),
                offsetY: parseFloat(dropShadowMatch[3]),
                blur: parseFloat(dropShadowMatch[5]),
                color: dropShadowMatch[7].trim()
            };
            this.safeFilterString = filterString.replace(/drop-shadow\([^)]+\)\s*/g, '').trim();
        } else {
            this.safeFilterString = filterString;
        }
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
