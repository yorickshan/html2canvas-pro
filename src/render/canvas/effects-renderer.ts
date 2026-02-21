/**
 * Effects Renderer
 *
 * Handles rendering effects including:
 * - Opacity effects
 * - Transform effects (matrix transformations)
 * - Clip effects (clipping paths)
 */

import { IElementEffect, isOpacityEffect, isTransformEffect, isClipEffect } from '../effects';
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

        // Apply opacity effect
        if (isOpacityEffect(effect)) {
            this.ctx.globalAlpha = effect.opacity;
        }

        // Apply transform effect
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
        }

        // Apply clip effect
        if (isClipEffect(effect)) {
            this.pathCallback.path(effect.path);
            this.ctx.clip();
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
