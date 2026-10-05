import { FEATURES } from './features';
import { Context } from './context';
import { throwIfAborted } from './abort-helper';
import {
    DEFAULT_IMAGE_CACHE_SIZE,
    DEFAULT_IMAGE_TIMEOUT_MS,
    INLINE_IMAGE_RESOLVE_DELAY_MS,
    MAX_IMAGE_CACHE_SIZE,
    RESOURCE_KEY_LOG_LENGTH
} from './constants';

export interface ResourceOptions {
    imageTimeout: number;
    useCORS: boolean;
    allowTaint: boolean;
    proxy?: string;
    customIsSameOrigin?: (this: void, src: string, oldFn: (src: string) => boolean) => boolean | Promise<boolean>;
    /**
     * LRU cap for normal-mode (immediate) loads. Default: 100.
     * Suspended between startDefer() and preloadAll() so every image collected
     * during a render stays available to the renderer, which never reloads.
     */
    maxCacheSize?: number;
}

interface CacheEntry {
    value: Promise<HTMLImageElement | HTMLCanvasElement | undefined>;
}

export class Cache {
    private readonly _cache: Map<string, CacheEntry> = new Map();
    private readonly maxSize: number;
    private readonly _pendingOperations: Map<string, Promise<void>> = new Map();

    /** When true, addImage() collects URLs without starting loads. */
    private _deferMode = false;
    /** URLs collected during defer mode, pending batch preload. */
    private _collectedUrls: Set<string> = new Set();
    /**
     * Eviction is suspended between startDefer() and the end of preloadAll():
     * the render pipeline loads every image it is going to paint inside that
     * window, and match() never reloads, so an LRU eviction there would
     * silently drop images from the output on pages with more unique images
     * than maxSize.
     *
     * A counter (not a flag) keeps nested/overlapping defer windows — e.g.
     * two renders sharing one cache via `config.cache` — suspended until the
     * last one finishes preloading.
     */
    private _evictionSuspendCount = 0;

    private get _evictionEnabled(): boolean {
        return this._evictionSuspendCount === 0;
    }

    constructor(
        private readonly context: Context,
        private readonly _options: ResourceOptions
    ) {
        // Default cache size: 100 items
        this.maxSize = _options.maxCacheSize ?? DEFAULT_IMAGE_CACHE_SIZE;

        if (this.maxSize < 1) {
            throw new Error('Cache maxSize must be at least 1');
        }

        if (this.maxSize > MAX_IMAGE_CACHE_SIZE) {
            this.context.logger.warn(
                `Cache maxSize ${this.maxSize} is very large and may cause memory issues. ` +
                    `Consider using a smaller value (recommended: 100-1000).`
            );
        }
    }

    /**
     * Enter defer mode: subsequent addImage() calls only collect URLs.
     * Call preloadAll() to exit defer mode and batch-load all URLs.
     */
    startDefer(): void {
        this._deferMode = true;
        this._evictionSuspendCount++;
    }

    /**
     * Exit defer mode and load all collected URLs in parallel, respecting
     * an optional concurrency cap to avoid overwhelming the browser's network
     * stack (default: 10 concurrent loads).
     * After this call returns, all images are either loaded (cache hit) or
     * failed (logged and reported via onError). Subsequent cache.match()
     * calls return immediately.
     *
     * @param concurrency - Max concurrent image loads (1–100, default 10).
     * @param onProgress - Invoked once before loading and after each settled
     *   batch with (settledCount, totalCount), enabling coarse progress UI.
     *   Not invoked when there is nothing to load.
     * @param signal - Checked before each batch; aborting rejects the whole
     *   preload with an AbortError instead of waiting for the remaining
     *   batches to finish.
     */
    async preloadAll(
        concurrency = 10,
        onProgress?: (loaded: number, total: number) => void,
        signal?: AbortSignal
    ): Promise<void> {
        this._deferMode = false;
        const urls = Array.from(this._collectedUrls);
        this._collectedUrls.clear();

        try {
            if (urls.length === 0) {
                return;
            }

            const limit = Math.max(1, Math.min(concurrency, 100));
            this.context.logger.debug(`Preloading ${urls.length} image(s) with concurrency ${limit}`);

            // Load in batches to respect the concurrency cap while maximising
            // parallelism within each batch. Each batch wait races the abort
            // signal so an abort takes effect immediately, not after the
            // current batch's slowest image settles; in-flight loads keep
            // running but are already reported through the normal error path.
            let settled = 0;
            const abortPromise = signal
                ? new Promise<never>((_, reject) => {
                      const onAbort = (): void => reject(new DOMException('The operation was aborted.', 'AbortError'));
                      if (signal.aborted) {
                          onAbort();
                      } else {
                          signal.addEventListener('abort', onAbort, { once: true });
                      }
                  })
                : null;
            // An already-aborted signal exits via throwIfAborted before the
            // first loop race subscribes to abortPromise; keep a no-op
            // handler so that rejection is never unhandled.
            abortPromise?.catch(() => undefined);
            onProgress?.(0, urls.length);
            for (let i = 0; i < urls.length; i += limit) {
                throwIfAborted(signal);
                const batch = urls.slice(i, i + limit);
                batch.map((url) => this._addImageWithPending(url));
                // _addImageWithPending stores the real load promise in the
                // cache synchronously before its queued-start promise
                // resolves, so awaiting the entries here waits for actual
                // load completion — the documented contract of preloadAll —
                // and makes onProgress report loaded (not merely started)
                // images. Failures are already reported by the load catch.
                const batchSettled = Promise.allSettled(
                    batch.map((url) => this._cache.get(url)?.value ?? Promise.resolve())
                );
                // Race so an abort takes effect immediately, not after the
                // current batch's slowest image settles; in-flight loads keep
                // running but are already reported through the normal error
                // path.
                await (abortPromise ? Promise.race([batchSettled, abortPromise]) : batchSettled);
                settled += batch.length;
                onProgress?.(settled, urls.length);
            }
        } finally {
            // Nested defer windows keep eviction suspended until the last one
            // completes; never let a stray resume push the counter negative.
            this._evictionSuspendCount = Math.max(0, this._evictionSuspendCount - 1);
        }
    }

    addImage(src: string): Promise<void> {
        // ── Defer mode: collect only ──────────────────────────────
        if (this._deferMode) {
            if (!this.has(src) && (isBlobImage(src) || isRenderable(src))) {
                this._collectedUrls.add(src);
            }
            return Promise.resolve();
        }

        // ── Normal mode: immediate load ───────────────────────────
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
            return this._addImageWithPending(src);
        }

        return Promise.resolve();
    }

    /**
     * Shared helper: enqueues loading for a single URL with pending-operation
     * deduplication and error swallowing. Used by both addImage() (normal mode)
     * and preloadAll() (batch mode).
     */
    private _addImageWithPending(src: string): Promise<void> {
        const pending = this._pendingOperations.get(src);
        if (pending) {
            return pending;
        }

        const operation = this._addImageInternal(src);
        this._pendingOperations.set(src, operation);
        operation.finally(() => {
            this._pendingOperations.delete(src);
        });

        return operation;
    }

    private async _addImageInternal(src: string): Promise<void> {
        const timeoutMs = this._options.imageTimeout ?? DEFAULT_IMAGE_TIMEOUT_MS;
        const imageWithTimeout = this.withTimeout(
            this.loadImage(src),
            timeoutMs,
            `Timed out (${timeoutMs}ms) loading image`
        );

        // Handle errors to prevent unhandled rejections. The failure is
        // reported once, here at load time, via both the logger and the
        // onError hook; renderer-side catch blocks keep their own log lines
        // but must not re-report the same resource to onError.
        imageWithTimeout.catch((error) => {
            const reason = error instanceof Error ? error.message : String(error);
            const message = `Failed to load image ${src.substring(0, RESOURCE_KEY_LOG_LENGTH)}: ${reason}`;
            this.context.logger.error(message);
            this.context.onError?.(new Error(message));
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
        } else if (this._evictionEnabled && this._cache.size >= this.maxSize) {
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
        // With allowTaint disabled (the default), a cross-origin image is safe to
        // draw only when the server sends CORS headers. Instead of skipping such
        // images outright, still ATTEMPT a CORS load: it succeeds for CORS-enabled
        // hosts (CDNs, avatar services, picsum, ...) and fails cleanly for hosts
        // without CORS headers, where the image is skipped exactly as before
        // (issue #229). An explicit proxy takes precedence so existing setups
        // that rely on proxying keep working.
        const canAttemptCors =
            !isSameOrigin &&
            this._options.allowTaint === false &&
            !isInlineImage(key) &&
            !isBlobImage(key) &&
            typeof this._options.proxy !== 'string';
        const useCORS =
            !isInlineImage(key) &&
            (this._options.useCORS === true || canAttemptCors) &&
            FEATURES.SUPPORT_CORS_IMAGES &&
            !isSameOrigin;
        const useProxy =
            !isInlineImage(key) &&
            !isSameOrigin &&
            !isBlobImage(key) &&
            typeof this._options.proxy === 'string' &&
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

        this.context.logger.debug(`Added image ${key.substring(0, RESOURCE_KEY_LOG_LENGTH)}`);

        // Allocate the image in the configured window's realm when available
        // so multi-window captures do not depend on the global constructor.
        const imageConstructor = (this.context.config.window as Window & { Image?: typeof Image }).Image ?? Image;

        return await new Promise((resolve, reject) => {
            const img = new imageConstructor();
            img.onload = () => resolve(img);
            img.onerror = reject;
            //ios safari 10.3 taints canvas with data urls unless crossOrigin is set to anonymous
            if (isInlineBase64Image(src) || useCORS) {
                img.crossOrigin = 'anonymous';
            }
            img.src = src;
            if (img.complete === true) {
                // Cached and data-URL images are complete synchronously, which
                // means the load event already fired. Wait for the bitmap to
                // be usable via decode() — without the fixed 500ms timer the
                // previous fallback added to every such image.
                if (typeof img.decode === 'function') {
                    img.decode().then(
                        () => resolve(img),
                        () => reject(new Error(`Failed to decode image ${src.substring(0, RESOURCE_KEY_LOG_LENGTH)}`))
                    );
                } else {
                    setTimeout(() => resolve(img), INLINE_IMAGE_RESOLVE_DELAY_MS);
                }
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

        const key = src.substring(0, RESOURCE_KEY_LOG_LENGTH);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                if (xhr.status === 200) {
                    const reader = new FileReader();
                    reader.addEventListener('load', () => resolve(reader.result as string), false);
                    reader.addEventListener('error', (e) => reject(e), false);
                    reader.readAsDataURL(xhr.response as Blob);
                } else {
                    reject(`Failed to proxy resource ${key} with status code ${xhr.status}`);
                }
            };

            xhr.onerror = reject;
            const queryString = proxy.indexOf('?') > -1 ? '&' : '?';
            // The responseType query parameter is part of the proxy server
            // contract (tests/proxy.cjs and the upstream html2canvas proxy).
            xhr.open('GET', `${proxy}${queryString}url=${encodeURIComponent(src)}&responseType=blob`);
            xhr.responseType = 'blob';

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
