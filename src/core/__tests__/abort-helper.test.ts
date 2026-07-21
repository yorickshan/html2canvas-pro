import { describe, it, expect } from 'vitest';
import { throwIfAborted } from '../abort-helper';

describe('throwIfAborted', () => {
    it('does not throw when signal is undefined', () => {
        expect(() => throwIfAborted(undefined)).not.toThrow();
    });

    it('does not throw when signal.aborted is false', () => {
        expect(() => throwIfAborted({ aborted: false } as AbortSignal)).not.toThrow();
    });

    it('throws DOMException with name AbortError when signal.aborted is true', () => {
        expect(() => throwIfAborted({ aborted: true } as AbortSignal)).toThrow(DOMException);
        try {
            throwIfAborted({ aborted: true } as AbortSignal);
        } catch (e) {
            expect((e as DOMException).name).toBe('AbortError');
        }
    });
});
