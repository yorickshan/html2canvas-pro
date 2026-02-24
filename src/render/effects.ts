import { Matrix } from '../css/property-descriptors/transform';
import { Path } from './path';

export const enum EffectType {
    TRANSFORM = 0,
    CLIP = 1,
    OPACITY = 2,
    CLIP_PATH = 3
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

export const isTransformEffect = (effect: IElementEffect): effect is TransformEffect =>
    effect.type === EffectType.TRANSFORM;
export const isClipEffect = (effect: IElementEffect): effect is ClipEffect => effect.type === EffectType.CLIP;
export const isOpacityEffect = (effect: IElementEffect): effect is OpacityEffect => effect.type === EffectType.OPACITY;
export const isClipPathEffect = (effect: IElementEffect): effect is ClipPathEffect =>
    effect.type === EffectType.CLIP_PATH;
