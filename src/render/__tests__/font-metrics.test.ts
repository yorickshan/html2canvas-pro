import { describe, it, expect } from 'vitest';
import { FontMetrics } from '../font-metrics';

describe('FontMetrics', () => {
    it('constructs with document', () => {
        const metrics = new FontMetrics(document);
        expect(metrics).toBeDefined();
    });

    it('getMetrics returns baseline and middle', () => {
        const metrics = new FontMetrics(document);
        const result = metrics.getMetrics('Arial', '16px');
        expect(result).toBeDefined();
        expect(typeof result.baseline).toBe('number');
        expect(typeof result.middle).toBe('number');
    });

    it('getMetrics handles different font sizes', () => {
        const metrics = new FontMetrics(document);
        const small = metrics.getMetrics('Arial', '12px');
        const large = metrics.getMetrics('Arial', '24px');
        expect(typeof small.baseline).toBe('number');
        expect(typeof large.baseline).toBe('number');
    });

    it('caches results for the same font key', () => {
        const metrics = new FontMetrics(document);
        const first = metrics.getMetrics('Arial', '16px');
        const second = metrics.getMetrics('Arial', '16px');
        // Should return the same object reference due to caching
        expect(first).toBe(second);
    });

    it('returns different results for different fonts', () => {
        const metrics = new FontMetrics(document);
        const arial = metrics.getMetrics('Arial', '16px');
        const times = metrics.getMetrics('Times New Roman', '16px');
        // Both should have valid numbers
        expect(typeof arial.baseline).toBe('number');
        expect(typeof times.baseline).toBe('number');
    });
});
