import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerformanceMonitor } from '../performance-monitor';

describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        monitor = new PerformanceMonitor(null, true);
    });

    it('start and end track a metric', () => {
        monitor.start('test');
        const metric = monitor.end('test');
        expect(metric).toBeDefined();
        expect(metric!.name).toBe('test');
        expect(metric!.duration).toBeGreaterThanOrEqual(0);
    });

    it('getMetrics returns completed metrics', () => {
        monitor.start('a');
        monitor.end('a');
        expect(monitor.getMetrics().length).toBe(1);
    });

    it('getMetric retrieves by name', () => {
        monitor.start('specific');
        monitor.end('specific');
        const m = monitor.getMetric('specific');
        expect(m).toBeDefined();
        expect(m!.name).toBe('specific');
    });

    it('getMetric returns undefined for unknown name', () => {
        expect(monitor.getMetric('nonexistent')).toBeUndefined();
    });

    it('disabled monitor does not track', () => {
        const disabled = new PerformanceMonitor(null, false);
        disabled.start('x');
        const m = disabled.end('x');
        expect(m).toBeUndefined();
        expect(disabled.getMetrics().length).toBe(0);
    });

    it('isEnabled reflects constructor param', () => {
        expect(new PerformanceMonitor(null, true).isEnabled()).toBe(true);
        expect(new PerformanceMonitor(null, false).isEnabled()).toBe(false);
    });

    it('clear removes all metrics', () => {
        monitor.start('a');
        monitor.end('a');
        monitor.start('b');
        monitor.end('b');
        monitor.clear();
        expect(monitor.getMetrics().length).toBe(0);
    });

    it('getSummary returns breakdown', () => {
        monitor.start('x');
        monitor.end('x');
        const summary = monitor.getSummary();
        expect(summary.totalDuration).toBeGreaterThanOrEqual(0);
        expect(summary.breakdown.length).toBe(1);
        expect(summary.breakdown[0].name).toBe('x');
    });

    it('getActiveMetrics returns active metric names', () => {
        monitor.start('active1');
        monitor.start('active2');
        expect(monitor.getActiveMetrics()).toContain('active1');
        expect(monitor.getActiveMetrics()).toContain('active2');
        monitor.end('active1');
        expect(monitor.getActiveMetrics()).not.toContain('active1');
    });

    it('end without start returns undefined', () => {
        expect(monitor.end('never_started')).toBeUndefined();
    });

    it('measure sync function', () => {
        const result = monitor.measure('sync', () => 42);
        expect(result).toBe(42);
        expect(monitor.getMetric('sync')).toBeDefined();
    });
});
