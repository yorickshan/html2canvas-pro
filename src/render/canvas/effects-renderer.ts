/**
 * Effects Renderer
 *
 * Handles rendering effects including:
 * - Opacity effects
 * - Transform effects (matrix transformations)
 * - Clip effects (overflow / border-radius clipping via Path[])
 * - Clip-path effects (CSS clip-path shapes: inset, circle, ellipse, polygon, path)
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
 */
export class EffectsRenderer {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly pathCallback: EffectsPathCallback;
    private readonly activeEffects: IElementEffect[] = [];

    constructor(deps: EffectsRendererDependencies, pathCallback: EffectsPathCallback) {
        this.ctx = deps.ctx;
        this.pathCallback = pathCallback;
    }

    /**
     * Apply multiple effects
     * Clears existing effects and applies new ones
     *
     * @param effects - Array of effects to apply
     */
    applyEffects(effects: IElementEffect[]): void {
        // Clear all existing effects
        while (this.activeEffects.length) {
            this.popEffect();
        }

        // Apply new effects
        effects.forEach((effect) => this.applyEffect(effect));
    }

    /**
     * Apply a single effect
     *
     * @param effect - Effect to apply
     */
    applyEffect(effect: IElementEffect): void {
        this.ctx.save();

        if (isOpacityEffect(effect)) {
            // Opacity: multiply into the current global alpha for nested transparency.
            this.ctx.globalAlpha = effect.opacity;
        } else if (isTransformEffect(effect)) {
            // Transform: translate to origin, apply matrix, translate back.
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
            // Clip (overflow / border-radius): build path via callback then clip.
            this.pathCallback.path(effect.path);
            this.ctx.clip();
        } else if (isClipPathEffect(effect)) {
            // Clip-path: delegate shape drawing (beginPath … clip()) to the effect.
            effect.applyClip(this.ctx);
        } else if (isBlendEffect(effect)) {
            this.ctx.globalCompositeOperation = effect.compositeOperation;
        } else if (isFilterEffect(effect)) {
            // Apply all filters except drop-shadow() via ctx.filter.
            // drop-shadow() is rendered separately through ctx.shadow*
            // because ctx.filter="drop-shadow(...)" taints the canvas
            // even for same-origin content (Chrome, Firefox).
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
     * Remove the most recent effect
     * Restores the canvas state before the effect was applied
     */
    popEffect(): void {
        this.activeEffects.pop();
        this.ctx.restore();
    }

    /**
     * Get the current number of active effects
     *
     * @returns Number of active effects
     */
    getActiveEffectCount(): number {
        return this.activeEffects.length;
    }

    /**
     * Check if there are any active effects
     *
     * @returns True if there are active effects
     */
    hasActiveEffects(): boolean {
        return this.activeEffects.length > 0;
    }
}
