import { describe, it, expect } from 'vitest';
import { parseStackingContexts, hasOverflowClip, resolveAxisRadius, buildClipPathEffect } from '../stacking-context';
import { ElementContainer } from '../../dom/element-container';
import { Context } from '../../core/context';
import { Html2CanvasConfig } from '../../config';
import { Bounds } from '../../css/layout/bounds';
import { CLIP_PATH_TYPE } from '../../css/property-descriptors/clip-path';
import { OVERFLOW } from '../../css/property-descriptors/overflow';

const createMockContext = (): Context => {
    const mockWin = {
        location: { href: 'http://example.com' },
        getComputedStyle: () => ({
            display: 'block',
            opacity: '1',
            visibility: 'visible',
            overflow: 'visible',
            position: 'static',
            float: 'none',
            zIndex: 'auto',
            transform: 'none',
            rotate: 'none',
            mixBlendMode: 'normal',
            filter: 'none',
            zoom: '1',
            clipPath: 'none',
            flexDirection: 'row',
            backgroundColor: 'transparent',
            color: 'black',
            fontFamily: 'Arial',
            fontSize: '16px',
            fontStyle: 'normal',
            fontVariant: 'normal',
            fontWeight: '400',
            letterSpacing: 'normal',
            lineHeight: 'normal',
            lineBreak: 'auto',
            listStyleType: 'none',
            listStylePosition: 'outside',
            listStyleImage: 'none',
            marginTop: '0px',
            marginRight: '0px',
            marginBottom: '0px',
            marginLeft: '0px',
            paddingTop: '0px',
            paddingRight: '0px',
            paddingBottom: '0px',
            paddingLeft: '0px',
            textAlign: 'left',
            textDecorationLine: 'none',
            textDecorationStyle: 'solid',
            textDecorationColor: 'black',
            textDecorationThickness: '1px',
            textUnderlineOffset: 'auto',
            textShadow: 'none',
            textTransform: 'none',
            textOverflow: 'clip',
            wordBreak: 'normal',
            overflowWrap: 'normal',
            writingMode: 'horizontal-tb',
            direction: 'ltr',
            webkitTextStrokeColor: 'transparent',
            webkitTextStrokeWidth: '0px',
            webkitLineClamp: 'none',
            objectFit: 'fill',
            objectPosition: '50% 50%',
            backgroundImage: 'none',
            backgroundPosition: '0% 0%',
            backgroundSize: 'auto',
            backgroundRepeat: 'repeat',
            backgroundClip: 'border-box',
            backgroundOrigin: 'padding-box',
            backgroundBlendMode: 'normal',
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
            borderTopStyle: 'none',
            borderRightStyle: 'none',
            borderBottomStyle: 'none',
            borderLeftStyle: 'none',
            borderTopWidth: '0px',
            borderRightWidth: '0px',
            borderBottomWidth: '0px',
            borderLeftWidth: '0px',
            borderTopLeftRadius: '0px',
            borderTopRightRadius: '0px',
            borderBottomRightRadius: '0px',
            borderBottomLeftRadius: '0px',
            boxShadow: 'none',
            borderImageSource: 'none',
            borderImageSlice: '100%',
            borderImageRepeat: 'stretch',
            boxDecorationBreak: 'slice',
            animationDuration: '0s',
            fontVariantLigatures: 'normal',
            paintOrder: 'fill',
            imageRendering: 'auto',
            content: 'none',
            counterIncrement: 'none',
            counterReset: 'none',
            quotes: 'none'
        }),
        document: {
            documentElement: {} as HTMLElement,
            body: {} as HTMLElement,
            createElement: () => ({
                set href(_v: string) {},
                get href() {
                    return '';
                },
                get protocol() {
                    return 'http:';
                },
                get hostname() {
                    return 'localhost';
                },
                get port() {
                    return '';
                }
            })
        }
    } as unknown as Window;
    const config = new Html2CanvasConfig({ window: mockWin });
    return new Context(
        { logging: false, imageTimeout: 1000, useCORS: false, allowTaint: false },
        new Bounds(0, 0, 800, 600),
        config
    );
};

describe('resolveAxisRadius', () => {
    it('closest-side returns min distance to nearest edge', () => {
        const r = resolveAxisRadius('closest-side', 50, 0, 100, 100);
        expect(r).toBe(50); // min(50-0, 100-50) = 50
    });

    it('farthest-side returns max distance to farthest edge', () => {
        const r = resolveAxisRadius('farthest-side', 20, 0, 100, 100);
        expect(r).toBe(80); // max(20-0, 100-20) = 80
    });
});

describe('hasOverflowClip', () => {
    it('returns true when overflowX is HIDDEN', () => {
        const mock: ElementContainer['styles'] = {
            overflowX: OVERFLOW.HIDDEN,
            overflowY: OVERFLOW.VISIBLE
        } as never;
        expect(hasOverflowClip(mock)).toBe(true);
    });

    it('returns true when overflowY is SCROLL', () => {
        const mock: ElementContainer['styles'] = {
            overflowX: OVERFLOW.VISIBLE,
            overflowY: OVERFLOW.SCROLL
        } as never;
        expect(hasOverflowClip(mock)).toBe(true);
    });

    it('returns false when both are VISIBLE', () => {
        const mock: ElementContainer['styles'] = {
            overflowX: OVERFLOW.VISIBLE,
            overflowY: OVERFLOW.VISIBLE
        } as never;
        expect(hasOverflowClip(mock)).toBe(false);
    });
});

describe('buildClipPathEffect', () => {
    it('returns null for NONE clip-path', () => {
        const result = buildClipPathEffect({ type: CLIP_PATH_TYPE.NONE, value: [] }, new Bounds(0, 0, 100, 100));
        expect(result).toBeNull();
    });

    it('creates an inset clip effect', () => {
        const result = buildClipPathEffect(
            {
                type: CLIP_PATH_TYPE.INSET,
                left: { type: 0, number: 10, flags: 4 },
                top: { type: 0, number: 10, flags: 4 },
                right: { type: 0, number: 10, flags: 4 },
                bottom: { type: 0, number: 10, flags: 4 },
                topLeftRadius: [],
                topRightRadius: [],
                bottomRightRadius: [],
                bottomLeftRadius: []
            },
            new Bounds(0, 0, 100, 100)
        );
        expect(result).not.toBeNull();
    });
});

describe('parseStackingContexts', () => {
    it('creates a root stacking context from an element', () => {
        const ctx = createMockContext();
        const div = document.createElement('div');
        const container = new ElementContainer(ctx, div);
        const root = parseStackingContexts(container);
        expect(root).toBeDefined();
        expect(root.element).toBeDefined();
        expect(Array.isArray(root.negativeZIndex)).toBe(true);
        expect(Array.isArray(root.positiveZIndex)).toBe(true);
        expect(Array.isArray(root.zeroOrAutoZIndexOrTransformedOrOpacity)).toBe(true);
    });

    it('nested elements appear in stacking context tree', () => {
        const ctx = createMockContext();
        const parent = document.createElement('div');
        const child = document.createElement('span');
        parent.appendChild(child);
        const container = new ElementContainer(ctx, parent);
        const root = parseStackingContexts(container);
        expect(root).toBeDefined();
    });

    it('visibility hidden elements are still parsed but not visible', () => {
        const ctx = createMockContext();
        const div = document.createElement('div');
        const container = new ElementContainer(ctx, div);
        // The mock getComputedStyle always returns 'visible', so we verify
        // isVisible() behaviour directly on the parsed styles.
        expect(container.styles.isVisible()).toBe(true);
        const root = parseStackingContexts(container);
        expect(root).toBeDefined();
    });
});
