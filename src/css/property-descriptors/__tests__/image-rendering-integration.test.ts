import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { IMAGE_RENDERING } from '../image-rendering';

/**
 * Integration tests for image-rendering CSS property
 * Tests actual DOM and canvas rendering behavior
 */
describe('image-rendering integration', () => {
    let container: HTMLDivElement;
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;

    beforeEach(() => {
        // Create test DOM elements
        container = document.createElement('div');
        document.body.appendChild(container);

        // Create canvas for testing
        canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        try {
            ctx = canvas.getContext('2d');
        } catch {
            // JSDOM does not implement getContext('2d') unless canvas npm package is installed
            ctx = null;
        }
    });

    afterEach(() => {
        // Cleanup
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    describe('Canvas context imageSmoothingEnabled', () => {
        it('should default to true', () => {
            if (!ctx) return; // Skip if canvas not available
            expect(ctx.imageSmoothingEnabled).toBe(true);
        });

        it('should be settable to false', () => {
            if (!ctx) return; // Skip if canvas not available
            ctx.imageSmoothingEnabled = false;
            expect(ctx.imageSmoothingEnabled).toBe(false);
        });

        it('should be settable to true', () => {
            if (!ctx) return; // Skip if canvas not available
            ctx.imageSmoothingEnabled = false;
            ctx.imageSmoothingEnabled = true;
            expect(ctx.imageSmoothingEnabled).toBe(true);
        });
    });

    describe('Canvas context imageSmoothingQuality', () => {
        it('should accept "low" value', () => {
            if (!ctx) return; // Skip if canvas not available
            ctx.imageSmoothingQuality = 'low';
            expect(ctx.imageSmoothingQuality).toBe('low');
        });

        it('should accept "medium" value', () => {
            if (!ctx) return; // Skip if canvas not available
            ctx.imageSmoothingQuality = 'medium';
            expect(ctx.imageSmoothingQuality).toBe('medium');
        });

        it('should accept "high" value', () => {
            if (!ctx) return; // Skip if canvas not available
            ctx.imageSmoothingQuality = 'high';
            expect(ctx.imageSmoothingQuality).toBe('high');
        });
    });

    describe('CSS image-rendering property', () => {
        it('should apply pixelated style to img element', () => {
            const img = document.createElement('img');
            img.style.imageRendering = 'pixelated';
            container.appendChild(img);
            expect(img.style.imageRendering).toBe('pixelated');
        });

        it('should apply crisp-edges style to img element', () => {
            const img = document.createElement('img');
            img.style.imageRendering = 'crisp-edges';
            container.appendChild(img);
            expect(img.style.imageRendering).toBe('crisp-edges');
        });

        it('should apply smooth style to img element', () => {
            const img = document.createElement('img');
            img.style.imageRendering = 'smooth';
            container.appendChild(img);
            // Note: Some browsers may normalize this value
            expect(['smooth', 'auto', '']).toContain(img.style.imageRendering);
        });
    });

    describe('IMAGE_RENDERING enum values', () => {
        it('should have correct enum values', () => {
            expect(IMAGE_RENDERING.AUTO).toBe(0);
            expect(IMAGE_RENDERING.CRISP_EDGES).toBe(1);
            expect(IMAGE_RENDERING.PIXELATED).toBe(2);
            expect(IMAGE_RENDERING.SMOOTH).toBe(3);
        });

        it('should have distinct values', () => {
            const values = [
                IMAGE_RENDERING.AUTO,
                IMAGE_RENDERING.CRISP_EDGES,
                IMAGE_RENDERING.PIXELATED,
                IMAGE_RENDERING.SMOOTH
            ];
            const uniqueValues = new Set(values);
            expect(uniqueValues.size).toBe(values.length);
        });
    });

    describe('Smoothing state preservation', () => {
        it('should preserve and restore smoothing state', () => {
            if (!ctx) return; // Skip if canvas not available
            const originalState = ctx.imageSmoothingEnabled;

            // Save state
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            expect(ctx.imageSmoothingEnabled).toBe(false);

            // Restore state
            ctx.restore();
            expect(ctx.imageSmoothingEnabled).toBe(originalState);
        });

        it('should handle multiple save/restore cycles', () => {
            if (!ctx) return; // Skip if canvas not available
            ctx.imageSmoothingEnabled = true;
            ctx.save();

            ctx.imageSmoothingEnabled = false;
            ctx.save();

            ctx.imageSmoothingEnabled = true;
            expect(ctx.imageSmoothingEnabled).toBe(true);

            ctx.restore();
            expect(ctx.imageSmoothingEnabled).toBe(false);

            ctx.restore();
            expect(ctx.imageSmoothingEnabled).toBe(true);
        });
    });
});
