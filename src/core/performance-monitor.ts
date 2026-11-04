import { Logger } from './logger';

/**
 * Performance Metric
 *
 * Represents a single performance measurement
 */
export interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: Record<string, unknown>;
}

/**
 * Performance Summary
 *
 * Aggregated performance data
 */
export interface PerformanceSummary {
    totalDuration: number;
    metrics: PerformanceMetric[];
    breakdown: Array<{
        name: string;
        duration: number;
        percentage: string;
    }>;
}

/**
 * Performance Monitor
 *
 * Tracks performance metrics throughout the rendering pipeline.
 * Provides insights into where time is spent during rendering.
 *
 * Usage:
 * ```typescript
 * // Standalone (logs disabled) or with the render pipeline's context.
 * const monitor = new PerformanceMonitor(null);
 *
 * monitor.start('clone');
 * await cloneDocument();
 * monitor.end('clone');
 *
 * const summary = monitor.getSummary();
 * ```
 */
export class PerformanceMonitor {
    private readonly activeMetrics: Map<string, PerformanceMetric> = new Map();
    private readonly completedMetrics: PerformanceMetric[] = [];
    private readonly enabled: boolean;
    private readonly getTime: () => number;

    constructor(
        private readonly logger: Logger | null,
        enabled: boolean = true
    ) {
        this.enabled = enabled;

        // Fallback for environments without performance.now()
        this.getTime =
            typeof performance !== 'undefined' && typeof performance.now === 'function'
                ? () => performance.now()
                : () => Date.now();
    }

    /**
     * Start measuring a performance metric
     *
     * @param name - Unique name for this metric
     * @param metadata - Optional metadata to attach
     */
    start(name: string, metadata?: Record<string, unknown>): void {
        if (!this.enabled) {
            return;
        }

        if (this.activeMetrics.has(name)) {
            this.logger?.warn(`Performance metric '${name}' already started. Overwriting.`);
        }

        this.activeMetrics.set(name, {
            name,
            startTime: this.getTime(),
            metadata
        });
    }

    /**
     * End measuring a performance metric
     *
     * @param name - Name of the metric to end
     * @returns The completed metric, or undefined if not found
     */
    end(name: string): PerformanceMetric | undefined {
        if (!this.enabled) {
            return undefined;
        }

        const metric = this.activeMetrics.get(name);

        if (!metric) {
            this.logger?.warn(`Performance metric '${name}' not found. Was start() called?`);
            return undefined;
        }

        metric.endTime = this.getTime();
        metric.duration = metric.endTime - metric.startTime;

        this.completedMetrics.push(metric);
        this.activeMetrics.delete(name);

        this.logger?.debug(`⏱️  ${name}: ${metric.duration.toFixed(2)}ms`, metric.metadata);

        return metric;
    }

    /**
     * Measure a synchronous function
     *
     * @param name - Name for this measurement
     * @param fn - Function to measure
     * @param metadata - Optional metadata
     * @returns The function's return value
     */
    measure<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
        this.start(name, metadata);
        try {
            const result = fn();
            this.end(name);
            return result;
        } catch (error) {
            this.end(name);
            throw error;
        }
    }

    /**
     * Measure an asynchronous function
     *
     * @param name - Name for this measurement
     * @param fn - Async function to measure
     * @param metadata - Optional metadata
     * @returns Promise resolving to the function's return value
     */
    async measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
        this.start(name, metadata);
        try {
            const result = await fn();
            this.end(name);
            return result;
        } catch (error) {
            this.end(name);
            throw error;
        }
    }

    /**
     * Get all completed metrics
     *
     * @returns Array of completed performance metrics
     */
    getMetrics(): PerformanceMetric[] {
        return [...this.completedMetrics];
    }

    /**
     * Get a specific metric by name
     *
     * @param name - Metric name
     * @returns The metric, or undefined if not found
     */
    getMetric(name: string): PerformanceMetric | undefined {
        return this.completedMetrics.find((m) => m.name === name);
    }

    /**
     * Get performance summary
     *
     * @returns Aggregated performance data
     */
    getSummary(): PerformanceSummary {
        const totalDuration = this.completedMetrics.reduce((sum, metric) => sum + (metric.duration || 0), 0);

        const breakdown = this.completedMetrics.map((metric) => ({
            name: metric.name,
            duration: metric.duration || 0,
            percentage: totalDuration > 0 ? (((metric.duration || 0) / totalDuration) * 100).toFixed(1) + '%' : '0%'
        }));

        return {
            totalDuration,
            metrics: this.getMetrics(),
            breakdown
        };
    }

    /**
     * Log performance summary to console
     */
    logSummary(): void {
        if (!this.enabled || this.completedMetrics.length === 0 || !this.logger) {
            return;
        }

        const logger = this.logger;
        const summary = this.getSummary();

        logger.info(`\n📊 Performance Summary (Total: ${summary.totalDuration.toFixed(2)}ms):`);

        summary.breakdown
            .sort((a, b) => b.duration - a.duration)
            .forEach((item) => {
                logger.info(
                    `  ${item.name.padEnd(20)} ${item.duration.toFixed(2).padStart(8)}ms  ${item.percentage.padStart(6)}`
                );
            });
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.activeMetrics.clear();
        this.completedMetrics.splice(0);
    }

    /**
     * Check if monitoring is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Get active (uncompleted) metrics
     * Useful for debugging leaked measurements
     */
    getActiveMetrics(): string[] {
        return Array.from(this.activeMetrics.keys());
    }
}
