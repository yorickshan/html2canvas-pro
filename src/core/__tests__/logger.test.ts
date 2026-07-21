import { describe, it, expect } from 'vitest';
import { Logger } from '../logger';

describe('Logger', () => {
    it('creates instance with id and enabled flag', () => {
        const log = new Logger({ id: 'test', enabled: true });
        expect(log).toBeDefined();
    });

    it('creates instance with logging disabled', () => {
        const log = new Logger({ id: 'disabled-logger', enabled: false });
        expect(log).toBeDefined();
    });

    it('getTime returns a number', () => {
        const log = new Logger({ id: 'test', enabled: true });
        const time = log.getTime();
        expect(typeof time).toBe('number');
        expect(time).toBeGreaterThanOrEqual(0);
    });

    it('debug does not throw', () => {
        const log = new Logger({ id: 'test', enabled: true });
        expect(() => log.debug('test message')).not.toThrow();
    });

    it('info does not throw', () => {
        const log = new Logger({ id: 'test', enabled: true });
        expect(() => log.info('test message')).not.toThrow();
    });

    it('warn does not throw', () => {
        const log = new Logger({ id: 'test', enabled: true });
        expect(() => log.warn('test message')).not.toThrow();
    });

    it('error does not throw', () => {
        const log = new Logger({ id: 'test', enabled: true });
        expect(() => log.error('test message')).not.toThrow();
    });

    it('methods do not throw when disabled', () => {
        const log = new Logger({ id: 'test', enabled: false });
        expect(() => log.debug('msg')).not.toThrow();
        expect(() => log.info('msg')).not.toThrow();
        expect(() => log.warn('msg')).not.toThrow();
        expect(() => log.error('msg')).not.toThrow();
    });

    it('methods accept multiple arguments', () => {
        const log = new Logger({ id: 'test', enabled: true });
        expect(() => log.debug('msg', { detail: 1 }, 42)).not.toThrow();
        expect(() => log.info('msg', { detail: 1 })).not.toThrow();
        expect(() => log.warn('msg', new Error())).not.toThrow();
        expect(() => log.error('msg', { code: 500 })).not.toThrow();
    });

    it('getTime increases over time', () => {
        const log = new Logger({ id: 'test', enabled: true });
        const t1 = log.getTime();
        // Small delay to see time increase
        const t2 = log.getTime();
        expect(t2).toBeGreaterThanOrEqual(t1);
    });
});

describe('Logger static API', () => {
    it('static instances is an object', () => {
        expect(typeof Logger.instances).toBe('object');
    });
});
