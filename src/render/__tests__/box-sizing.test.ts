import { describe, it, expect } from 'vitest';
import { paddingBox, contentBox } from '../box-sizing';
import { Context } from '../../core/context';
import { Html2CanvasConfig } from '../../config';
import { Bounds } from '../../css/layout/bounds';
import { ElementContainer } from '../../dom/element-container';

const createMockContext = (computedStyleOverrides: Record<string, string> = {}): Context => {
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
            quotes: 'none',
            ...computedStyleOverrides
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

describe('paddingBox', () => {
    it('returns a Bounds instance', () => {
        const ctx = createMockContext();
        const el = document.createElement('div');
        const container = new ElementContainer(ctx, el);
        const result = paddingBox(container);
        expect(result).toBeDefined();
        expect(result).toBeInstanceOf(Bounds);
    });

    it('adjusts bounds by subtracting border widths', () => {
        const ctx = createMockContext({
            borderTopWidth: '10px',
            borderRightWidth: '5px',
            borderBottomWidth: '8px',
            borderLeftWidth: '3px'
        });
        const el = document.createElement('div');
        const container = new ElementContainer(ctx, el);
        // container.bounds is (0, 0, 100, 100) (from actual getBoundingClientRect in jsdom)
        // paddingBox adds: left=borderLeftWidth(3), top=borderTopWidth(10),
        // width=-(borderRightWidth+borderLeftWidth)=-(5+3)=-8, height=-(10+8)=-18
        const result = paddingBox(container);
        expect(result.left).toBe(3);
        expect(result.top).toBe(10);
    });
});

describe('contentBox', () => {
    it('returns a Bounds instance', () => {
        const ctx = createMockContext();
        const el = document.createElement('div');
        const container = new ElementContainer(ctx, el);
        const result = contentBox(container);
        expect(result).toBeDefined();
        expect(result).toBeInstanceOf(Bounds);
    });

    it('adjusts bounds by subtracting padding and border widths', () => {
        const ctx = createMockContext({
            borderTopWidth: '2px',
            borderRightWidth: '2px',
            borderBottomWidth: '2px',
            borderLeftWidth: '2px',
            paddingTop: '10px',
            paddingRight: '5px',
            paddingBottom: '10px',
            paddingLeft: '8px'
        });
        const el = document.createElement('div');
        const container = new ElementContainer(ctx, el);
        // contentBox: paddingLeft(8) + borderLeftWidth(2) = 10 left offset
        // paddingTop(10) + borderTopWidth(2) = 12 top offset
        const result = contentBox(container);
        expect(result.left).toBe(10);
        expect(result.top).toBe(12);
    });
});
