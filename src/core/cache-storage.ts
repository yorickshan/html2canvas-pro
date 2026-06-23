import { FEATURES } from './features';
import { Context } from './context';

/**
 * CacheStorage (Deprecated static methods)
 *
 * @deprecated The static methods of CacheStorage are deprecated.
 * Use OriginChecker class instead for instance-based origin checking.
 *
 * For backward compatibility, these methods remain but should not be used in new code.
 */
export class CacheStorage {
    private static _link?: HTMLAnchorElement;
    private static _origin = 'about:blank';

    /**
     * @deprecated Use OriginChecker.getOrigin() instead
     */
    static getOrigin(url: string): string {
        const link = CacheStorage._link;
        if (!link) {
            return 'about:blank';
        }

        link.href = url;
        link.href = link.href; // IE9, LOL! - http://jsfiddle.net/niklasvh/2e48b/
        return link.protocol + link.hostname + link.port;
    }

    /**
     * @deprecated Use OriginChecker.isSameOrigin() instead
     */
    static isSameOrigin(src: string): boolean {
        return CacheStorage.getOrigin(src) === CacheStorage._origin;
    }

    /**
     * @deprecated No longer needed. OriginChecker is created per Context.
     */
    static setContext(window: Window): void {
        CacheStorage._link = window.document.createElement('a');
        CacheStorage._origin = CacheStorage.getOrigin(window.location.href);
    }
}

export interface ResourceOptions {
    imageTimeout: number;
    useCORS: boolean;
    allowTaint: boolean;
    proxy?: string;
    customIsSameOrigin?: (this: void, src: string, oldFn: (src: string) => boolean) => boolean | Promise<boolean>;
    maxCacheSize?: number; // Maximum cache size (default: 100, max: 10000)
}

interface CacheEntry {
    value: Promise<HTMLImageElement | HTMLCanvasElement | undefined>;
}

export class Cache {
    private readonly _cache: Map<string, CacheEntry> = new Map();
    private readonly maxSize: number;
    private readonly _pendingOperations: Map<string, Promise<void>> = new Map();

    constructor(
        private readonly context: Context,
        private readonly _options: ResourceOptions
    ) {
        // Default cache size: 100 items
        this.maxSize = _options.maxCacheSize ?? 100;

        if (this.maxSize < 1) {
            throw new Error('Cache maxSize must be at least 1');
        }

        if (this.maxSize > 10000) {
            this.context.logger.warn(
                `Cache maxSize ${this.maxSize} is very large and may cause memory issues. ` +
                    `Consider using a smaller value (recommended: 100-1000).`
            );
        }
    }

    addImage(src: string): Promise<void> {
        // Wait for any pending operations on this key
        const pending = this._pendingOperations.get(src);
        if (pending) {
            return pending;
        }

        if (this.has(src)) {
            // Move to end for LRU ordering
            const entry = this._cache.get(src)!;
            this._cache.delete(src);
            this._cache.set(src, entry);
            return Promise.resolve();
        }

        if (isBlobImage(src) || isRenderable(src)) {
            // Create a pending operation to ensure atomicity
            const operation = this._addImageInternal(src);
            this._pendingOperations.set(src, operation);
            operation.finally(() => {
                this._pendingOperations.delete(src);
            });

            return operation;
        }

        return Promise.resolve();
    }

    private async _addImageInternal(src: string): Promise<void> {
        const timeoutMs = this._options.imageTimeout ?? 15000;
        const imageWithTimeout = this.withTimeout(
            this.loadImage(src),
            timeoutMs,
            `Timed out (${timeoutMs}ms) loading image`
        );

        // Handle errors to prevent unhandled rejections
        imageWithTimeout.catch((error) => {
            this.context.logger.error(
                `Failed to load image ${src}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        });

        // Store the promise with timeout in cache
        this.set(src, imageWithTimeout);
    }

    private withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
        if (timeoutMs <= 0) {
            return promise;
        }

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
        });

        return Promise.race([promise, timeout]).finally(() => {
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
        });
    }

    match(src: string): Promise<HTMLImageElement | HTMLCanvasElement | undefined> | undefined {
        const entry = this._cache.get(src);
        if (entry) {
            // Move to end for LRU ordering (O(1))
            this._cache.delete(src);
            this._cache.set(src, entry);
            return entry.value;
        }
        return undefined;
    }

    /**
     * Set a value in cache with LRU eviction (O(1) via Map insertion order).
     * Map preserves insertion order; delete+set on access moves items to the end.
     * The first key in Map.keys() is always the least recently used.
     */
    private set(key: string, value: Promise<HTMLImageElement | HTMLCanvasElement | undefined>): void {
        if (this._cache.has(key)) {
            // Update existing entry: move to end of Map
            this._cache.delete(key);
        } else if (this._cache.size >= this.maxSize) {
            // Evict LRU (first key = least recently used) — O(1)
            const lruKey = this._cache.keys().next().value;
            if (lruKey !== undefined) {
                this._cache.delete(lruKey);
                this.context.logger.debug(`Cache: Evicted LRU entry: ${lruKey}`);
            }
        }

        this._cache.set(key, { value });
    }

    /**
     * Get cache size
     */
    size(): number {
        return this._cache.size;
    }

    /**
     * Get max cache size
     */
    getMaxSize(): number {
        return this.maxSize;
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this._cache.clear();
    }

    private async loadImage(key: string): Promise<HTMLImageElement | undefined> {
        const originChecker = this.context.originChecker;
        const defaultIsSameOrigin = (src: string) => originChecker.isSameOrigin(src);

        const isSameOrigin: boolean =
            typeof this._options.customIsSameOrigin === 'function'
                ? await this._options.customIsSameOrigin(key, defaultIsSameOrigin)
                : defaultIsSameOrigin(key);
        const useCORS =
            !isInlineImage(key) && this._options.useCORS === true && FEATURES.SUPPORT_CORS_IMAGES && !isSameOrigin;
        const useProxy =
            !isInlineImage(key) &&
            !isSameOrigin &&
            !isBlobImage(key) &&
            typeof this._options.proxy === 'string' &&
            FEATURES.SUPPORT_CORS_XHR &&
            !useCORS;
        if (
            !isSameOrigin &&
            this._options.allowTaint === false &&
            !isInlineImage(key) &&
            !isBlobImage(key) &&
            !useProxy &&
            !useCORS
        ) {
            return;
        }

        let src = key;
        if (useProxy) {
            src = await this.proxy(src);
        }

        this.context.logger.debug(`Added image ${key.substring(0, 256)}`);

        return await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            //ios safari 10.3 taints canvas with data urls unless crossOrigin is set to anonymous
            if (isInlineBase64Image(src) || useCORS) {
                img.crossOrigin = 'anonymous';
            }
            img.src = src;
            if (img.complete === true) {
                // Inline XML images may fail to parse, throwing an Error later on
                setTimeout(() => resolve(img), 500);
            }
        });
    }

    private has(key: string): boolean {
        return this._cache.has(key);
    }

    keys(): Promise<string[]> {
        return Promise.resolve(Array.from(this._cache.keys()));
    }

    private proxy(src: string): Promise<string> {
        const proxy = this._options.proxy;

        if (!proxy) {
            throw new Error('No proxy defined');
        }

        const key = src.substring(0, 256);

        return new Promise((resolve, reject) => {
            const responseType = FEATURES.SUPPORT_RESPONSE_TYPE ? 'blob' : 'text';
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                if (xhr.status === 200) {
                    if (responseType === 'text') {
                        resolve(xhr.response);
                    } else {
                        const reader = new FileReader();
                        reader.addEventListener('load', () => resolve(reader.result as string), false);
                        reader.addEventListener('error', (e) => reject(e), false);
                        reader.readAsDataURL(xhr.response);
                    }
                } else {
                    reject(`Failed to proxy resource ${key} with status code ${xhr.status}`);
                }
            };

            xhr.onerror = reject;
            const queryString = proxy.indexOf('?') > -1 ? '&' : '?';
            xhr.open('GET', `${proxy}${queryString}url=${encodeURIComponent(src)}&responseType=${responseType}`);

            if (responseType !== 'text' && xhr instanceof XMLHttpRequest) {
                xhr.responseType = responseType;
            }

            if (this._options.imageTimeout) {
                const timeout = this._options.imageTimeout;
                xhr.timeout = timeout;
                xhr.ontimeout = () => reject(`Timed out (${timeout}ms) proxying ${key}`);
            }

            xhr.send();
        });
    }
}

const INLINE_SVG = /^data:image\/svg\+xml/i;
const INLINE_BASE64 = /^data:image\/.*;base64,/i;
const INLINE_IMG = /^data:image\/.*/i;

const isRenderable = (src: string): boolean => FEATURES.SUPPORT_SVG_DRAWING || !isSVG(src);
const isInlineImage = (src: string): boolean => INLINE_IMG.test(src);
const isInlineBase64Image = (src: string): boolean => INLINE_BASE64.test(src);
const isBlobImage = (src: string): boolean => src.substring(0, 4) === 'blob';

const isSVG = (src: string): boolean => src.slice(-3).toLowerCase() === 'svg' || INLINE_SVG.test(src);
