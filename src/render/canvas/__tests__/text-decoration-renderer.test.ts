import { describe, expect, it, vi } from 'vitest';
import { TextDecorationRenderer } from '../text/text-decoration-renderer';
import { Bounds } from '../../../css/layout/bounds';
import { TEXT_DECORATION_LINE } from '../../../css/property-descriptors/text-decoration-line';
import { TEXT_DECORATION_STYLE } from '../../../css/property-descriptors/text-decoration-style';

const styles = (overrides: Record<string, unknown> = {}): unknown =>
    ({
        color: 0xff0000ff,
        textDecorationColor: 0xff0000ff,
        textDecorationLine: [TEXT_DECORATION_LINE.UNDERLINE],
        textDecorationStyle: TEXT_DECORATION_STYLE.SOLID,
        textDecorationThickness: undefined,
        textUnderlineOffset: undefined,
        fontSize: { number: 16 },
        ...overrides
    }) as never;

describe('TextDecorationRenderer', () => {
    it('keeps a transparent decoration colour instead of falling back to the text colour', () => {
        // Color is a number and transparent is 0x00000000 — the old `||`
        // fallback treated it as missing and painted the underline red.
        const ctx = {
            fillStyle: '',
            fillRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn()
        } as unknown as CanvasRenderingContext2D;
        new TextDecorationRenderer(ctx).render(new Bounds(0, 0, 100, 20), styles({ textDecorationColor: 0 }) as never);

        expect(ctx.fillStyle).toBe('rgba(0,0,0,0)');
    });

    it('falls back to the text colour only when the decoration colour is undefined', () => {
        const ctx = {
            fillStyle: '',
            fillRect: vi.fn()
        } as unknown as CanvasRenderingContext2D;
        new TextDecorationRenderer(ctx).render(
            new Bounds(0, 0, 100, 20),
            styles({ textDecorationColor: undefined }) as never
        );

        expect(ctx.fillStyle).toBe('rgb(255,0,0)');
    });
});
