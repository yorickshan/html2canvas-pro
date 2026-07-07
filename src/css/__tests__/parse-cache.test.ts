import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CSSParsedDeclaration } from '../index';
import { backgroundImage } from '../property-descriptors/background-image';
import { listStyleImage } from '../property-descriptors/list-style-image';
import { borderImageSource } from '../property-descriptors/border-image-source';

vi.mock('../../core/context');
import { Context } from '../../core/context';

vi.mock('../../core/features');

describe('parseCache', () => {
    describe('image-descriptor skipCache flag', () => {
        it('backgroundImage has skipCache: true', () => {
            expect(backgroundImage.skipCache).toBe(true);
        });

        it('listStyleImage has skipCache: true', () => {
            expect(listStyleImage.skipCache).toBe(true);
        });

        it('borderImageSource has skipCache: true', () => {
            expect(borderImageSource.skipCache).toBe(true);
        });
    });

    describe('addImage side effect on repeated parsing', () => {
        /**
         * Regression test for #217: parseCache used to memoize image descriptor
         * results, which skipped the context.cache.addImage() side effect on
         * every render after the first for the same raw CSS value.
         *
         * Because context.cache is recreated per html2canvas() call, addImage
         * MUST be called for every parse() invocation, not just the first one.
         */
        it('calls addImage on every CSSParsedDeclaration construction with same background-image', () => {
            const mockDeclaration = {
                display: 'block',
                backgroundImage: 'url("http://example.com/bg.png")'
            } as unknown as CSSStyleDeclaration;

            // First construction — addImage should be called
            const ctx1 = new Context();
            new CSSParsedDeclaration(ctx1, mockDeclaration);
            expect(ctx1.cache.addImage).toHaveBeenCalledWith('http://example.com/bg.png');

            // Second construction with a different context but same CSS value —
            // addImage MUST be called again (was the bug: cached parse result
            // meant addImage was never called for the second context)
            const ctx2 = new Context();
            new CSSParsedDeclaration(ctx2, mockDeclaration);
            expect(ctx2.cache.addImage).toHaveBeenCalledWith('http://example.com/bg.png');
        });

        it('calls addImage on every CSSParsedDeclaration construction with same list-style-image', () => {
            const mockDeclaration = {
                display: 'block',
                listStyleImage: 'url("http://example.com/list.png")'
            } as unknown as CSSStyleDeclaration;

            const ctx1 = new Context();
            new CSSParsedDeclaration(ctx1, mockDeclaration);
            expect(ctx1.cache.addImage).toHaveBeenCalledWith('http://example.com/list.png');

            const ctx2 = new Context();
            new CSSParsedDeclaration(ctx2, mockDeclaration);
            expect(ctx2.cache.addImage).toHaveBeenCalledWith('http://example.com/list.png');
        });

        it('calls addImage on every CSSParsedDeclaration construction with same border-image-source', () => {
            const mockDeclaration = {
                display: 'block',
                borderImageSource: 'url("http://example.com/border.png")'
            } as unknown as CSSStyleDeclaration;

            const ctx1 = new Context();
            new CSSParsedDeclaration(ctx1, mockDeclaration);
            expect(ctx1.cache.addImage).toHaveBeenCalledWith('http://example.com/border.png');

            const ctx2 = new Context();
            new CSSParsedDeclaration(ctx2, mockDeclaration);
            expect(ctx2.cache.addImage).toHaveBeenCalledWith('http://example.com/border.png');
        });
    });
});
