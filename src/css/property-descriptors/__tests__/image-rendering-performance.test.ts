import { describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Performance tests for image smoothing
 * Measures the performance impact of enabling/disabling image smoothing
 */
describe('image-rendering performance', () => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;
    let testImage: HTMLCanvasElement;

    beforeEach(() => {
        ctx = null;
        // Create test canvas (JSDOM throws on getContext('2d'), so catch and skip)
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        let context: CanvasRenderingContext2D | null = null;
        try {
            context = canvas.getContext('2d');
        } catch {
            return;
        }
        if (!context) {
            return;
        }
        ctx = context;

        // Create a test image (using canvas as source)
        testImage = document.createElement('canvas');
        testImage.width = 100;
        testImage.height = 100;
        let testCtx: CanvasRenderingContext2D | null = null;
        try {
            testCtx = testImage.getContext('2d');
        } catch {
            // JSDOM: no canvas
        }
        if (testCtx) {
            // Draw some test pattern
            testCtx.fillStyle = 'red';
            testCtx.fillRect(0, 0, 50, 50);
            testCtx.fillStyle = 'blue';
            testCtx.fillRect(50, 0, 50, 50);
            testCtx.fillStyle = 'green';
            testCtx.fillRect(0, 50, 50, 50);
            testCtx.fillStyle = 'yellow';
            testCtx.fillRect(50, 50, 50, 50);
        }
    });

    const measureDrawTime = (smoothing: boolean, quality?: 'low' | 'medium' | 'high'): number => {
        if (!ctx) return 0; // Skip if canvas not available

        ctx.imageSmoothingEnabled = smoothing;
        if (quality) {
            ctx.imageSmoothingQuality = quality;
        }

        const iterations = 100;
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
            // Scale up the image (this is where smoothing matters)
            ctx.drawImage(testImage, 0, 0, 100, 100, 0, 0, 400, 400);
        }

        const endTime = performance.now();
        return (endTime - startTime) / iterations; // Average time per draw
    };

    it('should measure performance with smoothing disabled', () => {
        if (!ctx) return; // Skip if canvas not available
        const avgTime = measureDrawTime(false);
        expect(avgTime).toBeGreaterThan(0);
        expect(avgTime).toBeLessThan(100); // Should complete quickly
    });

    it('should measure performance with smoothing enabled', () => {
        if (!ctx) return;
        const avgTime = measureDrawTime(true);
        expect(avgTime).toBeGreaterThan(0);
        expect(avgTime).toBeLessThan(100);
    });

    it('should measure performance with low quality smoothing', () => {
        if (!ctx) return;
        const avgTime = measureDrawTime(true, 'low');
        expect(avgTime).toBeGreaterThan(0);
    });

    it('should measure performance with medium quality smoothing', () => {
        if (!ctx) return;
        const avgTime = measureDrawTime(true, 'medium');
        expect(avgTime).toBeGreaterThan(0);
    });

    it('should measure performance with high quality smoothing', () => {
        if (!ctx) return;
        const avgTime = measureDrawTime(true, 'high');
        expect(avgTime).toBeGreaterThan(0);
    });

    it('should compare performance: disabled vs enabled', () => {
        if (!ctx) return;
        const disabledTime = measureDrawTime(false);
        const enabledTime = measureDrawTime(true);

        // Performance should be reasonable in both cases
        expect(disabledTime).toBeLessThan(50);
        expect(enabledTime).toBeLessThan(50);

        // Verify difference is within acceptable range
        const difference = enabledTime - disabledTime;
        expect(Math.abs(difference)).toBeLessThan(30);
    });

    it('should compare quality levels', () => {
        if (!ctx) return;
        const lowTime = measureDrawTime(true, 'low');
        const mediumTime = measureDrawTime(true, 'medium');
        const highTime = measureDrawTime(true, 'high');

        // All quality levels should complete reasonably fast
        expect(lowTime).toBeLessThan(50);
        expect(mediumTime).toBeLessThan(50);
        expect(highTime).toBeLessThan(50);
    });

    describe('Large image performance', () => {
        let largeTestImage: HTMLCanvasElement;

        beforeEach(() => {
            largeTestImage = document.createElement('canvas');
            largeTestImage.width = 500;
            largeTestImage.height = 500;
            let testCtx: CanvasRenderingContext2D | null = null;
            try {
                testCtx = largeTestImage.getContext('2d');
            } catch {
                // JSDOM: no canvas
            }
            if (testCtx) {
                // Draw a gradient pattern
                const gradient = testCtx.createLinearGradient(0, 0, 500, 500);
                gradient.addColorStop(0, 'red');
                gradient.addColorStop(0.5, 'blue');
                gradient.addColorStop(1, 'green');
                testCtx.fillStyle = gradient;
                testCtx.fillRect(0, 0, 500, 500);
            }
        });

        it('should handle large image with smoothing disabled', () => {
            if (!ctx) return;
            ctx.imageSmoothingEnabled = false;

            const startTime = performance.now();
            ctx.drawImage(largeTestImage, 0, 0, 500, 500, 0, 0, 800, 600);
            const duration = performance.now() - startTime;

            expect(duration).toBeLessThan(100);
        });

        it('should handle large image with smoothing enabled', () => {
            if (!ctx) return;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            const startTime = performance.now();
            ctx.drawImage(largeTestImage, 0, 0, 500, 500, 0, 0, 800, 600);
            const duration = performance.now() - startTime;

            expect(duration).toBeLessThan(200); // Allow more time for high quality
        });
    });
});
