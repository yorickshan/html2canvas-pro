import { Html2CanvasConfig, type ConfigOptions, setDefaultConfig } from './config';
import { createDefaultValidator, Validator, type ValidationResult } from './core/validator';
import { PerformanceMonitor } from './core/performance-monitor';
import { renderElement } from './core/render-element';
import type { Options } from './options';

export type { Options };

/**
 * Renders an HTML element to a `<canvas>` element.
 *
 * The function clones the target element and its subtree into a hidden iframe,
 * resolves all computed styles, and paints the result onto a canvas —
 * producing a visual snapshot of the DOM as it appears in the browser.
 *
 * @example
 * ```ts
 * import html2canvas from 'html2canvas-pro';
 *
 * const canvas = await html2canvas(document.body, {
 *   backgroundColor: '#ffffff',
 *   scale: 2,
 *   useCORS: true
 * });
 * document.body.appendChild(canvas);
 * ```
 *
 * @param element - The root HTMLElement to render.
 * @param options - Rendering options.
 * @param config  - Advanced configuration. In most cases this is auto-created;
 *                  only pass it if you need to share a cache across multiple calls.
 * @returns A promise that resolves to the rendered HTMLCanvasElement.
 *
 * @throws {Error} If the element is not attached to a document.
 * @throws {DOMException} If an {@link Options.signal|AbortSignal} was provided and the operation was aborted.
 */
const html2canvas = (
    element: HTMLElement,
    options: Partial<Options> = {},
    config?: Html2CanvasConfig
): Promise<HTMLCanvasElement> => {
    const finalConfig =
        config ||
        Html2CanvasConfig.fromElement(element, {
            cspNonce: options.cspNonce,
            cache: options.cache
        });

    return renderElement(element, options, finalConfig);
};

/**
 * Set CSP nonce for inline styles.
 *
 * @deprecated Since 2.0.0. Pass `cspNonce` in options instead:
 *             `html2canvas(element, { cspNonce: '...' })`
 */
const setCspNonce = (nonce: string) => {
    console.warn(
        '[html2canvas-pro] setCspNonce is deprecated. ' +
            'Pass cspNonce in options instead: html2canvas(element, { cspNonce: "..." })'
    );

    if (typeof window !== 'undefined') {
        setDefaultConfig(new Html2CanvasConfig({ window, cspNonce: nonce }));
    }
};

html2canvas.setCspNonce = setCspNonce;

export default html2canvas;
export {
    html2canvas,
    Html2CanvasConfig,
    ConfigOptions,
    Validator,
    ValidationResult,
    createDefaultValidator,
    PerformanceMonitor
};

export { IMAGE_RENDERING } from './css/property-descriptors/image-rendering';
