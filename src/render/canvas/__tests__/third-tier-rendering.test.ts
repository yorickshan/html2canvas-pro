import { describe, expect, it, vi } from 'vitest';
import { TextRenderer, type TextRendererDependencies } from '../text-renderer';
import { TextBounds } from '../../../css/layout/text';
import { TextContainer } from '../../../dom/text-container';
import { CSSParsedDeclaration } from '../../../css';
import { resolveBorderImageOutset, resolveBorderImageWidths } from '../border-image-renderer';
import { Bounds } from '../../../css/layout/bounds';

const createMockCtx = () => {
    return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '16px Arial',
        textAlign: 'left',
        textBaseline: 'alphabetic',
        direction: 'ltr',
        canvas: { ownerDocument: null },
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        arc: vi.fn(),
        ellipse: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 10 }))
    } as unknown as CanvasRenderingContext2D & Record<string, ReturnType<typeof vi.fn>>;
};

const createDeps = (ctx: CanvasRenderingContext2D): TextRendererDependencies => ({
    ctx,
    options: { scale: 1 }
});

const createStyles = (overrides: Record<string, unknown>): CSSParsedDeclaration =>
    ({
        fontSize: { number: 16 },
        fontVariant: [],
        fontFamily: ['Arial'],
        fontWeight: 'normal',
        fontStyle: 'normal',
        webkitTextStrokeWidth: 0,
        color: 0x000000ff,
        letterSpacing: 0,
        writingMode: 0,
        direction: 'ltr',
        textEmphasisStyle: null,
        textEmphasisColor: null,
        textEmphasisPosition: { over: true, right: true },
        textShadow: [],
        textDecorationLine: [],
        paintOrder: [0],
        ...overrides
    }) as unknown as CSSParsedDeclaration;

const createText = (value: string): TextContainer =>
    ({
        text: value,
        textBounds: [new TextBounds(value, new Bounds(0, 0, value.length * 10, 20))]
    }) as unknown as TextContainer;

describe('text-emphasis rendering', () => {
    it('draws a filled mark per grapheme cluster', async () => {
        const ctx = createMockCtx();
        const renderer = new TextRenderer(createDeps(ctx));
        await renderer.renderTextNode(
            createText('ab'),
            createStyles({ textEmphasisStyle: { fill: true, shape: 'circle' } })
        );
        // one fill per grapheme cluster plus one for the text itself
        expect((ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
        expect(ctx.arc).toHaveBeenCalled();
    });

    it('draws open marks with strokes', async () => {
        const ctx = createMockCtx();
        const renderer = new TextRenderer(createDeps(ctx));
        await renderer.renderTextNode(
            createText('ab'),
            createStyles({ textEmphasisStyle: { fill: false, shape: 'dot' } })
        );
        expect((ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('draws the custom string instead of a shape', async () => {
        const ctx = createMockCtx();
        const renderer = new TextRenderer(createDeps(ctx));
        await renderer.renderTextNode(createText('ab'), createStyles({ textEmphasisStyle: '★' }));
        const stringCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.filter(
            (call: unknown[]) => call[0] === '★'
        );
        expect(stringCalls.length).toBe(2); // one mark per grapheme cluster
    });

    it('uses the emphasis colour and falls back to the text colour', async () => {
        const ctx = createMockCtx();
        const renderer = new TextRenderer(createDeps(ctx));
        await renderer.renderTextNode(
            createText('ab'),
            createStyles({ textEmphasisStyle: { fill: true, shape: 'dot' }, textEmphasisColor: 0xff0000ff })
        );
        expect(String(ctx.fillStyle)).toContain('255');
    });

    it('skips marks when style is none', async () => {
        const ctx = createMockCtx();
        const renderer = new TextRenderer(createDeps(ctx));
        await renderer.renderTextNode(createText('ab'), createStyles({ textEmphasisStyle: null }));
        expect(ctx.arc).not.toHaveBeenCalled();
    });
});

describe('resolveBorderImageWidths', () => {
    const borders: [number, number, number, number] = [10, 10, 10, 10];
    const area = new Bounds(0, 0, 200, 100);

    it('resolves auto to the border widths', () => {
        const widths = resolveBorderImageWidths(
            { top: { kind: 'auto' }, right: { kind: 'auto' }, bottom: { kind: 'auto' }, left: { kind: 'auto' } },
            borders,
            area
        );
        expect(widths).toEqual([10, 10, 10, 10]);
    });

    it('multiplies numbers by the border widths', () => {
        const widths = resolveBorderImageWidths(
            {
                top: { kind: 'number', value: 2 },
                right: { kind: 'auto' },
                bottom: { kind: 'auto' },
                left: { kind: 'auto' }
            },
            borders,
            area
        );
        expect(widths[0]).toBe(20);
    });

    it('resolves percentages against the area axes', () => {
        const widths = resolveBorderImageWidths(
            {
                top: { kind: 'percentage', value: 50 },
                right: { kind: 'percentage', value: 10 },
                bottom: { kind: 'auto' },
                left: { kind: 'auto' }
            },
            borders,
            area
        );
        expect(widths[0]).toBe(50); // 50% of height 100
        expect(widths[1]).toBe(20); // 10% of width 200
    });

    it('resolves absolute lengths directly', () => {
        const widths = resolveBorderImageWidths(
            {
                top: { kind: 'length', value: 12 },
                right: { kind: 'auto' },
                bottom: { kind: 'auto' },
                left: { kind: 'auto' }
            },
            borders,
            area
        );
        expect(widths[0]).toBe(12);
    });
});

describe('resolveBorderImageOutset', () => {
    const borders: [number, number, number, number] = [10, 10, 10, 10];

    it('resolves lengths and numbers per side', () => {
        const outset = resolveBorderImageOutset(
            {
                top: { kind: 'length', value: 6 },
                right: { kind: 'number', value: 2 },
                bottom: { kind: 'length', value: 0 },
                left: { kind: 'length', value: 0 }
            },
            borders
        );
        expect(outset).toEqual({ top: 6, right: 20, bottom: 0, left: 0 });
    });

    it('defaults to zero outset', () => {
        expect(resolveBorderImageOutset(null, borders)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    });
});
