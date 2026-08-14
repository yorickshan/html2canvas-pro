/**
 * Regression tests for issue #228: textareas must wrap their value at the
 * element width (or honour wrap="off" / white-space: pre by not wrapping).
 */
import { describe, it, expect } from 'vitest';
import { wrapTextToWidth } from '../content-renderer';

const mockCtx = (widthPerChar = 8): CanvasRenderingContext2D =>
    ({ measureText: (text: string) => ({ width: text.length * widthPerChar }) }) as unknown as CanvasRenderingContext2D;

describe('wrapTextToWidth (issue #228)', () => {
    it('wraps a long paragraph at word boundaries to fit the width', () => {
        const text = 'Lorem ipsum dolor sit amet consectetur';
        const lines = wrapTextToWidth(mockCtx(), text, 80, false);
        // 8px/char, 80px max -> ~10 chars per line
        expect(lines.length).toBeGreaterThan(1);
        // re-joining the wrapped lines reconstructs the original text
        expect(lines.join('').replace(/\s+/g, ' ').trim()).toBe(text);
        // every line except a possible final over-wide word fits the width
        expect(lines.slice(0, -1).every((line) => line.length * 8 <= 80)).toBe(true);
    });

    it('preserves hard line breaks', () => {
        const lines = wrapTextToWidth(mockCtx(), 'first line\nsecond line', 1000, false);
        expect(lines).toEqual(['first line', 'second line']);
    });

    it('does not wrap when noWrap is set (white-space: pre / wrap="off")', () => {
        const text = 'this is a very long line that must not wrap anywhere';
        const lines = wrapTextToWidth(mockCtx(), text, 40, true);
        expect(lines).toEqual([text]);
    });

    it('keeps a word wider than the width on its own line (overflow)', () => {
        const lines = wrapTextToWidth(mockCtx(), 'supercalifragilistic short', 50, false);
        expect(lines[0]).toBe('supercalifragilistic');
        expect(lines[1]).toBe(' short');
    });

    it('handles empty text', () => {
        expect(wrapTextToWidth(mockCtx(), '', 100, false)).toEqual(['']);
    });
});
