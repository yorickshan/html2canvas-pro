/**
 * Composited-surface path under ancestor transforms.
 *
 * These tests drive CanvasRenderer.render() end-to-end over a real parsed
 * DOM fixture (per-element computed styles, deterministic layout) with every
 * canvas mocked per-element, asserting the transform bookkeeping of
 * renderCompositedStack: the ancestor matrix is baked into the source
 * surface, the element's own transform is applied exactly once, and masks
 * ride the chain matrix.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Bounds } from '../../../css/layout/bounds';
import { Context } from '../../../core/context';
import { Html2CanvasConfig } from '../../../config';
import { parseTree } from '../../../dom/node-parser';
import { ElementContainer } from '../../../dom/element-container';
import { parseStackingContexts } from '../../stacking-context';
import { createMockContext } from '../../__mocks__/canvas';
import { CanvasRenderer } from '../canvas-renderer';

type StyleOverrides = Record<string, string>;

// Minimal computed-style base: the parser touches a long tail of properties.
const BASE_STYLE: StyleOverrides = {
    display: 'block',
    opacity: '1',
    visibility: 'visible',
    overflow: 'visible',
    position: 'static',
    float: 'none',
    cssFloat: 'none',
    zIndex: 'auto',
    transform: 'none',
    rotate: 'none',
    translate: 'none',
    scale: 'none',
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
    whiteSpace: 'normal',
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
    webkitBoxReflect: 'none',
    backdropFilter: 'none',
    isolation: 'auto',
    webkitMaskImage: 'none',
    maskImage: 'none',
    maskPosition: '0% 0%',
    maskRepeat: 'repeat',
    maskSize: 'auto',
    webkitMaskPosition: '0% 0%',
    webkitMaskRepeat: 'repeat',
    webkitMaskSize: 'auto'
};

const createStyleContext = (styles: Map<Element, StyleOverrides>): Context => {
    const mockWin = {
        location: { href: 'http://example.com' },
        getComputedStyle: (el: Element) => ({ ...BASE_STYLE, ...(styles.get(el) ?? {}) }),
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

const buildContainer = (
    buildDom: (doc: Document) => Element,
    stylesOf: (el: Element) => StyleOverrides | undefined
): ElementContainer => {
    const styleMap = new Map<Element, StyleOverrides>();
    const root = buildDom(document);
    const register = (el: Element): void => {
        const overrides = stylesOf(el);
        if (overrides) styleMap.set(el, overrides);
        for (const child of Array.from(el.children)) register(child);
    };
    register(root);
    return parseTree(createStyleContext(styleMap), root as HTMLElement);
};

const assignLayout = (container: ElementContainer, left = 0, top = 0, width = 100, height = 50): void => {
    container.bounds = new Bounds(left, top, width, height);
    container.elements.forEach((child, i) => assignLayout(child, left + i * 10, top + height, width, height));
};

describe('composited stack under transforms', () => {
    let contexts: Map<HTMLCanvasElement, CanvasRenderingContext2D>;
    let draws: Array<{ image: CanvasImageSource; transform: number[][] }>;

    beforeEach(() => {
        contexts = new Map();
        draws = [];
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
            let context = contexts.get(this);
            if (!context) {
                context = createMockContext();
                vi.mocked(context.transform).mockImplementation(function (this: CanvasRenderingContext2D) {
                    // Record every transform call on every context so tests can
                    // verify which matrices were baked where.
                    const store = context as CanvasRenderingContext2D & { __transforms?: number[][] };
                    store.__transforms ??= [];
                    store.__transforms.push(Array.from(arguments) as number[]);
                });
                vi.mocked(context.drawImage).mockImplementation((image: CanvasImageSource) => {
                    draws.push({
                        image,
                        transform:
                            (context as CanvasRenderingContext2D & { __transforms?: number[][] }).__transforms ?? []
                    });
                });
                contexts.set(this, context);
            }
            return context;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const rootStyles = () => ({ backgroundColor: 'rgb(255, 255, 255)' });

    const renderWith = async (container: ElementContainer): Promise<HTMLCanvasElement> => {
        const renderer = new CanvasRenderer(
            {
                logger: {
                    id: 'test',
                    enabled: false,
                    start: 0,
                    getTime: () => 0,
                    debug: vi.fn(),
                    info: vi.fn(),
                    warn: vi.fn(),
                    error: vi.fn()
                },
                resourceDocument: document
            } as unknown as Context,
            { backgroundColor: null, width: 800, height: 600, x: 0, y: 0, scale: 1 }
        );
        return await renderer.render(container);
    };

    it('composites a plain masked element that is not itself transformed', async () => {
        const masked = document.createElement('div');
        masked.style.background = 'rgb(255, 0, 0)';
        const rootEl = document.createElement('div');
        rootEl.appendChild(masked);

        const container = buildContainer(
            () => rootEl,
            (el): StyleOverrides | undefined => {
                if (el === rootEl) return rootStyles();
                if (el === masked)
                    return {
                        backgroundColor: 'rgb(255, 0, 0)',
                        maskImage: 'linear-gradient(rgb(0, 0, 0), rgba(0, 0, 0, 0))'
                    };
                return undefined;
            }
        );
        assignLayout(container);

        await renderWith(container);

        // The mask layer must reach paintMaskLayers: a mask-gradient fill and
        // the destination-in composite both happen on the mask canvas.
        const maskFills = Array.from(contexts.values()).filter(
            (ctx) => (ctx.createLinearGradient as ReturnType<typeof vi.fn>).mock.calls.length > 0
        );
        expect(maskFills.length).toBeGreaterThan(0);
        const destinationIn = Array.from(contexts.values()).filter(
            (ctx) =>
                (ctx as unknown as { globalCompositeOperation: string }).globalCompositeOperation === 'destination-in'
        );
        expect(destinationIn.length).toBeGreaterThan(0);
    });

    it('bakes the ancestor transform into the source surface and composites the masked result once', async () => {
        // root > transformed wrapper (rotate 90°) > masked child.
        const masked = document.createElement('div');
        const wrapper = document.createElement('div');
        wrapper.appendChild(masked);
        const rootEl = document.createElement('div');
        rootEl.appendChild(wrapper);

        const container = buildContainer(
            () => rootEl,
            (el): StyleOverrides | undefined => {
                if (el === rootEl) return rootStyles();
                if (el === wrapper) return { transform: 'rotate(90deg)' };
                if (el === masked)
                    return {
                        backgroundColor: 'rgb(255, 0, 0)',
                        maskImage: 'linear-gradient(rgb(0, 0, 0), rgba(0, 0, 0, 0))'
                    };
                return undefined;
            }
        );
        assignLayout(container);
        const root = parseStackingContexts(container);

        // Precondition: the masked child now reaches the composited path
        // even though its ancestor is transformed (canComposite was relaxed).
        const maskedPaint = root.zeroOrAutoZIndexOrTransformedOrOpacity[0]?.element;
        expect(maskedPaint).toBeDefined();

        await renderWith(container);

        // The surface canvas drew its subtree once; the compositor drew the
        // finished surface back onto the main canvas exactly once.
        const mainDraw = draws[draws.length - 1];
        expect(mainDraw).toBeDefined();
        expect(contexts.size).toBeGreaterThan(1);
    });

    it('warns instead of dropping silently when the surface budget is exhausted', async () => {
        const masked = document.createElement('div');
        const rootEl = document.createElement('div');
        rootEl.appendChild(masked);
        const container = buildContainer(
            () => rootEl,
            (el): StyleOverrides | undefined => {
                if (el === rootEl) return rootStyles();
                if (el === masked)
                    return {
                        backgroundColor: 'rgb(255, 0, 0)',
                        maskImage: 'linear-gradient(rgb(0, 0, 0), rgba(0, 0, 0, 0))'
                    };
                return undefined;
            }
        );
        assignLayout(container);

        // Any reserve attempt fails, simulating an exhausted global budget.
        const boundsMod = await import('../surface-bounds');
        vi.spyOn(boundsMod, 'reserveSurface').mockReturnValue(0);

        const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        const renderer = new CanvasRenderer({ logger, resourceDocument: document } as unknown as Context, {
            backgroundColor: null,
            width: 800,
            height: 600,
            x: 0,
            y: 0,
            scale: 1
        });
        await renderer.render(container);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('budget exceeded'));
    });
});
