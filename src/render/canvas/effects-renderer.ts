/**
 * Effects Renderer
 *
 * Handles rendering effects including:
 * - Opacity effects
 * - Transform effects (matrix transformations)
 * - Clip effects (overflow / border-radius clipping via Path[])
 * - Clip-path effects (CSS clip-path shapes: inset, circle, ellipse, polygon, path)
 * - Blend effects (mix-blend-mode)
 * - Filter effects (CSS filter functions)
 */

import {
    IElementEffect,
    isBlendEffect,
    isClipEffect,
    isClipPathEffect,
    isFilterEffect,
    isOpacityEffect,
    isTransformEffect
} from '../effects';
import { Path } from '../path';

/**
 * Dependencies required for EffectsRenderer
 */
export interface EffectsRendererDependencies {
    ctx: CanvasRenderingContext2D;
}

/**
 * Path callback for clip effects
 */
export interface EffectsPathCallback {
    path(paths: Path[]): void;
}

/**
 * Effects Renderer
 *
 * Manages rendering effects stack including opacity, transforms, and clipping.
 * Extracted from CanvasRenderer to improve code organization and maintainability.
 *
 * ## Save/restore optimisation
 *
 * Canvas `save()` / `restore()` snapshot and restore the entire canvas state
 * (transform matrix, clip region, compositing mode, filter, shadow, …) which
 * is relatively expensive. The old implementation called `save()` / `restore()`
 * for every single effect unconditionally.
 *
 * This implementation does a **batch pre-scan** before applying effects:
 *
 * | Effect type        | Modifies             | Reversible?   | Needs save? |
 * |--------------------|----------------------|---------------|-------------|
 * | TransformEffect     | transform matrix     | ❌ irreversible | **YES**     |
 * | ClipEffect         | clip region          | ❌ cumulative   | **YES**     |
 * | ClipPathEffect     | clip region          | ❌ cumulative   | **YES**     |
 * | OpacityEffect      | globalAlpha          | ✅ scalar       | NO          |
 * | BlendEffect        | globalCompositeOp    | ✅ scalar       | NO          |
 * | FilterEffect       | filter + shadow      | ✅ string+vec   | NO          |
 *
 * When the batch contains *only* lightweight effects (opacity / blend / filter)
 * we skip `save()` entirely and manually reset properties on pop.
 *
 * When the batch contains at least one heavyweight effect (transform / clip /
 * clip-path) we call `save()` **once** before the first heavyweight effect and
 * `restore()` **once** when that effect is popped.
 */
export class EffectsRenderer {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly pathCallback: EffectsPathCallback;
    private readonly activeEffects: IElementEffect[] = [];
    /** Whether a canvas state save was performed for the current batch. */
    private didSave = false;
    /** Index (0-based, from start of activeEffects array) of the last
     *  heavyweight effect in the batch — the one whose pop triggers
     *  restore(). Set to -1 when no save was performed. */
    private saveAtDepth = -1;

    constructor(deps: EffectsRendererDependencies, pathCallback: EffectsPathCallback) {
        this.ctx = deps.ctx;
        this.pathCallback = pathCallback;
    }

    /**
     * Apply multiple effects.
     * Clears existing effects and applies new ones.
     */
    applyEffects(effects: IElementEffect[]): void {
        // ── 1. Pop all previously active effects ──────────────────────
        while (this.activeEffects.length) {
            this.popEffect();
        }

        // ── 2. Determine whether to save canvas state ─────────────────
        this.didSave = false;
        this.saveAtDepth = -1;

        const isHeavy = (e: IElementEffect) => isTransformEffect(e) || isClipEffect(e) || isClipPathEffect(e);

        // Pre-compute the index of the *last* heavyweight effect so pop
        // can reliably match it regardless of how many heavyweight effects
        // are in the batch (the save was issued before the first, but the
        // restore must happen when the LAST heavyweight is popped).
        const lastHeavyIdx = effects.reduceRight<number>(
            (found, e, idx) => (found !== -1 ? found : isHeavy(e) ? idx : -1),
            -1
        );

        // ── 3. Apply each effect ──────────────────────────────────────
        for (let i = 0; i < effects.length; i++) {
            const effect = effects[i];
            if (isHeavy(effect)) {
                if (!this.didSave) {
                    this.ctx.save();
                    this.didSave = true;
                }
                if (i === lastHeavyIdx) {
                    this.saveAtDepth = this.activeEffects.length;
                }
            }
            this.applyEffect(effect);
        }
    }

    /**
     * Apply a single effect (called internally by applyEffects).
     */
    private applyEffect(effect: IElementEffect): void {
        if (isTransformEffect(effect)) {
            this.ctx.translate(effect.offsetX, effect.offsetY);
            this.ctx.transform(
                effect.matrix[0],
                effect.matrix[1],
                effect.matrix[2],
                effect.matrix[3],
                effect.matrix[4],
                effect.matrix[5]
            );
            this.ctx.translate(-effect.offsetX, -effect.offsetY);
        } else if (isClipEffect(effect)) {
            this.pathCallback.path(effect.path);
            this.ctx.clip();
        } else if (isClipPathEffect(effect)) {
            effect.applyClip(this.ctx);
        } else if (isOpacityEffect(effect)) {
            // Multiply into current globalAlpha so nested opacity works
            // without save/restore overhead.
            this.ctx.globalAlpha *= effect.opacity;
        } else if (isBlendEffect(effect)) {
            this.ctx.globalCompositeOperation = effect.compositeOperation;
        } else if (isFilterEffect(effect)) {
            // drop-shadow() is rendered via ctx.shadow* to avoid canvas
            // taint; remaining filters go through ctx.filter.
            this.ctx.filter = effect.safeFilterString || 'none';

            if (effect.shadow) {
                this.ctx.shadowOffsetX = effect.shadow.offsetX;
                this.ctx.shadowOffsetY = effect.shadow.offsetY;
                this.ctx.shadowBlur = effect.shadow.blur;
                this.ctx.shadowColor = effect.shadow.color;
            }
        }

        this.activeEffects.push(effect);
    }

    /**
     * Remove the most recent effect.
     * Restores canvas state if needed.
     */
    private popEffect(): void {
        if (this.activeEffects.length === 0) return;

        // If the effect being popped is the one that triggered the save,
        // restore the canvas state now.
        if (this.didSave && this.activeEffects.length - 1 === this.saveAtDepth) {
            this.ctx.restore();
            this.didSave = false;
            this.saveAtDepth = -1;
        }

        this.activeEffects.pop();

        // If the batch had ONLY lightweight effects (no save was performed),
        // reset properties to their defaults. We only do this when all effects
        // have been popped (activeEffects is empty), so properties don't
        // flip mid-batch.
        if (!this.didSave && this.activeEffects.length === 0) {
            this.ctx.globalAlpha = 1;
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.filter = 'none';
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
            this.ctx.shadowBlur = 0;
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0)';
        }
    }

    /**
     * Get the current number of active effects.
     */
    getActiveEffectCount(): number {
        return this.activeEffects.length;
    }

    /**
     * Check if there are any active effects.
     */
    hasActiveEffects(): boolean {
        return this.activeEffects.length > 0;
    }
}
