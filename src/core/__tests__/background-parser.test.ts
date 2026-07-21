import { describe, it, expect } from 'vitest';
import { parseBackgroundColor } from '../background-parser';
import { Context } from '../context';
import { Html2CanvasConfig } from '../../config';
import { Bounds } from '../../css/layout/bounds';
import { COLORS } from '../../css/types/color';

/**
 * parseBackgroundColor relies on getComputedStyle for real DOM integration.
 * These tests verify the public API contract — return type, null/undefined
 * override handling, and colour parsing.
 */
describe('parseBackgroundColor', () => {
    let ctx: Context;
    let htmlElement: HTMLElement;
    let bodyElement: HTMLElement;
    let el: HTMLElement;

    beforeEach(() => {
        // Use jsdom's real DOM to satisfy getComputedStyle requirements.
        htmlElement = document.documentElement;
        bodyElement = document.body;
        htmlElement.style.backgroundColor = 'transparent';
        bodyElement.style.backgroundColor = 'transparent';

        const mockWin = {
            location: { href: 'http://example.com' },
            getComputedStyle: (el: Element) => window.getComputedStyle(el),
            document: {
                documentElement: htmlElement,
                body: bodyElement,
                createElement: (_tag: string) => {
                    let _href = '';
                    return {
                        set href(value: string) {
                            _href = value;
                        },
                        get href() {
                            return _href;
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
                    };
                }
            }
        } as unknown as Window;

        const config = new Html2CanvasConfig({ window: mockWin });
        ctx = new Context(
            { logging: false, imageTimeout: 1000, useCORS: false, allowTaint: false },
            new Bounds(0, 0, 800, 600),
            config
        );

        el = {
            ownerDocument: { documentElement: htmlElement, body: bodyElement }
        } as HTMLElement;
    });

    it('returns TRANSPARENT when override is null', () => {
        expect(parseBackgroundColor(ctx, el, null)).toBe(COLORS.TRANSPARENT);
    });

    it('returns opaque white when override is undefined', () => {
        expect(parseBackgroundColor(ctx, el)).toBe(0xffffffff);
    });

    it('parses a named colour override', () => {
        expect(parseBackgroundColor(ctx, el, 'red')).toBe(0xff0000ff);
    });

    it('returns a value typed as Color (number)', () => {
        const result: number = parseBackgroundColor(ctx, el);
        expect(typeof result).toBe('number');
    });
});
