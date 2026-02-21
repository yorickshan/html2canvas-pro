import { Cache } from './core/cache-storage';

/**
 * Configuration options for Html2Canvas
 *
 * This class manages global configuration without using module-level static variables.
 * Each html2canvas invocation can have its own configuration instance.
 */
export interface ConfigOptions {
    /**
     * Window object to use for DOM operations
     */
    window?: Window;

    /**
     * CSP nonce for inline styles
     * See: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
     */
    cspNonce?: string;

    /**
     * Cache instance to reuse across multiple calls
     * Useful for avoiding redundant image loads
     */
    cache?: Cache;
}

/**
 * Html2Canvas Configuration
 *
 * Manages configuration state for html2canvas rendering.
 * Eliminates the need for global static variables.
 */
export class Html2CanvasConfig {
    readonly window: Window;
    readonly cspNonce?: string;
    readonly cache?: Cache;

    constructor(options: ConfigOptions = {}) {
        // Try to get window from options first, then fall back to global window
        this.window = options.window || (typeof window !== 'undefined' ? window : (null as any));

        if (!this.window) {
            throw new Error('Window object is required but not available');
        }

        this.cspNonce = options.cspNonce;
        this.cache = options.cache;
    }

    /**
     * Create configuration from an element
     * Extracts window from element's owner document
     */
    static fromElement(element: HTMLElement, options: Partial<ConfigOptions> = {}): Html2CanvasConfig {
        const ownerDocument = element.ownerDocument;

        if (!ownerDocument) {
            throw new Error('Element is not attached to a document');
        }

        const defaultView = ownerDocument.defaultView;

        if (!defaultView) {
            throw new Error('Document is not attached to a window');
        }

        return new Html2CanvasConfig({
            window: defaultView,
            ...options
        });
    }

    /**
     * Clone configuration with override options
     */
    clone(options: Partial<ConfigOptions> = {}): Html2CanvasConfig {
        return new Html2CanvasConfig({
            window: options.window || this.window,
            cspNonce: options.cspNonce ?? this.cspNonce,
            cache: options.cache ?? this.cache
        });
    }
}

/**
 * Default global configuration (for backward compatibility)
 * @deprecated Use Html2CanvasConfig instances instead
 */
let _defaultConfig: Html2CanvasConfig | null = null;

/**
 * Set default configuration
 * @deprecated Pass configuration directly to html2canvas instead
 */
export function setDefaultConfig(config: Html2CanvasConfig): void {
    console.warn('[html2canvas-pro] setDefaultConfig is deprecated. Pass configuration to html2canvas directly.');
    _defaultConfig = config;
}

/**
 * Get default configuration
 * @deprecated Pass configuration directly to html2canvas instead
 */
export function getDefaultConfig(): Html2CanvasConfig | null {
    return _defaultConfig;
}
