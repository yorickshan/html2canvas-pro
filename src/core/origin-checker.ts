/**
 * Origin Checker
 *
 * Provides origin checking functionality without global static state.
 * Each instance maintains its own anchor element and origin reference.
 *
 * Replaces the static methods in CacheStorage with instance-based approach.
 */
export class OriginChecker {
    private readonly link: HTMLAnchorElement;
    private readonly origin: string;

    constructor(window: Window) {
        if (!window || !window.document) {
            throw new Error('Valid window object required for OriginChecker');
        }

        if (!window.location || !window.location.href) {
            throw new Error('Window object must have valid location');
        }

        this.link = window.document.createElement('a');
        this.origin = this.getOrigin(window.location.href);
    }

    /**
     * Get the origin (protocol + hostname + port) of a URL
     *
     * @param url - URL to parse
     * @returns Origin string (e.g., "https://example.com:8080")
     */
    getOrigin(url: string): string {
        this.link.href = url;
        // IE9 hack: accessing href twice to ensure it's properly parsed
        this.link.href = this.link.href;
        return this.link.protocol + this.link.hostname + this.link.port;
    }

    /**
     * Check if a URL is from the same origin as the context
     *
     * @param src - URL to check
     * @returns true if same origin, false otherwise
     */
    isSameOrigin(src: string): boolean {
        return this.getOrigin(src) === this.origin;
    }

    /**
     * Get the current context origin
     *
     * @returns The origin of the context window
     */
    getContextOrigin(): string {
        return this.origin;
    }
}
