import { describe, it, expect } from 'vitest';
import { Html2CanvasConfig } from '../config';

describe('Html2CanvasConfig', () => {
    it('creates with default window when no options given', () => {
        const config = new Html2CanvasConfig();
        expect(config.window).toBe(window);
    });

    it('creates with provided window', () => {
        const mockWin = {
            location: { href: 'https://test.com' },
            document: {
                documentElement: document.documentElement,
                body: document.body
            }
        } as unknown as Window;
        const config = new Html2CanvasConfig({ window: mockWin });
        expect(config.window).toBe(mockWin);
    });

    it('stores cspNonce', () => {
        const config = new Html2CanvasConfig({ cspNonce: 'abc123' });
        expect(config.cspNonce).toBe('abc123');
    });

    it('clone returns a new instance', () => {
        const original = new Html2CanvasConfig({ cspNonce: 'x' });
        const cloned = original.clone();
        expect(cloned).not.toBe(original);
        expect(cloned.cspNonce).toBe('x');
    });

    it('clone accepts overrides', () => {
        const original = new Html2CanvasConfig({ cspNonce: 'x' });
        const cloned = original.clone({ cspNonce: 'y' });
        expect(cloned.cspNonce).toBe('y');
    });

    it('fromElement uses element ownerDocument defaultView', () => {
        const el = document.createElement('div');
        const config = Html2CanvasConfig.fromElement(el);
        expect(config.window).toBe(window);
    });
});
