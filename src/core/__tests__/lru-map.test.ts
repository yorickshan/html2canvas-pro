import { describe, it, expect } from 'vitest';
import { LRUMap } from '../lru-map';

describe('LRUMap', () => {
    it('stores and retrieves values', () => {
        const cache = new LRUMap<string, number>(10);
        cache.set('a', 1);
        cache.set('b', 2);
        expect(cache.get('a')).toBe(1);
        expect(cache.get('b')).toBe(2);
        expect(cache.get('c')).toBeUndefined();
    });

    it('returns the correct size', () => {
        const cache = new LRUMap<string, number>(10);
        expect(cache.size).toBe(0);
        cache.set('a', 1);
        expect(cache.size).toBe(1);
        cache.set('b', 2);
        expect(cache.size).toBe(2);
    });

    it('evicts the least-recently-used entry when at capacity', () => {
        const cache = new LRUMap<string, number>(3);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3);
        cache.set('d', 4); // should evict 'a'
        expect(cache.get('a')).toBeUndefined();
        expect(cache.get('b')).toBe(2);
        expect(cache.get('c')).toBe(3);
        expect(cache.get('d')).toBe(4);
    });

    it('promotes entries on access via get()', () => {
        const cache = new LRUMap<string, number>(3);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3);

        // Access 'a' to promote it to MRU
        expect(cache.get('a')).toBe(1);

        cache.set('d', 4); // should evict 'b' (now LRU), not 'a'
        expect(cache.get('a')).toBe(1);
        expect(cache.get('b')).toBeUndefined();
        expect(cache.get('c')).toBe(3);
        expect(cache.get('d')).toBe(4);
    });

    it('promotes entries on update via set()', () => {
        const cache = new LRUMap<string, number>(3);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3);

        // Update 'a' to promote it to MRU
        cache.set('a', 100);

        cache.set('d', 4); // should evict 'b', not 'a'
        expect(cache.get('a')).toBe(100);
        expect(cache.get('b')).toBeUndefined();
    });

    it('clears all entries', () => {
        const cache = new LRUMap<string, number>(5);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.clear();
        expect(cache.size).toBe(0);
        expect(cache.get('a')).toBeUndefined();
    });

    it('handles capacity of 1', () => {
        const cache = new LRUMap<string, number>(1);
        cache.set('a', 1);
        cache.set('b', 2);
        expect(cache.get('a')).toBeUndefined();
        expect(cache.get('b')).toBe(2);
    });
});
