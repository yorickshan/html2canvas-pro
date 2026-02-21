import { describe, it, expect, beforeEach } from '@jest/globals';
import { imageRendering, IMAGE_RENDERING } from '../image-rendering';
import { Context } from '../../../core/context';
import { Html2CanvasConfig } from '../../../config';

describe('property-descriptors', () => {
    let context: Context;

    beforeEach(() => {
        const mockWindow = {
            location: { href: 'http://example.com' },
            document: { createElement: () => ({ href: '' }) }
        } as any;
        const config = new Html2CanvasConfig({ window: mockWindow });
        context = new Context({} as any, {} as any, config);
    });

    describe('image-rendering', () => {
        it('should parse "auto" as AUTO', () => {
            expect(imageRendering.parse(context, 'auto')).toBe(IMAGE_RENDERING.AUTO);
        });

        it('should parse "pixelated" as PIXELATED', () => {
            expect(imageRendering.parse(context, 'pixelated')).toBe(IMAGE_RENDERING.PIXELATED);
        });

        it('should parse "crisp-edges" as CRISP_EDGES', () => {
            expect(imageRendering.parse(context, 'crisp-edges')).toBe(IMAGE_RENDERING.CRISP_EDGES);
        });

        it('should parse "-webkit-crisp-edges" as CRISP_EDGES', () => {
            expect(imageRendering.parse(context, '-webkit-crisp-edges')).toBe(IMAGE_RENDERING.CRISP_EDGES);
        });

        it('should parse "-webkit-optimize-contrast" as PIXELATED', () => {
            expect(imageRendering.parse(context, '-webkit-optimize-contrast')).toBe(IMAGE_RENDERING.PIXELATED);
        });

        it('should parse "smooth" as SMOOTH', () => {
            expect(imageRendering.parse(context, 'smooth')).toBe(IMAGE_RENDERING.SMOOTH);
        });

        it('should parse unknown values as AUTO', () => {
            expect(imageRendering.parse(context, 'invalid')).toBe(IMAGE_RENDERING.AUTO);
        });

        it('should be case-insensitive', () => {
            expect(imageRendering.parse(context, 'PIXELATED')).toBe(IMAGE_RENDERING.PIXELATED);
            expect(imageRendering.parse(context, 'Crisp-Edges')).toBe(IMAGE_RENDERING.CRISP_EDGES);
        });

        // Edge case tests
        it('should handle empty string as AUTO', () => {
            expect(imageRendering.parse(context, '')).toBe(IMAGE_RENDERING.AUTO);
        });

        it('should handle whitespace as AUTO', () => {
            expect(imageRendering.parse(context, '   ')).toBe(IMAGE_RENDERING.AUTO);
        });

        it('should handle special characters as AUTO', () => {
            expect(imageRendering.parse(context, '@#$%')).toBe(IMAGE_RENDERING.AUTO);
        });

        it('should parse "-moz-crisp-edges" as CRISP_EDGES', () => {
            expect(imageRendering.parse(context, '-moz-crisp-edges')).toBe(IMAGE_RENDERING.CRISP_EDGES);
        });

        it('should parse "high-quality" as SMOOTH', () => {
            expect(imageRendering.parse(context, 'high-quality')).toBe(IMAGE_RENDERING.SMOOTH);
        });
    });
});
