/**
 * Drop-shadow regression tests for Issue #223
 *
 * Problem: drop-shadow is removed from filter string (avoiding taint),
 * but shadow is not actually rendered because popEffect resets shadow
 * properties before drawing happens.
 */

import { strictEqual, ok } from 'assert';
import { EffectsRenderer } from '../effects-renderer';
import { FilterEffect } from '../../effects';

describe('FilterEffect drop-shadow parsing', () => {
    it('should parse drop-shadow with rgba color', () => {
        const fe = new FilterEffect('drop-shadow(10px 10px 2px rgba(0,0,0,1))');
        strictEqual(fe.shadow?.offsetX, 10);
        strictEqual(fe.shadow?.offsetY, 10);
        strictEqual(fe.shadow?.blur, 2);
        strictEqual(fe.shadow?.color, 'rgba(0,0,0,1)');
    });

    it('should parse drop-shadow with rgba color containing spaces', () => {
        // This is the problematic case from Issue #223
        const fe = new FilterEffect('drop-shadow(10px 10px 2px rgba(0, 0, 0, 1))');
        strictEqual(fe.shadow?.offsetX, 10);
        strictEqual(fe.shadow?.offsetY, 10);
        strictEqual(fe.shadow?.blur, 2);
        // Color should include the rgba() part
        ok(fe.shadow?.color?.includes('rgba'), 'color should include rgba');
    });

    it('should parse drop-shadow with named color', () => {
        const fe = new FilterEffect('drop-shadow(5px 5px 3px red)');
        strictEqual(fe.shadow?.offsetX, 5);
        strictEqual(fe.shadow?.offsetY, 5);
        strictEqual(fe.shadow?.blur, 3);
        strictEqual(fe.shadow?.color, 'red');
    });

    it('should parse drop-shadow with hex color', () => {
        const fe = new FilterEffect('drop-shadow(2px 2px 1px #ff0000)');
        strictEqual(fe.shadow?.offsetX, 2);
        strictEqual(fe.shadow?.offsetY, 2);
        strictEqual(fe.shadow?.blur, 1);
        strictEqual(fe.shadow?.color, '#ff0000');
    });

    it('should parse drop-shadow without blur', () => {
        const fe = new FilterEffect('drop-shadow(10px 10px black)');
        strictEqual(fe.shadow?.offsetX, 10);
        strictEqual(fe.shadow?.offsetY, 10);
        strictEqual(fe.shadow?.blur, 0);
        strictEqual(fe.shadow?.color, 'black');
    });

    it('should handle multiple drop-shadows and extract first', () => {
        const fe = new FilterEffect('drop-shadow(1px 1px red) drop-shadow(2px 2px blue)');
        strictEqual(fe.shadow?.offsetX, 1);
        strictEqual(fe.shadow?.color, 'red');
        // safeFilterString should have both removed
        strictEqual(fe.safeFilterString, '');
    });

    it('should handle drop-shadow combined with other filters', () => {
        const fe = new FilterEffect('blur(5px) drop-shadow(10px 10px 2px black) grayscale(50%)');
        strictEqual(fe.shadow?.offsetX, 10);
        strictEqual(fe.safeFilterString, 'blur(5px) grayscale(50%)');
    });
});

describe('EffectsRenderer drop-shadow rendering (Issue #223)', () => {
    const createMockContext = () => {
        const calls: string[] = [];
        return {
            calls,
            fillStyle: '',
            strokeStyle: '',
            filter: 'none',
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowBlur: 0,
            shadowColor: '',
            globalAlpha: 1,
            globalCompositeOperation: 'source-over',
            save() {
                calls.push('save');
            },
            restore() {
                calls.push('restore');
            },
            fillRect(x: number, y: number, w: number, h: number) {
                calls.push(`fillRect(${x},${y},${w},${h})`);
            }
        } as unknown as CanvasRenderingContext2D;
    };

    const createPathCallback = () => ({
        path: () => {}
    });

    it('should preserve drop-shadow properties until after drawing', () => {
        const ctx = createMockContext();
        const renderer = new EffectsRenderer({ ctx }, createPathCallback());

        // Apply drop-shadow effect
        const dropShadow = new FilterEffect('drop-shadow(10px 10px 2px rgba(0,0,0,1))');
        renderer.applyEffects([dropShadow]);

        // Verify shadow properties are set
        strictEqual(ctx.shadowOffsetX, 10);
        strictEqual(ctx.shadowOffsetY, 10);
        strictEqual(ctx.shadowBlur, 2);
        strictEqual(ctx.shadowColor, 'rgba(0,0,0,1)');
        strictEqual(ctx.filter, 'none'); // drop-shadow removed from filter

        // Draw something
        ctx.fillRect(0, 0, 50, 50);

        // Now clear effects (simulating applyEffects being called again)
        renderer.applyEffects([]);

        // Shadow should have been reset after drawing
        strictEqual(ctx.shadowOffsetX, 0);
        strictEqual(ctx.shadowOffsetY, 0);
        strictEqual(ctx.shadowBlur, 0);
        ok(ctx.shadowColor.includes('0, 0, 0, 0') || ctx.shadowColor === '');
    });

    it('should not reset shadow before drawing when re-applying effects', () => {
        const ctx = createMockContext();
        const renderer = new EffectsRenderer({ ctx }, createPathCallback());

        // First apply drop-shadow
        const dropShadow = new FilterEffect('drop-shadow(5px 5px 3px red)');
        renderer.applyEffects([dropShadow]);

        // Shadow is set
        strictEqual(ctx.shadowOffsetX, 5);

        // Simulate: immediately re-apply effects (which happens in html2canvas)
        // This triggers popEffect which was incorrectly resetting shadow
        renderer.applyEffects([dropShadow]);

        // Bug: shadow was reset to 0 here!
        // After fix: shadow should still be 5
        strictEqual(ctx.shadowOffsetX, 5, 'shadow should not be reset before drawing');
        strictEqual(ctx.shadowOffsetY, 5);
        strictEqual(ctx.shadowBlur, 3);
    });

    it('should handle multiple consecutive filter effects', () => {
        const ctx = createMockContext();
        const renderer = new EffectsRenderer({ ctx }, createPathCallback());

        const filter1 = new FilterEffect('drop-shadow(2px 2px 1px black)');
        const filter2 = new FilterEffect('drop-shadow(4px 4px 2px blue)');

        renderer.applyEffects([filter1]);
        strictEqual(ctx.shadowOffsetX, 2);

        // Apply different drop-shadow
        renderer.applyEffects([filter2]);
        strictEqual(ctx.shadowOffsetX, 4, 'shadow should be updated to new value');
        strictEqual(ctx.shadowOffsetY, 4);
    });

    it('should reset all properties when clearing effects', () => {
        const ctx = createMockContext();
        const renderer = new EffectsRenderer({ ctx }, createPathCallback());

        // Apply and then clear
        renderer.applyEffects([new FilterEffect('drop-shadow(10px 10px 5px green)')]);
        ctx.fillRect(0, 0, 50, 50); // Draw with shadow
        renderer.applyEffects([]); // Clear

        // All should be reset
        strictEqual(ctx.filter, 'none');
        strictEqual(ctx.shadowOffsetX, 0);
        strictEqual(ctx.shadowOffsetY, 0);
        strictEqual(ctx.shadowBlur, 0);
    });
});
