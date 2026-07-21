/**
 * Generic LRU (Least-Recently-Used) wrapper over a native `Map`.
 *
 * Both the CSS parse cache and the background pattern cache implement the
 * same LRU eviction pattern using Map's insertion-order guarantee.  This
 * tiny utility centralises that logic so it can be reused without
 * duplication.
 *
 * Usage:
 * ```ts
 * const cache = new LRUMap<string, CanvasPattern>(50);
 * const entry = cache.get(key); // promotes if found, returns undefined otherwise
 * cache.set(key, value);         // evicts oldest entry when at capacity
 * ```
 */
export class LRUMap<K, V> {
    private readonly _map: Map<K, V>;

    constructor(private readonly maxSize: number) {
        this._map = new Map();
    }

    /**
     * Get a value by key.
     * On cache hit the entry is promoted to the end of the Map (most-recently-used).
     * Returns `undefined` on miss.
     */
    get(key: K): V | undefined {
        if (!this._map.has(key)) {
            return undefined;
        }
        // Delete-then-set promotes the entry to MRU position.
        const value = this._map.get(key)!;
        this._map.delete(key);
        this._map.set(key, value);
        return value;
    }

    /**
     * Insert or update a key-value pair.
     * If the key already exists it is moved to MRU position.  If the map is
     * at capacity the least-recently-used entry (oldest insertion order) is
     * evicted before inserting.
     */
    set(key: K, value: V): void {
        if (this._map.has(key)) {
            this._map.delete(key);
        } else if (this._map.size >= this.maxSize) {
            const oldestKey = this._map.keys().next().value;
            if (oldestKey !== undefined) {
                this._map.delete(oldestKey);
            }
        }
        this._map.set(key, value);
    }

    /** Current number of entries. */
    get size(): number {
        return this._map.size;
    }

    /** Remove all entries. */
    clear(): void {
        this._map.clear();
    }
}
