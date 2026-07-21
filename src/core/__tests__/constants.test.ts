import { describe, it, expect } from 'vitest';
import {
    PARSE_CACHE_MAX_PER_DESCRIPTOR,
    PATTERN_CACHE_MAX,
    DEFAULT_IMAGE_CACHE_SIZE,
    MAX_IMAGE_CACHE_SIZE,
    DEFAULT_IMAGE_TIMEOUT_MS,
    SHADOW_MASK_OFFSET,
    IFRAME_READY_POLL_MS,
    INLINE_IMAGE_RESOLVE_DELAY_MS,
    RESOURCE_KEY_LOG_LENGTH
} from '../constants';

describe('core constants', () => {
    it('PARSE_CACHE_MAX_PER_DESCRIPTOR is a positive integer', () => {
        expect(Number.isInteger(PARSE_CACHE_MAX_PER_DESCRIPTOR)).toBe(true);
        expect(PARSE_CACHE_MAX_PER_DESCRIPTOR).toBeGreaterThan(0);
    });

    it('PATTERN_CACHE_MAX is a positive integer', () => {
        expect(Number.isInteger(PATTERN_CACHE_MAX)).toBe(true);
        expect(PATTERN_CACHE_MAX).toBeGreaterThan(0);
    });

    it('cache limits respect MAX <= total size constraint', () => {
        expect(DEFAULT_IMAGE_CACHE_SIZE).toBeLessThanOrEqual(MAX_IMAGE_CACHE_SIZE);
    });

    it('MAX_IMAGE_CACHE_SIZE is a positive integer', () => {
        expect(Number.isInteger(MAX_IMAGE_CACHE_SIZE)).toBe(true);
        expect(MAX_IMAGE_CACHE_SIZE).toBeGreaterThan(0);
    });

    it('DEFAULT_IMAGE_TIMEOUT_MS is a positive integer', () => {
        expect(Number.isInteger(DEFAULT_IMAGE_TIMEOUT_MS)).toBe(true);
        expect(DEFAULT_IMAGE_TIMEOUT_MS).toBeGreaterThan(0);
    });

    it('SHADOW_MASK_OFFSET is a positive integer', () => {
        expect(Number.isInteger(SHADOW_MASK_OFFSET)).toBe(true);
        expect(SHADOW_MASK_OFFSET).toBeGreaterThan(0);
    });

    it('poll/intervals are positive integers', () => {
        expect(Number.isInteger(IFRAME_READY_POLL_MS)).toBe(true);
        expect(IFRAME_READY_POLL_MS).toBeGreaterThan(0);
        expect(Number.isInteger(INLINE_IMAGE_RESOLVE_DELAY_MS)).toBe(true);
        expect(INLINE_IMAGE_RESOLVE_DELAY_MS).toBeGreaterThan(0);
    });

    it('RESOURCE_KEY_LOG_LENGTH is a positive integer', () => {
        expect(Number.isInteger(RESOURCE_KEY_LOG_LENGTH)).toBe(true);
        expect(RESOURCE_KEY_LOG_LENGTH).toBeGreaterThan(0);
    });

    it('all constants are frozen/unchanged at runtime', () => {
        expect(PARSE_CACHE_MAX_PER_DESCRIPTOR).toBe(200);
        expect(PATTERN_CACHE_MAX).toBe(50);
        expect(DEFAULT_IMAGE_CACHE_SIZE).toBe(100);
        expect(MAX_IMAGE_CACHE_SIZE).toBe(10000);
        expect(DEFAULT_IMAGE_TIMEOUT_MS).toBe(15000);
        expect(SHADOW_MASK_OFFSET).toBe(10000);
        expect(IFRAME_READY_POLL_MS).toBe(50);
        expect(INLINE_IMAGE_RESOLVE_DELAY_MS).toBe(500);
        expect(RESOURCE_KEY_LOG_LENGTH).toBe(256);
    });
});
