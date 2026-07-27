/**
 * Drop-shadow integration test
 * Verifies complete rendering pipeline from CSS filter to canvas shadow
 */

import { strictEqual, ok } from 'assert';
import { FilterEffect } from '../../effects';
import { EffectsRenderer } from '../effects-renderer';

describe('drop-shadow integration (Issue #223)', () => {
    it('should set shadow properties before element drawing', () => {
        const drawCalls: string[] = [];
        const ctx = {
            fillStyle: '',
            strokeStyle: '',
            filter: 'none',
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowBlur: 0,
            shadowColor: '',
            save() {
                drawCalls.push('save');
            },
            restore() {
                drawCalls.push('restore');
            },
            fillRect(x: number, y: number, w: number, h: number) {
                // Verify shadow is set when drawing happens
                drawCalls.push(`fillRect(${x},${y},${w},${h})`);
                drawCalls.push(
                    `shadow:(${this.shadowOffsetX},${this.shadowOffsetY},${this.shadowBlur},${this.shadowColor})`
                );
            },
            strokeRect() {
                drawCalls.push('strokeRect');
            }
        } as unknown as CanvasRenderingContext2D;

        const renderer = new EffectsRenderer({ ctx }, { path: (_paths: unknown[]) => {} });

        // Apply drop-shadow filter
        const filter = new FilterEffect('drop-shadow(10px 10px 5px rgba(0,0,0,0.5))');
        renderer.applyEffects([filter]);

        // Verify shadow is set
        strictEqual(ctx.shadowOffsetX, 10);
        strictEqual(ctx.shadowOffsetY, 10);
        strictEqual(ctx.shadowBlur, 5);
        strictEqual(ctx.shadowColor, 'rgba(0,0,0,0.5)');

        // Draw the element (simulating what canvas-renderer does)
        ctx.fillRect(0, 0, 50, 50);

        // Verify shadow was set during drawing
        ok(
            drawCalls.some((c) => c.includes('shadow:(10,10,5,rgba(0,0,0,0.5))')),
            'shadow should be set when fillRect is called'
        );

        // Clear effects
        renderer.applyEffects([]);

        // Shadow should be reset
        strictEqual(ctx.shadowOffsetX, 0);
        strictEqual(ctx.shadowOffsetY, 0);
    });

    it('should handle multiple consecutive draw calls with shadow', () => {
        const ctx = {
            fillStyle: '',
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowBlur: 0,
            shadowColor: '',
            save() {},
            restore() {},
            fillRect() {}
        } as unknown as CanvasRenderingContext2D;

        const renderer = new EffectsRenderer({ ctx }, { path: (_paths: unknown[]) => {} });

        // Apply effect and draw multiple elements
        const filter = new FilterEffect('drop-shadow(5px 5px 3px red)');
        renderer.applyEffects([filter]);

        // Shadow should persist across multiple draw calls
        ctx.fillRect(0, 0, 10, 10);
        strictEqual(ctx.shadowOffsetX, 5);

        ctx.fillRect(20, 0, 10, 10);
        strictEqual(ctx.shadowOffsetX, 5);

        ctx.fillRect(40, 0, 10, 10);
        strictEqual(ctx.shadowOffsetX, 5);

        // Clear
        renderer.applyEffects([]);
        strictEqual(ctx.shadowOffsetX, 0);
    });

    it('should update shadow when filter changes', () => {
        const ctx = {
            fillStyle: '',
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowBlur: 0,
            shadowColor: '',
            save() {},
            restore() {},
            fillRect() {}
        } as unknown as CanvasRenderingContext2D;

        const renderer = new EffectsRenderer({ ctx }, { path: (_paths: unknown[]) => {} });

        // First filter
        renderer.applyEffects([new FilterEffect('drop-shadow(2px 2px 1px black)')]);
        strictEqual(ctx.shadowOffsetX, 2);
        strictEqual(ctx.shadowColor, 'black');

        // Change to different filter
        renderer.applyEffects([new FilterEffect('drop-shadow(8px 8px 4px blue)')]);
        strictEqual(ctx.shadowOffsetX, 8);
        strictEqual(ctx.shadowColor, 'blue');

        // Clear
        renderer.applyEffects([]);
        strictEqual(ctx.shadowOffsetX, 0);
    });
});
