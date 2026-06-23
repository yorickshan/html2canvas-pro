/**
 * Base interface for all specialized renderers.
 * Each renderer is responsible for rendering a specific aspect of an element.
 *
 * @internal This interface is a structural contract; prefer using concrete
 *           renderer classes (BackgroundRenderer, BorderRenderer, etc.)
 *           directly rather than relying on the generic IRenderer shape.
 */
export interface IRenderer {
    render(...args: unknown[]): void | Promise<void>;
}

/**
 * Common dependencies required by renderers.
 * RenderConfigurations from canvas-renderer.ts provides a concrete type.
 */
export interface RendererDependencies {
    ctx: CanvasRenderingContext2D;
    scale: number;
    options: Record<string, unknown>;
}

/**
 * Performance tracking for renderers.
 */
export interface RenderMetrics {
    renderCount: number;
    totalTime: number;
    averageTime: number;
}
