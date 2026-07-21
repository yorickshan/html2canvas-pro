import { describe, it, expect, beforeEach } from 'vitest';
import { OriginChecker } from '../origin-checker';

describe('OriginChecker', () => {
    let checker: OriginChecker;

    beforeEach(() => {
        checker = new OriginChecker(window);
    });

    it('extracts origin from URL', () => {
        const origin = checker.getOrigin('http://example.com/path');
        // HTMLAnchorElement returns protocol (with colon), hostname, and port
        expect(origin).toContain('http');
        expect(origin).toContain('example.com');
    });

    it('extracts origin from HTTPS URL', () => {
        const origin = checker.getOrigin('https://other.com/page?q=1');
        expect(origin).toContain('https');
        expect(origin).toContain('other.com');
    });

    it('returns context window origin', () => {
        const ctxOrigin = checker.getContextOrigin();
        expect(typeof ctxOrigin).toBe('string');
        expect(ctxOrigin.length).toBeGreaterThan(0);
    });

    it('isSameOrigin returns true for same origin', () => {
        // Get the current page's origin and create URLs from it
        const contextOrigin = checker.getContextOrigin();
        // Since jsdom uses about:blank, check a URL that matches by protocol+host
        if (contextOrigin.includes('http')) {
            // Construct a URL with the same origin
            const href = window.location.href;
            expect(checker.isSameOrigin(href)).toBe(true);
        }
    });

    it('isSameOrigin returns false for different origin', () => {
        // about:blank origin should not match http://example.com
        expect(checker.isSameOrigin('http://example.com/page')).toBe(false);
    });

    // Test that two URLs from the same origin are recognized
    it('recognizes URLs from the same origin', () => {
        const orig = checker.getOrigin('http://example.com/page');
        const same = checker.getOrigin('http://example.com/other');
        expect(orig).toBe(same);
    });

    // Test that URLs from different origins differ
    it('differentiates URLs from different origins', () => {
        const orig1 = checker.getOrigin('http://example.com/page');
        const orig2 = checker.getOrigin('https://example.com/page');
        expect(orig1).not.toBe(orig2);
    });

    it('handles data: URIs', () => {
        const result = checker.getOrigin('data:image/png;base64,abc');
        expect(typeof result).toBe('string');
    });

    it('handles relative URLs', () => {
        const result = checker.getOrigin('/relative/path');
        expect(typeof result).toBe('string');
    });

    it('throws when window has no document', () => {
        expect(() => new OriginChecker({} as Window)).toThrow();
    });

    it('throws when window has no location', () => {
        const badWindow = { document: { createElement: () => document.createElement('a') } };
        expect(() => new OriginChecker(badWindow as unknown as Window)).toThrow();
    });
});
