/**
 * Base interface for all specialized renderers
 * Each renderer is responsible for rendering a specific aspect of an element
 */
export interface IRenderer {
    /**
     * Render the specified aspect of the element
     */
    render(...args: any[]): void | Promise<void>;
}

/**
 * Common dependencies required by renderers
 */
export interface RendererDependencies {
    ctx: CanvasRenderingContext2D;
    scale: number;
    options: any; // Will be typed more specifically
}

/**
 * Performance tracking for renderers
 */
export interface RenderMetrics {
    renderCount: number;
    totalTime: number;
    averageTime: number;
}
