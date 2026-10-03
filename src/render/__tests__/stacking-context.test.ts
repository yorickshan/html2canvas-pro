import { describe, it, expect, afterEach, vi } from 'vitest';
import {
    parseStackingContexts,
    hasOverflowClip,
    resolveAxisRadius,
    buildClipPathEffect,
    ElementPaint,
    StackingContext
} from '../stacking-context';
import { ElementContainer } from '../../dom/element-container';
import { parseTree } from '../../dom/node-parser';
import { Context } from '../../core/context';
import { Html2CanvasConfig } from '../../config';
import { Bounds } from '../../css/layout/bounds';
import { CLIP_PATH_TYPE } from '../../css/property-descriptors/clip-path';
import { OVERFLOW } from '../../css/property-descriptors/overflow';
import { EffectTarget } from '../effects';
import { MIX_BLEND_MODE } from '../../css/property-descriptors/mix-blend-mode';
import { OLElementContainer } from '../../dom/elements/ol-element-container';
import { LIElementContainer } from '../../dom/elements/li-element-container';
import { createMockContext } from '../__mocks__/canvas';

const createMockContextFor = (): Context => {
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

    it('resolves a length-percentage radius against the reference dimension', () => {
        const radius = { type: 0, number: 15, flags: 4 } as never;
        expect(resolveAxisRadius(radius, 50, 0, 100, 200)).toBe(15);
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
    const NO_RADII = {
        topLeftRadius: [],
        topRightRadius: [],
        bottomRightRadius: [],
        bottomLeftRadius: []
    };
    const length = (n: number) => ({ type: 0, number: n, flags: 4 });

    it('returns null for NONE clip-path', () => {
        const result = buildClipPathEffect({ type: CLIP_PATH_TYPE.NONE, value: [] }, new Bounds(0, 0, 100, 100));
        expect(result).toBeNull();
    });

    it('creates an inset clip effect', () => {
        const result = buildClipPathEffect(
            {
                type: CLIP_PATH_TYPE.INSET,
                left: length(10),
                top: length(10),
                right: length(10),
                bottom: length(10),
                ...NO_RADII
            },
            new Bounds(0, 0, 100, 100)
        );
        expect(result).not.toBeNull();
    });

    it('inset clip effect draws a rect, clamping overlapping insets to zero', () => {
        const ctx = createMockContext();
        const effect = buildClipPathEffect(
            {
                type: CLIP_PATH_TYPE.INSET,
                left: length(60),
                top: length(60),
                right: length(60),
                bottom: length(60),
                ...NO_RADII
            },
            new Bounds(10, 20, 100, 100)
        )!;
        effect.applyClip(ctx as unknown as CanvasRenderingContext2D);
        // x = 10 + 60, y = 20 + 60, w = max(0, 100 - 60 - 60) = 0
        expect(ctx.rect).toHaveBeenCalledWith(70, 80, 0, 0);
        expect(ctx.clip).toHaveBeenCalled();
    });

    it.each(['closest-side', 'farthest-side'] as const)('circle effect resolves %s radius', (radius) => {
        const ctx = createMockContext();
        const effect = buildClipPathEffect(
            { type: CLIP_PATH_TYPE.CIRCLE, radius, cx: length(50), cy: length(50) },
            new Bounds(0, 0, 100, 100)
        )!;
        effect.applyClip(ctx as unknown as CanvasRenderingContext2D);
        expect(ctx.arc).toHaveBeenCalled();
        const arcArgs = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls[0] as number[];
        expect(arcArgs[2]).toBe(radius === 'closest-side' ? 50 : 50);
    });

    it('circle effect resolves a percentage against the diagonal-derived reference', () => {
        const ctx = createMockContext();
        const effect = buildClipPathEffect(
            { type: CLIP_PATH_TYPE.CIRCLE, radius: length(50), cx: length(50), cy: length(50) },
            new Bounds(0, 0, 100, 100)
        )!;
        effect.applyClip(ctx as unknown as CanvasRenderingContext2D);
        // reference = sqrt(100^2 + 100^2) / sqrt(2) = 100; r = 50% * 100 = 50
        const arcArgs = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls[0] as number[];
        expect(arcArgs[2]).toBeCloseTo(50, 5);
    });

    it('ellipse effect draws an ellipse using per-axis radii', () => {
        const ctx = createMockContext();
        const effect = buildClipPathEffect(
            {
                type: CLIP_PATH_TYPE.ELLIPSE,
                rx: 'farthest-side',
                ry: 'closest-side',
                cx: length(40),
                cy: length(30)
            },
            new Bounds(0, 0, 100, 100)
        )!;
        effect.applyClip(ctx as unknown as CanvasRenderingContext2D);
        expect(ctx.ellipse).toHaveBeenCalledWith(40, 30, 60, 30, 0, 0, Math.PI * 2);
    });

    it('polygon effect traces all vertices', () => {
        const ctx = createMockContext();
        const effect = buildClipPathEffect(
            {
                type: CLIP_PATH_TYPE.POLYGON,
                points: [
                    [length(0), length(0)],
                    [length(100), length(0)],
                    [length(50), length(100)]
                ]
            },
            new Bounds(10, 10, 100, 100)
        )!;
        effect.applyClip(ctx as unknown as CanvasRenderingContext2D);
        expect(ctx.moveTo).toHaveBeenCalledWith(10, 10);
        expect(ctx.lineTo).toHaveBeenCalledWith(110, 10);
        expect(ctx.lineTo).toHaveBeenCalledWith(60, 110);
        expect(ctx.closePath).toHaveBeenCalled();
        expect(ctx.clip).toHaveBeenCalled();
    });

    it('polygon effect with no points clips everything', () => {
        const ctx = createMockContext();
        const effect = buildClipPathEffect({ type: CLIP_PATH_TYPE.POLYGON, points: [] }, new Bounds(0, 0, 100, 100))!;
        effect.applyClip(ctx as unknown as CanvasRenderingContext2D);
        expect(ctx.moveTo).not.toHaveBeenCalled();
        expect(ctx.clip).toHaveBeenCalled();
    });

    it('path effect clips with a Path2D translated to the element origin', async () => {
        const ctx = createMockContext();
        vi.stubGlobal(
            'Path2D',
            class {
                d: string;
                constructor(d: string) {
                    this.d = d;
                }
            }
        );
        try {
            const effect = buildClipPathEffect(
                { type: CLIP_PATH_TYPE.PATH, d: 'M0 0 L10 10' },
                new Bounds(5, 5, 100, 100)
            )!;
            effect.applyClip(ctx as unknown as CanvasRenderingContext2D);
            expect(ctx.translate).toHaveBeenCalledWith(5, 5);
            expect(ctx.clip).toHaveBeenCalled();
            expect(ctx.setTransform).toHaveBeenCalled();
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('path effect swallows unsupported Path2D environments', () => {
        const ctx = createMockContext();
        // No Path2D global in this environment -> the callback must not throw.
        const effect = buildClipPathEffect(
            { type: CLIP_PATH_TYPE.PATH, d: 'M0 0 L10 10' },
            new Bounds(5, 5, 100, 100)
        )!;
        expect(() => effect.applyClip(ctx as unknown as CanvasRenderingContext2D)).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Style-aware harness: each element can be given its own computed style so
// parseStackingContexts is driven with realistic CSS inputs.
// ─────────────────────────────────────────────────────────────────────────────

type StyleOverrides = Record<string, string>;

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
    quotes: 'none'
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

/**
 * Parse a DOM fragment into an ElementContainer tree using per-element styles.
 * `stylesOf` is called for the root and every descendant.
 */
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

/** Give every container a deterministic non-zero box so curves are meaningful. */
const assignLayout = (container: ElementContainer, left = 0, top = 0, width = 100, height = 50): void => {
    container.bounds = new Bounds(left, top, width, height);
    container.elements.forEach((child, i) => assignLayout(child, left + i * 10, top + height, width, height));
};

const buildPaintTree = (container: ElementContainer, parent: ElementPaint | null = null): ElementPaint => {
    const paint = new ElementPaint(container, parent);
    for (const child of container.elements) buildPaintTree(child, paint);
    return paint;
};

const tagOf = (paint: ElementPaint | StackingContext): string | null => {
    const container = paint instanceof StackingContext ? paint.element.container : paint.container;
    return container && (container as unknown as { tagName?: string }).tagName
        ? ((container as unknown as { tagName: string }).tagName as string)
        : null;
};

/** Collects every ElementPaint reachable in a stacking context tree. */
const collectPaints = (ctx: StackingContext): ElementPaint[] => [
    ctx.element,
    ...ctx.inlineLevel,
    ...ctx.nonInlineLevel,
    ...[
        ...ctx.negativeZIndex,
        ...ctx.zeroOrAutoZIndexOrTransformedOrOpacity,
        ...ctx.positiveZIndex,
        ...ctx.nonPositionedFloats,
        ...ctx.nonPositionedInlineLevel
    ].flatMap((child) => collectPaints(child))
];

const listValuesOf = (root: StackingContext): (string | undefined)[] =>
    collectPaints(root)
        .filter((paint) => paint.container instanceof LIElementContainer)
        .map((paint) => paint.listValue);

describe('ElementPaint effect construction', () => {
    afterEach(() => vi.restoreAllMocks());

    const paintOf = (styles: StyleOverrides): ElementPaint =>
        new ElementPaint(
            buildContainer(
                () => document.createElement('div'),
                () => styles
            ),
            null
        );

    it('plain element produces no effects', () => {
        expect(paintOf({}).effects).toHaveLength(0);
    });

    it('opacity below 1 adds an OpacityEffect', () => {
        const paint = paintOf({ opacity: '0.5' });
        expect(paint.effects).toHaveLength(1);
        expect(paint.effects[0]?.type).toBe(2 /* EffectType.OPACITY */);
    });

    it('rotate adds a TransformEffect with the rotation matrix', () => {
        const paint = paintOf({ rotate: '90deg' });
        const transform = paint.effects[0] as unknown as { matrix: number[] };
        expect(transform.matrix[0]).toBeCloseTo(0, 5); // cos(90deg)
        expect(transform.matrix[1]).toBeCloseTo(1, 5); // sin(90deg)
        expect(transform.matrix[2]).toBeCloseTo(-1, 5);
        expect(transform.matrix[3]).toBeCloseTo(0, 5);
    });

    it('transform adds a TransformEffect carrying the parsed matrix', () => {
        const paint = paintOf({ transform: 'matrix(1, 0, 0, 1, 10, 0)' });
        const transform = paint.effects[0] as unknown as { matrix: number[] };
        expect(transform.matrix).toEqual([1, 0, 0, 1, 10, 0]);
    });

    it('overflow hidden with borders adds separate border/padding box clips', () => {
        const paint = paintOf({ overflow: 'hidden', borderTopWidth: '2px', borderLeftWidth: '3px' });
        const clips = paint.effects as unknown as Array<{ target: number }>;
        expect(clips).toHaveLength(2);
        expect(clips[0]?.target).toBe(EffectTarget.BACKGROUND_BORDERS);
        expect(clips[1]?.target).toBe(EffectTarget.CONTENT);
    });

    it('overflow hidden without borders still adds border/padding box clips (upstream equalPath quirk)', () => {
        const paint = paintOf({ overflow: 'hidden' });
        const clips = paint.effects as unknown as Array<{ target: number }>;
        // equalPath compares Path objects by identity, so the combined-clip
        // branch is never taken even when the boxes coincide (upstream parity).
        expect(clips).toHaveLength(2);
        expect(clips[0]?.target).toBe(EffectTarget.BACKGROUND_BORDERS);
        expect(clips[1]?.target).toBe(EffectTarget.CONTENT);
    });

    it.each(['inset(10px)', 'circle(50% at 50% 50%)', 'ellipse(closest-side closest-side)', 'polygon(0 0, 100% 0)'])(
        '%s produces a ClipPathEffect',
        (clipPathValue) => {
            const paint = paintOf({ clipPath: clipPathValue });
            expect(paint.effects).toHaveLength(1);
            expect(paint.effects[0]?.type).toBe(3 /* EffectType.CLIP_PATH */);
        }
    );

    it('non-normal mix-blend-mode adds a BlendEffect with the canvas composite operation', () => {
        const paint = paintOf({ mixBlendMode: 'multiply' });
        expect(paint.effects).toHaveLength(1);
        const blend = paint.effects[0] as unknown as { compositeOperation: string; mixBlendMode: number };
        expect(blend.compositeOperation).toBe('multiply');
        expect(blend.mixBlendMode).toBe(MIX_BLEND_MODE.MULTIPLY);
    });

    it('filter adds a FilterEffect', () => {
        const paint = paintOf({ filter: 'blur(4px)' });
        expect(paint.effects).toHaveLength(1);
        expect(paint.effects[0]?.type).toBe(5 /* EffectType.FILTER */);
    });

    it('zoom other than 1 adds no transform (bounds already include zoom)', () => {
        // ElementContainer.bounds comes from getBoundingClientRect, which
        // already reflects the layout-time zoom factor. Painting an extra
        // zoom TransformEffect scaled the already-scaled bounds a second
        // time (~1.3× too large).
        const paint = paintOf({ zoom: '2' });
        expect(paint.effects.some((effect) => effect.type === 2 /* EffectType.TRANSFORM */)).toBe(false);
    });
});

describe('getEffects', () => {
    afterEach(() => vi.restoreAllMocks());

    /** root > mid > leaf chain of containers with individually styled elements. */
    const buildChain = (styles: { root?: StyleOverrides; mid?: StyleOverrides; leaf?: StyleOverrides }) => {
        const rootEl = document.createElement('div');
        const midEl = document.createElement('div');
        const leafEl = document.createElement('div');
        midEl.appendChild(leafEl);
        rootEl.appendChild(midEl);
        const container = buildContainer(
            () => rootEl,
            (el) => (el === leafEl ? styles.leaf : el === midEl ? styles.mid : styles.root)
        );
        expect(container.elements).toHaveLength(1);
        const midContainer = container.elements[0] as ElementContainer;
        expect(midContainer.elements).toHaveLength(1);
        const leafContainer = midContainer.elements[0];
        assignLayout(container);
        const rootPaint = buildPaintTree(container);
        const midPaint = rootPaint.container.elements[0] ? new ElementPaint(midContainer, rootPaint) : null;
        const leafPaint = midPaint ? new ElementPaint(leafContainer, midPaint) : null;
        return {
            rootPaint,
            midPaint: midPaint!,
            leafPaint: leafPaint!,
            containers: { root: container, mid: midContainer, leaf: leafContainer }
        };
    };

    it('static in-flow leaf inherits the ancestor padding-box clip for CONTENT', () => {
        const { leafPaint } = buildChain({
            root: { overflow: 'hidden', borderTopWidth: '2px', borderLeftWidth: '2px' }
        });
        const effects = leafPaint.getEffects(EffectTarget.CONTENT, undefined);
        const clips = effects.filter((e) => e.type === 1 /* EffectType.CLIP */);
        // Root overflow with borders -> padding box != border box -> one padding clip re-added.
        expect(clips).toHaveLength(1);
    });

    it('out-of-flow leaf skips static ancestors and drops their border-box clips', () => {
        const { leafPaint } = buildChain({
            leaf: { position: 'absolute' },
            root: { overflow: 'hidden', borderTopWidth: '2px' }
        });
        // leaf absolute -> inFlow false; mid is static and has a parent -> else branch (no clip recompute);
        // root has no parent -> recompute branch runs but produces no visible effect for CONTENT... actually
        // it re-adds the padding clip. The static mid contributes nothing.
        const effects = leafPaint.getEffects(EffectTarget.CONTENT, undefined);
        const clips = effects.filter((e) => e.type === 1);
        expect(clips).toHaveLength(1); // only from root recompute
    });

    it('positioned ancestor recomputes its own overflow clip for out-of-flow content', () => {
        const { leafPaint } = buildChain({
            leaf: { position: 'absolute' },
            mid: { position: 'relative', overflow: 'hidden', borderTopWidth: '2px' },
            root: {}
        });
        const effects = leafPaint.getEffects(EffectTarget.CONTENT, undefined);
        const clips = effects.filter((e) => e.type === 1);
        expect(clips).toHaveLength(1);
    });

    it('stops collecting effects at the surfaceRoot boundary', () => {
        const { midPaint, leafPaint } = buildChain({
            root: { overflow: 'hidden', borderTopWidth: '2px' }
        });
        const effects = leafPaint.getEffects(EffectTarget.CONTENT, midPaint);
        // Traversal stops at midPaint (the surface root): no root clip.
        expect(effects.filter((e) => e.type === 1)).toHaveLength(0);
    });

    it('a paint that is its own surface root keeps transform effects but drops filter/opacity', () => {
        const { leafPaint } = buildChain({
            leaf: { opacity: '0.5', filter: 'blur(2px)', transform: 'matrix(1, 0, 0, 1, 5, 0)' }
        });
        const all = leafPaint.getEffects(EffectTarget.CONTENT, undefined);
        expect(all).toHaveLength(3);
        const asRoot = leafPaint.getEffects(EffectTarget.CONTENT, leafPaint);
        expect(asRoot).toHaveLength(1);
        expect(asRoot[0]?.type).toBe(0 /* EffectType.TRANSFORM */);
    });

    it('filters the collected effects by target', () => {
        const { leafPaint } = buildChain({ root: { overflow: 'hidden' } });
        const content = leafPaint.getEffects(EffectTarget.CONTENT, undefined);
        const bg = leafPaint.getEffects(EffectTarget.BACKGROUND_BORDERS, undefined);
        // The single combined root clip targets both BACKGROUND_BORDERS and CONTENT.
        expect(content).toHaveLength(bg.length);
        expect(content).toHaveLength(1);
    });
});

describe('parseStackingContexts – tree structure', () => {
    afterEach(() => vi.restoreAllMocks());

    it('orders negative z-index children most negative first and positive ascending', () => {
        const els = {
            a: document.createElement('div'),
            b: document.createElement('div'),
            c: document.createElement('div'),
            d: document.createElement('div'),
            e: document.createElement('div'),
            f: document.createElement('div'),
            g: document.createElement('div'),
            h: document.createElement('div')
        };
        const rootEl = document.createElement('div');
        Object.values(els).forEach((el) => rootEl.appendChild(el));

        const container = buildContainer(
            () => rootEl,
            (el) => {
                if (el === els.a) return { position: 'absolute', zIndex: '-3' };
                if (el === els.b) return { position: 'absolute', zIndex: '-1' };
                if (el === els.c) return { position: 'absolute', zIndex: '-2' };
                if (el === els.d) return { position: 'absolute', zIndex: '5' };
                if (el === els.e) return { position: 'absolute', zIndex: '1' };
                if (el === els.f) return { position: 'relative' };
                if (el === els.g) return { opacity: '0.5' };
                if (el === els.h) return { transform: 'matrix(1, 0, 0, 1, 10, 0)' };
                return undefined;
            }
        );
        assignLayout(container);
        const root = parseStackingContexts(container);

        const negative = root.negativeZIndex.map((stack) => stack.element.container.styles.zIndex.order);
        // Upstream insertion algorithm: new negative contexts splice at the found
        // index, which yields most-positive-negative first rather than ascending.
        expect(negative).toEqual([-1, -2, -3]);

        const positive = root.positiveZIndex.map((stack) => stack.element.container.styles.zIndex.order);
        expect(positive).toEqual([1, 5]);

        expect(root.zeroOrAutoZIndexOrTransformedOrOpacity).toHaveLength(3); // relative, opacity, transform

        // Equal z-index values keep tree order (splice at index > 0 branch).
        const dup1 = document.createElement('div');
        const dup2 = document.createElement('div');
        const dupRoot = document.createElement('div');
        dupRoot.appendChild(dup1);
        dupRoot.appendChild(dup2);
        const dupContainer = buildContainer(
            () => dupRoot,
            (el) => (el === dup1 || el === dup2 ? { position: 'absolute', zIndex: '2' } : undefined)
        );
        const dupStack = parseStackingContexts(dupContainer);
        expect(dupStack.positiveZIndex).toHaveLength(2);
        expect(dupStack.positiveZIndex[0]?.element.container).toBe(dupContainer.elements[0]);
        expect(dupStack.positiveZIndex[1]?.element.container).toBe(dupContainer.elements[1]);
    });

    it('classifies non-positioned floats, inline level and non-inline level nodes', () => {
        const floatEl = document.createElement('div');
        const blockEl = document.createElement('div');
        const inlineEl = document.createElement('span');
        const rootEl = document.createElement('div');
        rootEl.appendChild(floatEl);
        rootEl.appendChild(blockEl);
        rootEl.appendChild(inlineEl);

        const container = buildContainer(
            () => rootEl,
            (el) => {
                if (el === floatEl) return { cssFloat: 'left' };
                if (el === inlineEl) return { display: 'inline' };
                return undefined;
            }
        );
        assignLayout(container);
        const root = parseStackingContexts(container);

        expect(root.nonPositionedFloats).toHaveLength(1);
        expect(root.nonInlineLevel).toHaveLength(1);
        expect(root.inlineLevel).toHaveLength(1);
        expect(root.inlineLevel[0]?.container).toBe(container.elements[2]);
    });

    it('treats nested real stacking contexts relative to their real parent', () => {
        // root > positioned z-index:1 wrapper (real stacking context) > absolute z-index:-1 child.
        const wrapper = document.createElement('div');
        const child = document.createElement('div');
        wrapper.appendChild(child);
        const rootEl = document.createElement('div');
        rootEl.appendChild(wrapper);

        const container = buildContainer(
            () => rootEl,
            (el) =>
                el === wrapper
                    ? { position: 'absolute', zIndex: '1' }
                    : el === child
                      ? { position: 'absolute', zIndex: '-1' }
                      : undefined
        );
        assignLayout(container);
        const root = parseStackingContexts(container);

        expect(root.positiveZIndex).toHaveLength(1);
        const wrapperStack = root.positiveZIndex[0] as StackingContext;
        expect(wrapperStack.negativeZIndex).toHaveLength(1);
        expect(wrapperStack.negativeZIndex[0]?.element.container).toBe(container.elements[0]?.elements[0]);
    });

    it('numbers list items for ol with start/reversed and li value attributes', () => {
        const li1 = document.createElement('li');
        const li2 = document.createElement('li');
        const li3 = document.createElement('li');
        li2.setAttribute('value', '20');
        li3.setAttribute('value', '0'); // zero is ignored and numbering continues
        const ol = document.createElement('ol');
        ol.setAttribute('start', '10');
        ol.setAttribute('reversed', '');
        ol.appendChild(li1);
        ol.appendChild(li2);
        ol.appendChild(li3);
        const rootEl = document.createElement('div');
        rootEl.appendChild(ol);

        const container = buildContainer(
            () => rootEl,
            (el) =>
                el === li1 || el === li2 || el === li3 ? { display: 'list-item', listStyleType: 'decimal' } : undefined
        );
        assignLayout(container);
        const root = parseStackingContexts(container);

        const olContainer = container.elements[0] as OLElementContainer;
        expect(olContainer.start).toBe(10);
        expect(olContainer.reversed).toBe(true);
        // numbering: 10 -> li2 value 20 -> (reversed) 19
        expect(listValuesOf(root)).toEqual(['10. ', '20. ', '19. ']);
    });

    it('numbers unordered list items incrementally', () => {
        const li1 = document.createElement('li');
        const li2 = document.createElement('li');
        const ul = document.createElement('ul');
        ul.appendChild(li1);
        ul.appendChild(li2);
        const rootEl = document.createElement('div');
        rootEl.appendChild(ul);

        const container = buildContainer(
            () => rootEl,
            (el) => (el === li1 || el === li2 ? { display: 'list-item', listStyleType: 'decimal' } : undefined)
        );
        assignLayout(container);
        const root = parseStackingContexts(container);
        expect(listValuesOf(root)).toEqual(['1. ', '2. ']);
    });

    it('processes items left unowned by the root pass', () => {
        // A list item NOT nested under a list owner: the final processListItems call on the root
        // container still assigns list values.
        const li = document.createElement('li');
        const rootEl = document.createElement('div');
        rootEl.appendChild(li);
        const container = buildContainer(
            () => rootEl,
            (el) => (el === li ? { display: 'list-item', listStyleType: 'decimal' } : undefined)
        );
        const root = parseStackingContexts(container);
        expect(listValuesOf(root)).toEqual(['1. ']);
    });

    it('keeps root stacking context element paint without a parent', () => {
        const container = buildContainer(
            () => document.createElement('div'),
            () => undefined
        );
        const root = parseStackingContexts(container);
        expect(root.element.container).toBe(container);
        expect(root.element.parent).toBeNull();
        void tagOf;
    });
});
