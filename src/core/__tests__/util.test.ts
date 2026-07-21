import { describe, it, expect } from 'vitest';
import { SMALL_IMAGE } from '../util';

describe('SMALL_IMAGE', () => {
    it('is a valid data URI string', () => {
        expect(typeof SMALL_IMAGE).toBe('string');
        expect(SMALL_IMAGE).toContain('data:image/gif;base64,');
    });

    it('is not empty', () => {
        expect(SMALL_IMAGE.length).toBeGreaterThan(20);
    });
});
