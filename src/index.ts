import { Html2CanvasConfig, ConfigOptions, setDefaultConfig } from './config';
import { createDefaultValidator, Validator, ValidationResult } from './core/validator';
import { PerformanceMonitor } from './core/performance-monitor';
import { renderElement } from './core/render-element';

export type { Options } from './options';

/**
 * Main html2canvas function with improved configuration management
 *
 * @param element - Element to render
 * @param options - Rendering options
 * @param config - Optional configuration (for advanced use cases)
 * @returns Promise resolving to rendered canvas
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
 * Set CSP nonce for inline styles
 * @deprecated Use options.cspNonce instead
 */
const setCspNonce = (nonce: string) => {
    console.warn(
        '[html2canvas-pro] setCspNonce is deprecated. ' +
            'Pass cspNonce in options instead: html2canvas(element, { cspNonce: "..." })'
    );

    // For backward compatibility, set default config
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
