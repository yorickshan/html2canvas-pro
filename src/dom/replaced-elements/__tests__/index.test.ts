import { describe, it, expect } from 'vitest';
import { CanvasElementContainer } from '../canvas-element-container';
import { ImageElementContainer } from '../image-element-container';
import { SVGElementContainer } from '../svg-element-container';

describe('replaced-elements exports', () => {
    it('CanvasElementContainer is a class', () => {
        expect(typeof CanvasElementContainer).toBe('function');
    });

    it('ImageElementContainer is a class', () => {
        expect(typeof ImageElementContainer).toBe('function');
    });

    it('SVGElementContainer is a class', () => {
        expect(typeof SVGElementContainer).toBe('function');
    });
});
