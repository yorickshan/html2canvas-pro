import { deepStrictEqual, fail } from 'assert';
import { expect, vi } from 'vitest';
import { FEATURES } from '../features';
import { Cache } from '../cache-storage';
import { Context } from '../context';
import { Bounds } from '../../css/layout/bounds';
import { Html2CanvasConfig } from '../../config';

const proxy = 'http://example.com/proxy';

const createMockContext = (origin: string, opts = {}) => {
    const mockWindow = {
        location: {
            href: origin
        },
        document: {
            createElement(_name: string) {
                let _href = '';
                return {
                    set href(value: string) {
                        _href = value;
                    },
                    get href() {
                        return _href;
                    },
                    get protocol() {
                        return new URL(_href).protocol;
                    },
                    get hostname() {
                        return new URL(_href).hostname;
                    },
                    get port() {
                        return new URL(_href).port;
                    }
                };
            }
        }
    };

    const config = new Html2CanvasConfig({ window: mockWindow as Window });

    return new Context(
        {
            logging: false,
            imageTimeout: 0,
            useCORS: false,
            allowTaint: false,
            proxy,
            ...opts
        },
        new Bounds(0, 0, 0, 0),
        config
    );
};

const images: ImageMock[] = [];
const xhr: XMLHttpRequestMock[] = [];
const sleep = async (timeout: number) => await new Promise((resolve) => setTimeout(resolve, timeout));

class ImageMock {
    src?: string;
    crossOrigin?: string;
    onload?: () => void;
    constructor() {
        images.push(this);
    }
}

class XMLHttpRequestMock {
    sent: boolean;
    status: number;
    timeout: number;
    method?: string;
    url?: string;
    response?: string;
    onload?: () => void;
    ontimeout?: () => void;
    constructor() {
        this.sent = false;
        this.status = 500;
        this.timeout = 5000;
        xhr.push(this);
    }

    async load(status: number, response: string) {
        this.response = response;
        this.status = status;
        if (this.onload) {
            this.onload();
        }
        await sleep(0);
    }

    open(method: string, url: string) {
        this.method = method;
        this.url = url;
    }
    send() {
        this.sent = true;
    }
}

Object.defineProperty(global, 'Image', { value: ImageMock, writable: true });
Object.defineProperty(global, 'XMLHttpRequest', {
    value: XMLHttpRequestMock,
    writable: true
});

const setFeatures = (opts: { [key: string]: boolean } = {}) => {
    const defaults: { [key: string]: boolean } = {
        SUPPORT_SVG_DRAWING: true,
        SUPPORT_CORS_IMAGES: true,
        SUPPORT_CORS_XHR: true,
        SUPPORT_RESPONSE_TYPE: false
    };

    Object.keys(defaults).forEach((key) => {
        Object.defineProperty(FEATURES, key, {
            value: typeof opts[key] === 'boolean' ? opts[key] : defaults[key],
            writable: true
        });
    });
};

describe('cache-storage', () => {
    beforeEach(() => setFeatures());
    afterEach(() => {
        xhr.splice(0, xhr.length);
        images.splice(0, images.length);
    });
    it('addImage adds images to cache', async () => {
        const { cache } = createMockContext('http://example.com', { proxy: null });
        await cache.addImage('http://example.com/test.jpg');
        await cache.addImage('http://example.com/test2.jpg');

        deepStrictEqual(images.length, 2);
        deepStrictEqual(images[0].src, 'http://example.com/test.jpg');
        deepStrictEqual(images[1].src, 'http://example.com/test2.jpg');
    });

    it('addImage should not add duplicate entries', async () => {
        const { cache } = createMockContext('http://example.com');
        await cache.addImage('http://example.com/test.jpg');
        await cache.addImage('http://example.com/test.jpg');

        deepStrictEqual(images.length, 1);
        deepStrictEqual(images[0].src, 'http://example.com/test.jpg');
    });

    describe('svg', () => {
        it('should add svg images correctly', async () => {
            const { cache } = createMockContext('http://example.com');
            await cache.addImage('http://example.com/test.svg');
            await cache.addImage('http://example.com/test2.svg');

            deepStrictEqual(images.length, 2);
            deepStrictEqual(images[0].src, 'http://example.com/test.svg');
            deepStrictEqual(images[1].src, 'http://example.com/test2.svg');
        });

        it('should omit svg images if not supported', async () => {
            setFeatures({ SUPPORT_SVG_DRAWING: false });
            const { cache } = createMockContext('http://example.com');
            await cache.addImage('http://example.com/test.svg');
            await cache.addImage('http://example.com/test2.svg');

            deepStrictEqual(images.length, 0);
        });
    });

    describe('cross-origin', () => {
        it('addImage should attempt a CORS load for cross-origin images by default (issue #229)', async () => {
            // With allowTaint disabled (the default), cross-origin images used to
            // be skipped outright. They are now loaded with crossOrigin='anonymous',
            // which is safe (never taints the canvas) and succeeds for
            // CORS-enabled hosts (issue #229).
            const { cache } = createMockContext('http://example.com', {
                proxy: undefined
            });
            await cache.addImage('http://html2canvas.hertzen.com/test.jpg');
            deepStrictEqual(images.length, 1);
            deepStrictEqual(images[0].src, 'http://html2canvas.hertzen.com/test.jpg');
            deepStrictEqual(images[0].crossOrigin, 'anonymous');
        });

        it('addImage should add images if tainting enabled', async () => {
            const { cache } = createMockContext('http://example.com', {
                allowTaint: true,
                proxy: undefined
            });
            await cache.addImage('http://html2canvas.hertzen.com/test.jpg');
            deepStrictEqual(images.length, 1);
            deepStrictEqual(images[0].src, 'http://html2canvas.hertzen.com/test.jpg');
            deepStrictEqual(images[0].crossOrigin, undefined);
        });

        it('addImage should add images if cors enabled', async () => {
            const { cache } = createMockContext('http://example.com', { useCORS: true });
            await cache.addImage('http://html2canvas.hertzen.com/test.jpg');
            deepStrictEqual(images.length, 1);
            deepStrictEqual(images[0].src, 'http://html2canvas.hertzen.com/test.jpg');
            deepStrictEqual(images[0].crossOrigin, 'anonymous');
        });

        it('addImage should not add images if cors enabled but not supported', async () => {
            setFeatures({ SUPPORT_CORS_IMAGES: false });

            const { cache } = createMockContext('http://example.com', {
                useCORS: true,
                proxy: undefined
            });
            await cache.addImage('http://html2canvas.hertzen.com/test.jpg');
            deepStrictEqual(images.length, 0);
        });

        it('addImage should not add images to proxy if cors enabled', async () => {
            const { cache } = createMockContext('http://example.com', { useCORS: true });
            await cache.addImage('http://html2canvas.hertzen.com/test.jpg');
            deepStrictEqual(images.length, 1);
            deepStrictEqual(images[0].src, 'http://html2canvas.hertzen.com/test.jpg');
            deepStrictEqual(images[0].crossOrigin, 'anonymous');
        });

        it('addImage should use proxy ', async () => {
            const { cache } = createMockContext('http://example.com');
            await cache.addImage('http://html2canvas.hertzen.com/test.jpg');
            deepStrictEqual(xhr.length, 1);
            deepStrictEqual(
                xhr[0].url,
                `${proxy}?url=${encodeURIComponent('http://html2canvas.hertzen.com/test.jpg')}&responseType=text`
            );
            await xhr[0].load(200, '<data response>');

            deepStrictEqual(images.length, 1);
            deepStrictEqual(images[0].src, '<data response>');
        });

        it('proxy should respect imageTimeout', async () => {
            const { cache } = createMockContext('http://example.com', {
                imageTimeout: 10
            });
            await cache.addImage('http://html2canvas.hertzen.com/test.jpg');

            deepStrictEqual(xhr.length, 1);
            deepStrictEqual(
                xhr[0].url,
                `${proxy}?url=${encodeURIComponent('http://html2canvas.hertzen.com/test.jpg')}&responseType=text`
            );
            deepStrictEqual(xhr[0].timeout, 10);
            if (xhr[0].ontimeout) {
                xhr[0].ontimeout();
            }
            try {
                await cache.match('http://html2canvas.hertzen.com/test.jpg');
                fail('Expected result to timeout');
            } catch (e) {}
        });
    });

    it('match should return cache entry', async () => {
        const { cache } = createMockContext('http://example.com');
        await cache.addImage('http://example.com/test.jpg');

        if (images[0].onload) {
            images[0].onload();
        }

        const response = await cache.match('http://example.com/test.jpg');

        deepStrictEqual((response as HTMLImageElement).src, 'http://example.com/test.jpg');
    });

    it('image should respect imageTimeout', async () => {
        const { cache } = createMockContext('http://example.com', { imageTimeout: 10 });
        cache.addImage('http://example.com/test.jpg');

        try {
            await cache.match('http://example.com/test.jpg');
            fail('Expected result to timeout');
        } catch (e) {}
    });

    describe('constructor', () => {
        const baseOptions = { imageTimeout: 0, useCORS: false, allowTaint: false };

        it('should throw when maxCacheSize is below 1', () => {
            const context = createMockContext('http://example.com', { proxy: null });
            expect(() => new Cache(context, { ...baseOptions, maxCacheSize: 0 })).toThrow(
                'Cache maxSize must be at least 1'
            );
            expect(() => new Cache(context, { ...baseOptions, maxCacheSize: -5 })).toThrow(
                'Cache maxSize must be at least 1'
            );
        });

        it('should warn when maxCacheSize is very large', () => {
            const context = createMockContext('http://example.com', { proxy: null });
            const warn = vi.spyOn(context.logger, 'warn');
            const cache = new Cache(context, { ...baseOptions, maxCacheSize: 20000 });
            expect(warn).toHaveBeenCalledTimes(1);
            expect(String(warn.mock.calls[0][0])).toContain('20000');
            expect(cache.getMaxSize()).toBe(20000);
        });

        it('should not warn for reasonable sizes', () => {
            const context = createMockContext('http://example.com', { proxy: null });
            const warn = vi.spyOn(context.logger, 'warn');
            const cache = new Cache(context, { ...baseOptions, maxCacheSize: 100 });
            expect(warn).not.toHaveBeenCalled();
            expect(cache.getMaxSize()).toBe(100);
        });
    });

    describe('defer mode', () => {
        it('should collect URLs without loading and batch load them in preloadAll', async () => {
            const { cache } = createMockContext('http://example.com', { proxy: null });
            cache.startDefer();
            await cache.addImage('http://example.com/a.jpg');
            await cache.addImage('http://example.com/b.jpg');
            deepStrictEqual(images.length, 0);

            await cache.preloadAll(); // default concurrency

            deepStrictEqual(images.length, 2);
            deepStrictEqual(await cache.keys(), ['http://example.com/a.jpg', 'http://example.com/b.jpg']);
        });

        it('should ignore duplicates and non-renderable URLs while deferring', async () => {
            setFeatures({ SUPPORT_SVG_DRAWING: false });
            const { cache } = createMockContext('http://example.com', { proxy: null });
            cache.startDefer();
            await cache.addImage('http://example.com/a.jpg');
            await cache.addImage('http://example.com/a.jpg'); // duplicate: already collected
            await cache.addImage('http://example.com/pic.svg'); // svg unsupported: not renderable
            await cache.addImage('blob:http://example.com/uuid'); // blob: collected

            await cache.preloadAll();

            deepStrictEqual(images.length, 2);
            deepStrictEqual(images.map((img) => img.src).sort(), [
                'blob:http://example.com/uuid',
                'http://example.com/a.jpg'
            ]);
        });

        it('should return immediately from preloadAll when nothing was collected', async () => {
            const { cache } = createMockContext('http://example.com', { proxy: null });
            cache.startDefer();
            const debug = vi.spyOn(cache.context.logger, 'debug');
            await cache.preloadAll();
            expect(debug).not.toHaveBeenCalled();
            deepStrictEqual(images.length, 0);
        });

        it('should cap the concurrency between 1 and 100', async () => {
            const { cache } = createMockContext('http://example.com', { proxy: null });
            cache.startDefer();
            for (const name of ['a.jpg', 'b.jpg', 'c.jpg']) {
                await cache.addImage(`http://example.com/${name}`);
            }
            const debug = vi.spyOn(cache.context.logger, 'debug');
            await cache.preloadAll(500);
            expect(debug).toHaveBeenCalledWith('Preloading 3 image(s) with concurrency 100');

            const { cache: cache2 } = createMockContext('http://example.com', { proxy: null });
            cache2.startDefer();
            await cache2.addImage('http://example.com/a.jpg');
            const debug2 = vi.spyOn(cache2.context.logger, 'debug');
            await cache2.preloadAll(0);
            expect(debug2).toHaveBeenCalledWith('Preloading 1 image(s) with concurrency 1');
        });
    });

    describe('pending operation deduplication', () => {
        it('should return the same pending promise for concurrent duplicate addImage calls', async () => {
            const { cache } = createMockContext('http://example.com', { proxy: null });
            const first = cache.addImage('http://example.com/test.jpg');
            const second = cache.addImage('http://example.com/test.jpg');
            expect(second).toBe(first);

            const third = (cache as any)._addImageWithPending('http://example.com/test.jpg');
            expect(third).toBe(first);

            await first;
            deepStrictEqual(images.length, 1);
        });
    });

    describe('LRU cache behaviour', () => {
        it('should evict the least recently used entry when full', async () => {
            const { cache } = createMockContext('http://example.com', { proxy: null, maxCacheSize: 2 });
            await cache.addImage('http://example.com/a.jpg');
            await cache.addImage('http://example.com/b.jpg');
            await cache.addImage('http://example.com/c.jpg'); // evicts a

            deepStrictEqual(cache.size(), 2);
            deepStrictEqual(await cache.keys(), ['http://example.com/b.jpg', 'http://example.com/c.jpg']);
            expect(cache.match('http://example.com/a.jpg')).toBeUndefined();
        });

        it('should refresh recency on match so refreshed entries survive eviction', async () => {
            const { cache } = createMockContext('http://example.com', { proxy: null, maxCacheSize: 2 });
            await cache.addImage('http://example.com/a.jpg');
            await cache.addImage('http://example.com/b.jpg');
            const pendingA = cache.match('http://example.com/a.jpg'); // moves a to the end
            expect(pendingA).toBeDefined();

            await cache.addImage('http://example.com/c.jpg'); // evicts b now
            deepStrictEqual(await cache.keys(), ['http://example.com/a.jpg', 'http://example.com/c.jpg']);
        });

        it('should refresh recency when addImage is called for an existing key', async () => {
            const { cache } = createMockContext('http://example.com', { proxy: null, maxCacheSize: 2 });
            await cache.addImage('http://example.com/a.jpg');
            await cache.addImage('http://example.com/b.jpg');
            await cache.addImage('http://example.com/a.jpg'); // refresh a
            await cache.addImage('http://example.com/c.jpg'); // evicts b
            deepStrictEqual(await cache.keys(), ['http://example.com/a.jpg', 'http://example.com/c.jpg']);
        });

        it('should update an existing key without growing the cache', async () => {
            const { cache } = createMockContext('http://example.com', { proxy: null });
            (cache as any).set('http://example.com/x', Promise.resolve({ src: 'first' }));
            (cache as any).set('http://example.com/x', Promise.resolve({ src: 'second' }));
            deepStrictEqual(cache.size(), 1);
            const entry = await cache.match('http://example.com/x');
            deepStrictEqual((entry as any).src, 'second');
        });

        it('should empty the cache on clear', async () => {
            const { cache } = createMockContext('http://example.com', { proxy: null });
            await cache.addImage('http://example.com/a.jpg');
            await cache.addImage('http://example.com/b.jpg');
            deepStrictEqual(cache.size(), 2);
            cache.clear();
            deepStrictEqual(cache.size(), 0);
            deepStrictEqual(await cache.keys(), []);
        });
    });

    it('should default the image timeout to 15s when imageTimeout is undefined', async () => {
        const { cache } = createMockContext('http://example.com', {
            proxy: null,
            imageTimeout: undefined as any
        });
        const operation = cache.addImage('http://example.com/test.jpg');
        await sleep(0);
        deepStrictEqual(images.length, 1);
        if (images[0].onload) {
            images[0].onload();
        }
        await operation;

        const response = await cache.match('http://example.com/test.jpg');
        deepStrictEqual((response as HTMLImageElement).src, 'http://example.com/test.jpg');
    });

    it('should resolve via the img.complete fallback for already-cached images', async () => {
        (ImageMock.prototype as any).complete = true;
        try {
            const { cache } = createMockContext('http://example.com', { proxy: null });
            const operation = cache.addImage('http://example.com/test.jpg');
            await sleep(0);
            deepStrictEqual(images.length, 1);
            if (images[0].onload) {
                images[0].onload();
            }
            await operation;
            const response = await cache.match('http://example.com/test.jpg');
            deepStrictEqual((response as HTMLImageElement).src, 'http://example.com/test.jpg');
        } finally {
            delete (ImageMock.prototype as any).complete;
        }
    });

    describe('customIsSameOrigin', () => {
        it('should use the custom origin checker instead of the default', async () => {
            const calls: Array<[string, (src: string) => boolean]> = [];
            const { cache } = createMockContext('http://example.com', {
                proxy: undefined as any,
                customIsSameOrigin: function (this: void, src: string, oldFn: (src: string) => boolean) {
                    calls.push([src, oldFn]);
                    return true;
                }
            });
            await cache.addImage('http://other.example.com/test.jpg');

            deepStrictEqual(images.length, 1);
            deepStrictEqual(images[0].src, 'http://other.example.com/test.jpg');
            deepStrictEqual(images[0].crossOrigin, undefined); // treated as same-origin
            deepStrictEqual(calls.length, 1);
            deepStrictEqual(calls[0][0], 'http://other.example.com/test.jpg');
            deepStrictEqual(calls[0][1]('http://example.com/test.jpg'), true);
            deepStrictEqual(calls[0][1]('http://other.example.com/test.jpg'), false);
        });

        it('should support promise-returning custom origin checkers', async () => {
            const { cache } = createMockContext('http://example.com', {
                proxy: undefined as any,
                customIsSameOrigin: async () => false
            });
            await cache.addImage('http://other.example.com/test.jpg');

            deepStrictEqual(images.length, 1);
            deepStrictEqual(images[0].crossOrigin, 'anonymous'); // CORS attempt (issue #229)
        });

        it('should skip images when the custom check reports cross-origin and CORS is unsupported', async () => {
            setFeatures({ SUPPORT_CORS_IMAGES: false });
            const { cache } = createMockContext('http://example.com', {
                proxy: undefined as any,
                customIsSameOrigin: () => false
            });
            await cache.addImage('http://other.example.com/test.jpg');
            deepStrictEqual(images.length, 0);
        });
    });

    describe('proxy requests', () => {
        it('should append the url param with & when the proxy already has a query string', async () => {
            const { cache } = createMockContext('http://example.com', {
                proxy: 'http://example.com/proxy?token=abc'
            });
            await cache.addImage('http://html2canvas.hertzen.com/test.jpg');

            deepStrictEqual(xhr.length, 1);
            deepStrictEqual(
                xhr[0].url,
                `http://example.com/proxy?token=abc&url=${encodeURIComponent(
                    'http://html2canvas.hertzen.com/test.jpg'
                )}&responseType=text`
            );
        });

        it('should use the blob response type when supported', async () => {
            setFeatures({ SUPPORT_RESPONSE_TYPE: true });
            const { cache } = createMockContext('http://example.com');
            await cache.addImage('http://html2canvas.hertzen.com/test.jpg');

            deepStrictEqual(xhr.length, 1);
            deepStrictEqual(
                xhr[0].url,
                `${proxy}?url=${encodeURIComponent('http://html2canvas.hertzen.com/test.jpg')}&responseType=blob`
            );
            await xhr[0].load(200, new Blob(['image-bytes'], { type: 'image/png' }) as unknown as string);

            for (let i = 0; i < 20 && images.length === 0; i++) {
                await sleep(5);
            }
            deepStrictEqual(images.length, 1);
            expect(images[0].src.startsWith('data:image/png;base64,')).toBe(true);
        });

        it('should reject the cache entry when the proxy responds with a non-200 status', async () => {
            const { cache } = createMockContext('http://example.com');
            await cache.addImage('http://html2canvas.hertzen.com/test.jpg');
            await xhr[0].load(404, 'not found');

            try {
                await cache.match('http://html2canvas.hertzen.com/test.jpg');
                fail('Expected proxy rejection');
            } catch (e) {
                deepStrictEqual(
                    e,
                    `Failed to proxy resource http://html2canvas.hertzen.com/test.jpg with status code 404`
                );
            }
        });

        it('should throw when proxy() is invoked without a proxy option', () => {
            const { cache } = createMockContext('http://example.com', { proxy: undefined as any });
            expect(() => (cache as any).proxy('http://example.com/x.jpg')).toThrow('No proxy defined');
        });
    });

    describe('inline images', () => {
        it('should load inline SVG data URLs when SVG drawing is supported', async () => {
            const { cache } = createMockContext('http://example.com', { proxy: null });
            const src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>";
            await cache.addImage(src);

            deepStrictEqual(images.length, 1);
            deepStrictEqual(images[0].src, src);
            deepStrictEqual(images[0].crossOrigin, undefined);
        });

        it('should skip inline SVG data URLs when SVG drawing is unsupported', async () => {
            setFeatures({ SUPPORT_SVG_DRAWING: false });
            const { cache } = createMockContext('http://example.com', { proxy: null });
            await cache.addImage("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>");
            deepStrictEqual(images.length, 0);
        });
    });
});
