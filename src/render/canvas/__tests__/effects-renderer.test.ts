import { ok, strictEqual } from 'assert';
import { EffectsRenderer, EffectsRendererDependencies, EffectsPathCallback } from '../effects-renderer';

describe('EffectsRenderer', () => {
    it('should be instantiated', () => {
        const ctx = {
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowBlur: 0,
            shadowColor: '',
            globalAlpha: 1,
            save: () => {},
            restore: () => {}
        } as unknown as CanvasRenderingContext2D;

        const deps: EffectsRendererDependencies = {
            ctx
        };

        const pathCallback: EffectsPathCallback = {
            path: () => {}
        };

        const renderer = new EffectsRenderer(deps, pathCallback);
        ok(renderer);

        // Test public methods exist
        strictEqual(typeof renderer.applyEffects, 'function');
        const internals = renderer as unknown as Record<string, unknown>;
        strictEqual(typeof internals.applyEffect, 'function');
        strictEqual(typeof internals.popEffect, 'function');
    });
});
