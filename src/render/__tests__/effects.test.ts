import { describe, it, expect } from 'vitest';
import {
    TransformEffect,
    ClipEffect,
    OpacityEffect,
    BlendEffect,
    FilterEffect,
    isTransformEffect,
    isClipEffect,
    isOpacityEffect,
    isBlendEffect,
    isFilterEffect,
    EffectType,
    EffectTarget
} from '../effects';

describe('Effect classes', () => {
    describe('TransformEffect', () => {
        it('constructs with offset and matrix', () => {
            const matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
            const effect = new TransformEffect(10, 20, matrix);
            expect(effect.type).toBe(EffectType.TRANSFORM);
            expect(effect.target).toBe(EffectTarget.BACKGROUND_BORDERS | EffectTarget.CONTENT);
        });
    });

    describe('ClipEffect', () => {
        it('constructs with path and target', () => {
            const effect = new ClipEffect([], EffectTarget.CONTENT);
            expect(effect.type).toBe(EffectType.CLIP);
            expect(effect.target).toBe(EffectTarget.CONTENT);
        });
    });

    describe('OpacityEffect', () => {
        it('constructs with opacity value', () => {
            const effect = new OpacityEffect(0.5);
            expect(effect.type).toBe(EffectType.OPACITY);
            expect(effect.opacity).toBe(0.5);
        });
    });

    describe('BlendEffect', () => {
        it('constructs with mix-blend-mode and resolves composite operation', () => {
            const effect = new BlendEffect('multiply' as const);
            expect(effect.type).toBe(EffectType.BLEND);
            expect(effect.compositeOperation).toBe('multiply');
        });
    });

    describe('FilterEffect', () => {
        it('constructs with filter string', () => {
            const effect = new FilterEffect('blur(5px)');
            expect(effect.type).toBe(EffectType.FILTER);
        });

        it('handles empty filter string', () => {
            const effect = new FilterEffect('');
            expect(effect.safeFilterString).toBe('');
            expect(effect.shadow).toBeUndefined();
        });
    });
});

describe('effect type guards', () => {
    it('isTransformEffect identifies TransformEffect', () => {
        const effect = new TransformEffect(0, 0, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
        expect(isTransformEffect(effect)).toBe(true);
        expect(isOpacityEffect(effect)).toBe(false);
        expect(isFilterEffect(effect)).toBe(false);
    });

    it('isClipEffect identifies ClipEffect', () => {
        const effect = new ClipEffect([], EffectTarget.CONTENT);
        expect(isClipEffect(effect)).toBe(true);
        expect(isTransformEffect(effect)).toBe(false);
    });

    it('isOpacityEffect identifies OpacityEffect', () => {
        expect(isOpacityEffect(new OpacityEffect(1))).toBe(true);
    });

    it('isBlendEffect identifies BlendEffect', () => {
        expect(isBlendEffect(new BlendEffect('multiply' as const))).toBe(true);
    });

    it('isFilterEffect identifies FilterEffect', () => {
        expect(isFilterEffect(new FilterEffect('blur(1px)'))).toBe(true);
    });

    it('type guards return false for wrong types', () => {
        const opacity = new OpacityEffect(0.5);
        expect(isTransformEffect(opacity)).toBe(false);
        expect(isClipEffect(opacity)).toBe(false);
        expect(isBlendEffect(opacity)).toBe(false);
        expect(isFilterEffect(opacity)).toBe(false);
    });
});
