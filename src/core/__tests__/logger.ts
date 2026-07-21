import { describe, it, expect } from 'vitest';
import { Logger } from '../logger';

describe('logger', () => {
    let infoSpy: ReturnType<typeof vi.spyOn>;
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        infoSpy.mockRestore();
        warnSpy.mockRestore();
        errorSpy.mockRestore();
    });

    it('should call console.info when logger enabled', () => {
        const id = Math.random().toString();
        const logger = new Logger({ id, enabled: true });
        logger.info('testing');
        expect(infoSpy).toHaveBeenLastCalledWith(id, expect.stringMatching(/\d+ms/), 'testing');
    });

    it("shouldn't call console.info when logger disabled", () => {
        const id = Math.random().toString();
        const logger = new Logger({ id, enabled: false });
        logger.info('testing');
        expect(infoSpy).not.toHaveBeenCalled();
    });

    it('warn calls console.warn when enabled', () => {
        const logger = new Logger({ id: 'test', enabled: true });
        logger.warn('warning');
        expect(warnSpy).toHaveBeenCalled();
    });

    it('warn is suppressed when disabled', () => {
        const logger = new Logger({ id: 'test', enabled: false });
        logger.warn('warning');
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('error calls console.error when enabled', () => {
        const logger = new Logger({ id: 'test', enabled: true });
        logger.error('failure');
        expect(errorSpy).toHaveBeenCalled();
    });

    it('error is suppressed when disabled', () => {
        const logger = new Logger({ id: 'test', enabled: false });
        logger.error('failure');
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('debug is suppressed when disabled', () => {
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const logger = new Logger({ id: 'test', enabled: false });
        logger.debug('debug');
        expect(debugSpy).not.toHaveBeenCalled();
        debugSpy.mockRestore();
    });

    it('getTime returns elapsed ms since construction', () => {
        const logger = new Logger({ id: 't', enabled: false });
        expect(typeof logger.getTime()).toBe('number');
        expect(logger.getTime()).toBeGreaterThanOrEqual(0);
    });
});
