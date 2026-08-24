import { describe, expect, it } from 'vitest';
import { Bounds } from '../../../css/layout/bounds';
import { inputTextClipBounds } from '../content-renderer';

describe('inputTextClipBounds (issue #232)', () => {
    it('uses the padding box vertically when the content box is shorter than the font', () => {
        const contentBounds = new Bounds(9, 9, 382, 7);
        const paddingBounds = new Bounds(1, 1, 398, 23);

        expect(inputTextClipBounds(contentBounds, paddingBounds, 17)).toEqual(new Bounds(9, 1, 382, 23));
    });

    it('keeps the content box when it can contain the font', () => {
        const contentBounds = new Bounds(9, 9, 382, 17);
        const paddingBounds = new Bounds(1, 1, 398, 33);

        expect(inputTextClipBounds(contentBounds, paddingBounds, 17)).toBe(contentBounds);
    });
});
