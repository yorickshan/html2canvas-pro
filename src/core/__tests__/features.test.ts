import { describe, it, expect } from 'vitest';
import { FEATURES, createForeignObjectSVG, loadSerializedSVG } from '../features';

describe('FEATURES', () => {
    it('has boolean SUPPORT_RANGE_BOUNDS', () => {
        expect(typeof FEATURES.SUPPORT_RANGE_BOUNDS).toBe('boolean');
    });

    it('has boolean SUPPORT_WORD_BREAKING', () => {
        expect(typeof FEATURES.SUPPORT_WORD_BREAKING).toBe('boolean');
    });

    it('has boolean SUPPORT_SVG_DRAWING', () => {
        expect(typeof FEATURES.SUPPORT_SVG_DRAWING).toBe('boolean');
    });

    it('has boolean SUPPORT_CORS_IMAGES', () => {
        expect(typeof FEATURES.SUPPORT_CORS_IMAGES).toBe('boolean');
    });

    it('has boolean SUPPORT_RESPONSE_TYPE', () => {
        expect(typeof FEATURES.SUPPORT_RESPONSE_TYPE).toBe('boolean');
    });

    it('has boolean SUPPORT_CORS_XHR', () => {
        expect(typeof FEATURES.SUPPORT_CORS_XHR).toBe('boolean');
    });

    it('has boolean or Promise SUPPORT_FOREIGNOBJECT_DRAWING', async () => {
        const val = FEATURES.SUPPORT_FOREIGNOBJECT_DRAWING;
        expect(typeof val === 'boolean' || val instanceof Promise).toBe(true);
        // In jsdom, the promise may reject due to missing canvas support; suppress unhandled rejection
        if (val instanceof Promise) {
            val.catch(() => {
                // Suppress expected error in jsdom environment
            });
            await val.catch(() => {});
        }
    });

    it('has boolean SUPPORT_NATIVE_TEXT_SEGMENTATION', () => {
        expect(typeof FEATURES.SUPPORT_NATIVE_TEXT_SEGMENTATION).toBe('boolean');
    });
});

describe('createForeignObjectSVG', () => {
    it('returns an SVG element with a foreignObject child', () => {
        const div = document.createElement('div');
        const result = createForeignObjectSVG(100, 50, 0, 0, div);
        expect(result).toBeDefined();
        // Despite the return type annotation, the function returns the SVG root element
        expect(result.tagName).toBe('svg');
        expect(result.namespaceURI).toBe('http://www.w3.org/2000/svg');
        expect(result.childNodes.length).toBeGreaterThan(0);
        expect(result.childNodes[0].nodeName).toBe('foreignObject');
    });
});

describe('loadSerializedSVG', () => {
    it('returns a Promise', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const result = loadSerializedSVG(svg);
        expect(result).toBeInstanceOf(Promise);
    });
});
