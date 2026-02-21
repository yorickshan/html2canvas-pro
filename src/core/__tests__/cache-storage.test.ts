import { strictEqual, ok } from 'assert';
import { Cache, ResourceOptions } from '../cache-storage';
import { Context } from '../context';
import { Bounds } from '../../css/layout/bounds';
import { Html2CanvasConfig } from '../../config';

describe('Cache LRU', () => {
    let context: Context;
    let cache: Cache;

    beforeEach(() => {
        const mockWindow = {
            document: {
                createElement: (_name: string) => {
                    let _href = '';
                    return {
                        set href(value: string) {
                            _href = value;
                        },
                        get href() {
                            return _href;
                        },
                        get protocol() {
                            return 'http:';
                        },
                        get hostname() {
                            return 'localhost';
                        },
                        get port() {
                            return '';
                        }
                    };
                }
            },
            location: { href: 'http://localhost/' }
        } as unknown as Window;

        const config = new Html2CanvasConfig({ window: mockWindow });
        context = new Context(
            {
                logging: false,
                imageTimeout: 15000,
                useCORS: false,
                allowTaint: false
            },
            new Bounds(0, 0, 800, 600),
            config
        );

        const options: ResourceOptions = {
            imageTimeout: 15000,
            useCORS: false,
            allowTaint: false,
            maxCacheSize: 3 // Small size for testing
        };

        cache = new Cache(context, options);
    });

    it('should enforce maximum cache size', () => {
        strictEqual(cache.getMaxSize(), 3);
        strictEqual(cache.size(), 0);
    });

    it('should add images to cache', () => {
        const blob1 = 'blob:http://localhost/image1';
        const blob2 = 'blob:http://localhost/image2';

        cache.addImage(blob1);
        strictEqual(cache.size(), 1);

        cache.addImage(blob2);
        strictEqual(cache.size(), 2);
    });

    it('should not exceed max cache size', () => {
        const blobs = [
            'blob:http://localhost/image1',
            'blob:http://localhost/image2',
            'blob:http://localhost/image3',
            'blob:http://localhost/image4' // This should trigger eviction
        ];

        blobs.forEach((blob) => cache.addImage(blob));

        // Should not exceed max size (3)
        strictEqual(cache.size(), 3);
    });

    it('should evict least recently used entry when full', async () => {
        const blob1 = 'blob:http://localhost/image1';
        const blob2 = 'blob:http://localhost/image2';
        const blob3 = 'blob:http://localhost/image3';
        const blob4 = 'blob:http://localhost/image4';

        // Add 3 images (fill cache)
        cache.addImage(blob1);
        await new Promise((resolve) => setTimeout(resolve, 10));

        cache.addImage(blob2);
        await new Promise((resolve) => setTimeout(resolve, 10));

        cache.addImage(blob3);
        await new Promise((resolve) => setTimeout(resolve, 10));

        strictEqual(cache.size(), 3);

        // Access blob2 and blob3 (update their access time)
        cache.match(blob2);
        await new Promise((resolve) => setTimeout(resolve, 10));

        cache.match(blob3);
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Add blob4 - should evict blob1 (oldest, never accessed)
        cache.addImage(blob4);

        strictEqual(cache.size(), 3);

        // blob1 should be evicted
        strictEqual(cache.match(blob1), undefined);

        // blob2, blob3, blob4 should exist
        ok(cache.match(blob2) !== undefined);
        ok(cache.match(blob3) !== undefined);
        ok(cache.match(blob4) !== undefined);
    });

    it('should update access time on repeated access', async () => {
        const blob1 = 'blob:http://localhost/image1';
        const blob2 = 'blob:http://localhost/image2';
        const blob3 = 'blob:http://localhost/image3';

        cache.addImage(blob1);
        await new Promise((resolve) => setTimeout(resolve, 10));

        cache.addImage(blob2);
        await new Promise((resolve) => setTimeout(resolve, 10));

        cache.addImage(blob3);
        strictEqual(cache.size(), 3);

        // Access blob1 multiple times (update access time)
        cache.match(blob1);
        await new Promise((resolve) => setTimeout(resolve, 10));

        cache.addImage(blob1); // Should update access time
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Add 4th image - should evict blob2 (oldest unaccessed)
        const blob4 = 'blob:http://localhost/image4';
        cache.addImage(blob4);

        strictEqual(cache.size(), 3);
        strictEqual(cache.match(blob2), undefined); // Evicted
        ok(cache.match(blob1) !== undefined); // Still exists
    });

    it('should clear all cache entries', () => {
        cache.addImage('blob:http://localhost/image1');
        cache.addImage('blob:http://localhost/image2');
        strictEqual(cache.size(), 2);

        cache.clear();
        strictEqual(cache.size(), 0);
    });

    it('should throw error for invalid max size', () => {
        const options: ResourceOptions = {
            imageTimeout: 15000,
            useCORS: false,
            allowTaint: false,
            maxCacheSize: 0 // Invalid
        };

        try {
            new Cache(context, options);
            ok(false, 'Should have thrown error');
        } catch (error: any) {
            ok(error.message.includes('at least 1'));
        }
    });

    it('should use default max size if not specified', () => {
        const options: ResourceOptions = {
            imageTimeout: 15000,
            useCORS: false,
            allowTaint: false
            // maxCacheSize not specified
        };

        const cacheWithDefault = new Cache(context, options);
        strictEqual(cacheWithDefault.getMaxSize(), 100); // Default
    });
});
