import { parseSimpleFilter, filterOutset } from '../filter-surface';

describe('simple filter surface', () => {
    it('supports computed blur followed by a functional-color shadow', () => {
        expect(parseSimpleFilter('blur(4px) drop-shadow(rgba(0, 0, 0, 0.6) 12px -8px 8px)')).toEqual({
            blur: 4,
            shadow: { x: 12, y: -8, blur: 8, color: 'rgba(0, 0, 0, 0.6)' }
        });
    });

    it.each([null, '', 'none'])('handles the opacity-only path: %s', (value) => {
        expect(parseSimpleFilter(value)).toEqual({ blur: 0 });
    });

    it.each([
        'contrast(2)',
        'url(#filter)',
        'blur(2em)',
        'drop-shadow(0px 0px 2px red) blur(4px)',
        'drop-shadow(0px 0px 2px red) drop-shadow(4px 4px 1px blue)'
    ])('retains unsupported chains on the existing renderer path: %s', (value) => {
        expect(parseSimpleFilter(value)).toBeNull();
    });

    it('pads for both blurs and the largest signed shadow offset', () => {
        expect(filterOutset({ blur: 4, shadow: { x: -20, y: 8, blur: 10, color: 'black' } })).toBe(62);
        expect(filterOutset({ blur: 0 })).toBe(0);
    });
});
