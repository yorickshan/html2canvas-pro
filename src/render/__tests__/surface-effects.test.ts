import { ElementPaint } from '../stacking-context';
import { EffectTarget, FilterEffect, IElementEffect, OpacityEffect } from '../effects';
import { OVERFLOW } from '../../css/property-descriptors/overflow';
import { POSITION } from '../../css/property-descriptors/position';

const paint = (effects: IElementEffect[], parent: ElementPaint | null = null): ElementPaint =>
    Object.assign(Object.create(ElementPaint.prototype), {
        effects,
        parent,
        container: { styles: { position: POSITION.STATIC, overflowX: OVERFLOW.VISIBLE, overflowY: OVERFLOW.VISIBLE } }
    });

describe('intermediate-surface effect boundary', () => {
    it('applies root filter/opacity only at composition and retains descendant effects', () => {
        const ancestorOpacity = new OpacityEffect(0.6);
        const rootOpacity = new OpacityEffect(0.5);
        const rootFilter = new FilterEffect('blur(4px)');
        const childOpacity = new OpacityEffect(0.4);
        const ancestor = paint([ancestorOpacity]);
        const root = paint([rootOpacity, rootFilter], ancestor);
        const child = paint([childOpacity], root);
        expect(root.getEffects(EffectTarget.CONTENT, root)).toEqual([]);
        expect(child.getEffects(EffectTarget.CONTENT, root)).toEqual([childOpacity]);
        expect(child.getEffects(EffectTarget.CONTENT)).toEqual([
            ancestorOpacity,
            rootOpacity,
            rootFilter,
            childOpacity
        ]);
    });

    it('gives a nested surface its own boundary without mutating either effect list', () => {
        const outerFilter = new FilterEffect('blur(2px)');
        const innerFilter = new FilterEffect('blur(4px)');
        const outer = paint([outerFilter]);
        const inner = paint([innerFilter], outer);
        const leaf = paint([], inner);
        expect(leaf.getEffects(EffectTarget.CONTENT, inner)).toEqual([]);
        expect(inner.getEffects(EffectTarget.CONTENT, outer)).toEqual([innerFilter]);
        expect(outer.effects).toEqual([outerFilter]);
        expect(inner.effects).toEqual([innerFilter]);
    });
});
