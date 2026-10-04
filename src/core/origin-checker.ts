/**
 * Origin Checker
 *
 * Provides origin checking functionality without global static state.
 * Each instance maintains its own base URI and origin reference.
 *
 * Replaces the static methods in CacheStorage with instance-based approach.
 */
export class OriginChecker {
    private readonly baseUri: string;
    private readonly origin: string;

    constructor(window: Window) {
        if (!window || !window.document) {
            throw new Error('Valid window object required for OriginChecker');
        }

        if (!window.location || !window.location.href) {
            throw new Error('Window object must have valid location');
        }

        this.baseUri = window.location.href;
        this.origin = this.getOrigin(window.location.href);
    }

    /**
     * Get the origin (protocol + hostname + port) of a URL
     *
     * @param url - URL to parse; relative URLs resolve against the context
     *              window's location, as the anchor element used to
     * @returns Origin string (e.g. "https://example.com:8080"), or an empty
     *          string for unparseable URLs — which never matches and is
     *          therefore treated as cross-origin
     */
    getOrigin(url: string): string {
        // `new URL().origin` replaces the IE9-era double-href anchor hack and
        // is collision-safe for IPv6 hosts.
        try {
            return new URL(url, this.baseUri).origin;
        } catch (e) {
            return '';
        }
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
