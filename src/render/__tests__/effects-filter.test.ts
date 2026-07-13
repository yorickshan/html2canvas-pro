import { describe, it, expect } from 'vitest';
import { FilterEffect } from '../effects';

describe('FilterEffect drop-shadow parsing', () => {
    describe('length-first format (standard CSS)', () => {
        it('parses drop-shadow with simple named color', () => {
            const effect = new FilterEffect('drop-shadow(1px 2px 3px red)');
            expect(effect.shadow).toBeDefined();
            expect(effect.shadow!.offsetX).toBe(1);
            expect(effect.shadow!.offsetY).toBe(2);
            expect(effect.shadow!.blur).toBe(3);
            expect(effect.shadow!.color).toBe('red');
            expect(effect.safeFilterString).toBe('');
        });

        it('parses drop-shadow with 2 lengths + color (no blur)', () => {
            const effect = new FilterEffect('drop-shadow(2px 3px blue)');
            expect(effect.shadow).toBeDefined();
            expect(effect.shadow!.offsetX).toBe(2);
            expect(effect.shadow!.offsetY).toBe(3);
            expect(effect.shadow!.blur).toBe(0);
            expect(effect.shadow!.color).toBe('blue');
            expect(effect.safeFilterString).toBe('');
        });

        it('parses drop-shadow with rgba() color', () => {
            const effect = new FilterEffect('drop-shadow(0 1px 2px rgba(0,0,0,.15))');
            expect(effect.shadow).toBeDefined();
            expect(effect.shadow!.offsetX).toBe(0);
            expect(effect.shadow!.offsetY).toBe(1);
            expect(effect.shadow!.blur).toBe(2);
            expect(effect.shadow!.color).toBe('rgba(0,0,0,.15)');
            expect(effect.safeFilterString).toBe('');
        });

        it('parses drop-shadow with hsla() color', () => {
            const effect = new FilterEffect('drop-shadow(3px 4px 5px hsla(240, 100%, 50%, 0.5))');
            expect(effect.shadow).toBeDefined();
            expect(effect.shadow!.offsetX).toBe(3);
            expect(effect.shadow!.offsetY).toBe(4);
            expect(effect.shadow!.blur).toBe(5);
            expect(effect.shadow!.color).toBe('hsla(240, 100%, 50%, 0.5)');
            expect(effect.safeFilterString).toBe('');
        });

        it('parses drop-shadow with hex color', () => {
            const effect = new FilterEffect('drop-shadow(2px 2px 4px #00000055)');
            expect(effect.shadow).toBeDefined();
            expect(effect.shadow!.offsetX).toBe(2);
            expect(effect.shadow!.offsetY).toBe(2);
            expect(effect.shadow!.blur).toBe(4);
            expect(effect.shadow!.color).toBe('#00000055');
            expect(effect.safeFilterString).toBe('');
        });
    });

    describe('color-first format (Tailwind CSS style)', () => {
        it('parses drop-shadow with rgba() color before lengths', () => {
            const effect = new FilterEffect('drop-shadow(rgba(0, 0, 0, 0.15) 0px 1px 2px)');
            expect(effect.shadow).toBeDefined();
            expect(effect.shadow!.offsetX).toBe(0);
            expect(effect.shadow!.offsetY).toBe(1);
            expect(effect.shadow!.blur).toBe(2);
            expect(effect.shadow!.color).toBe('rgba(0, 0, 0, 0.15)');
            expect(effect.safeFilterString).toBe('');
        });

        it('parses drop-shadow with color before 2 lengths (no blur)', () => {
            const effect = new FilterEffect('drop-shadow(rgba(0,0,0,0.1) 1px 2px)');
            expect(effect.shadow).toBeDefined();
            expect(effect.shadow!.offsetX).toBe(1);
            expect(effect.shadow!.offsetY).toBe(2);
            expect(effect.shadow!.blur).toBe(0);
            expect(effect.shadow!.color).toBe('rgba(0,0,0,0.1)');
            expect(effect.safeFilterString).toBe('');
        });
    });

    describe('combined with other filters', () => {
        it('strips drop-shadow while preserving other filters', () => {
            const effect = new FilterEffect('blur(5px) drop-shadow(rgba(0,0,0,.15) 1px 2px 3px) contrast(1.5)');
            expect(effect.shadow).toBeDefined();
            expect(effect.shadow!.offsetX).toBe(1);
            expect(effect.shadow!.offsetY).toBe(2);
            expect(effect.shadow!.blur).toBe(3);
            expect(effect.shadow!.color).toBe('rgba(0,0,0,.15)');
            expect(effect.safeFilterString).toBe('blur(5px) contrast(1.5)');
        });

        it('handles filter with no drop-shadow', () => {
            const effect = new FilterEffect('blur(5px) contrast(1.5)');
            expect(effect.shadow).toBeUndefined();
            expect(effect.safeFilterString).toBe('blur(5px) contrast(1.5)');
        });

        it('handles empty filter string', () => {
            const effect = new FilterEffect('');
            expect(effect.shadow).toBeUndefined();
            expect(effect.safeFilterString).toBe('');
        });

        it('handles undefined/null filter (via empty string)', () => {
            // The filter is parsed from CSS; the empty-string case covers the
            // 'none' case because CSSParsedDeclaration.normalizeFilter already
            // converts 'none' to '' before constructing FilterEffect.
            const effect = new FilterEffect('');
            expect(effect.shadow).toBeUndefined();
            expect(effect.safeFilterString).toBe('');
        });

        it('strips multiple drop-shadows', () => {
            const effect = new FilterEffect(
                'drop-shadow(rgba(0,0,0,0.1) 0 1px 2px) blur(3px) drop-shadow(#f00 3px 3px 0)'
            );
            // Only the first drop-shadow is parsed for shadow params
            expect(effect.shadow).toBeDefined();
            expect(effect.safeFilterString).toBe('blur(3px)');
        });
    });
});
