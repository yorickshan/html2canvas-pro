import { describe, expect, it } from 'vitest';
import { filterOutset, nativeFilterString, parseFilterChain } from '../filter-surface';

describe('parseFilterChain', () => {
    it('parses blur followed by a functional-color shadow (order-independent body)', () => {
        expect(parseFilterChain('blur(4px) drop-shadow(rgba(0, 0, 0, 0.6) 12px -8px 8px)')).toEqual({
            functions: [
                { kind: 'blur', value: 4 },
                { kind: 'drop-shadow', x: 12, y: -8, blur: 8, color: 'rgba(0, 0, 0, 0.6)' }
            ]
        });
    });

    it.each([null, '', 'none'])('handles the empty path: %s', (value) => {
        expect(parseFilterChain(value)).toEqual({ functions: [] });
    });

    it('parses unitless functions with numbers and percentages', () => {
        expect(parseFilterChain('brightness(2) saturate(150%) contrast(0.5)')).toEqual({
            functions: [
                { kind: 'unitless', name: 'brightness', value: 2 },
                { kind: 'unitless', name: 'saturate', value: 1.5 },
                { kind: 'unitless', name: 'contrast', value: 0.5 }
            ]
        });
    });

    it('normalises hue-rotate angle units to degrees', () => {
        expect(parseFilterChain('hue-rotate(90deg)')).toEqual({
            functions: [{ kind: 'unitless', name: 'hue-rotate', value: 90 }]
        });
        expect(parseFilterChain('hue-rotate(0.25turn)')).toEqual({
            functions: [{ kind: 'unitless', name: 'hue-rotate', value: 90 }]
        });
    });

    it('preserves declaration order across mixed functions', () => {
        const parsed = parseFilterChain('brightness(1.2) blur(2px) drop-shadow(2px 2px 2px red) saturate(0.5)');
        expect(parsed).not.toBeNull();
        expect((parsed as { functions: Array<{ kind: string }> }).functions.map((fn) => fn.kind)).toEqual([
            'unitless',
            'blur',
            'drop-shadow',
            'unitless'
        ]);
    });

    it('accepts multiple blurs and inverted shadow order (native can express them)', () => {
        expect(parseFilterChain('drop-shadow(1px 2px 3px blue) blur(2px) blur(3px)')).not.toBeNull();
    });

    it.each([
        'url(#filter)',
        'blur(2em)',
        'blur(5)',
        'blur(-5px)',
        'blur(5%)',
        'blur(5pxpx)',
        'brightness(gone)',
        'hue-rotate(90)',
        'drop-shadow(0 0 2px red)',
        'brightness(2) blur(3px) url(#f)'
    ])('rejects chains the backends cannot express: %s', (value) => {
        expect(parseFilterChain(value)).toBeNull();
    });

    it('defaults an omitted drop-shadow blur to zero', () => {
        expect(parseFilterChain('drop-shadow(1px 2px)')).toEqual({
            functions: [{ kind: 'drop-shadow', x: 1, y: 2, blur: 0, color: 'rgba(0, 0, 0, 0)' }]
        });
    });
});

describe('nativeFilterString', () => {
    it('scales device-space lengths and leaves unitless functions untouched', () => {
        const filter = parseFilterChain('brightness(2) blur(3px) drop-shadow(4px 5px 6px rgba(0, 0, 0, 0.5))');
        expect(nativeFilterString(filter as NonNullable<ReturnType<typeof parseFilterChain>>, 2)).toBe(
            'brightness(2) blur(6px) drop-shadow(8px 10px 12px rgba(0, 0, 0, 0.5))'
        );
    });

    it('renders hue-rotate in degrees', () => {
        const filter = parseFilterChain('hue-rotate(0.25turn)');
        expect(nativeFilterString(filter as NonNullable<ReturnType<typeof parseFilterChain>>, 1)).toBe(
            'hue-rotate(90deg)'
        );
    });
});

describe('filterOutset', () => {
    it('pads for blur and the largest signed shadow offset', () => {
        expect(
            filterOutset({
                functions: [
                    { kind: 'blur', value: 4 },
                    { kind: 'drop-shadow', x: -20, y: 8, blur: 10, color: 'black' }
                ]
            })
        ).toBe(62);
        expect(filterOutset({ functions: [] })).toBe(0);
    });

    it('sums consecutive blurs', () => {
        expect(
            filterOutset({
                functions: [
                    { kind: 'blur', value: 2 },
                    { kind: 'blur', value: 3 }
                ]
            })
        ).toBe(15);
    });
});
