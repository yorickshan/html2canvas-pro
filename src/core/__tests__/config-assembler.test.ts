import { describe, it, expect } from 'vitest';
import {
    coerceNumberOptions,
    assembleResourceOptions,
    assembleContextOptions,
    assembleWindowOptions,
    assembleCloneOptions,
    assembleRenderOptions
} from '../config-assembler';
import { Html2CanvasConfig } from '../../config';
import type { Options } from '../../options';

const createMockConfig = () =>
    new Html2CanvasConfig({
        window: {
            innerWidth: 1024,
            innerHeight: 768,
            pageXOffset: 0,
            pageYOffset: 0
        } as unknown as Window
    });

const createMockWindow = (): Window =>
    ({
        innerWidth: 1024,
        innerHeight: 768,
        pageXOffset: 50,
        pageYOffset: 100
    }) as unknown as Window;

describe('coerceNumberOptions', () => {
    it('coerces string numeric values to numbers', () => {
        const opts: Partial<Options> = { width: '200' as unknown as number };
        coerceNumberOptions(opts);
        expect(typeof opts.width).toBe('number');
        expect(opts.width).toBe(200);
    });

    it('leaves valid numbers untouched', () => {
        const opts: Partial<Options> = { scale: 2 };
        coerceNumberOptions(opts);
        expect(opts.scale).toBe(2);
    });

    it('leaves undefined values untouched', () => {
        const opts: Partial<Options> = {};
        coerceNumberOptions(opts);
        expect(opts.scale).toBeUndefined();
    });

    it('skips NaN strings', () => {
        const opts: Partial<Options> = { width: 'abc' as unknown as number };
        coerceNumberOptions(opts);
        expect(opts.width).toBe('abc'); // unchanged
    });
});

describe('assembleResourceOptions', () => {
    it('applies defaults when no options provided', () => {
        const result = assembleResourceOptions({});
        expect(result.allowTaint).toBe(false);
        expect(result.imageTimeout).toBe(15000);
        expect(result.useCORS).toBe(false);
        expect(result.proxy).toBeUndefined();
    });

    it('passes through user-provided values', () => {
        const result = assembleResourceOptions({
            allowTaint: true,
            imageTimeout: 5000,
            proxy: 'https://proxy.example.com',
            useCORS: true,
            maxCacheSize: 200
        });
        expect(result.allowTaint).toBe(true);
        expect(result.imageTimeout).toBe(5000);
        expect(result.proxy).toBe('https://proxy.example.com');
        expect(result.useCORS).toBe(true);
        expect(result.maxCacheSize).toBe(200);
    });
});

describe('assembleWindowOptions', () => {
    it('uses window dimensions when options are absent', () => {
        const result = assembleWindowOptions({}, createMockWindow());
        expect(result.windowWidth).toBe(1024);
        expect(result.windowHeight).toBe(768);
        expect(result.scrollX).toBe(50);
        expect(result.scrollY).toBe(100);
    });

    it('overrides window dimensions with user options', () => {
        const result = assembleWindowOptions(
            { windowWidth: 800, windowHeight: 600, scrollX: 0, scrollY: 0 },
            createMockWindow()
        );
        expect(result.windowWidth).toBe(800);
        expect(result.windowHeight).toBe(600);
        expect(result.scrollX).toBe(0);
        expect(result.scrollY).toBe(0);
    });
});

describe('assembleCloneOptions', () => {
    it('applies defaults', () => {
        const config = createMockConfig();
        const result = assembleCloneOptions({}, config, false);
        expect(result.allowTaint).toBe(false);
        expect(result.inlineImages).toBe(false);
        expect(result.copyStyles).toBe(false);
    });

    it('enables foreignObject flags when requested', () => {
        const config = createMockConfig();
        const result = assembleCloneOptions({}, config, true);
        expect(result.inlineImages).toBe(true);
        expect(result.copyStyles).toBe(true);
    });

    it('passes onclone callback through', () => {
        const onclone = () => {};
        const result = assembleCloneOptions({ onclone }, createMockConfig(), false);
        expect(result.onclone).toBe(onclone);
    });
});

describe('assembleRenderOptions', () => {
    it('computes position with offsets', () => {
        const result = assembleRenderOptions({}, null, 10, 20, 100, 200, 1);
        expect(result.x).toBe(10); // 0 + 10
        expect(result.y).toBe(20); // 0 + 20
        expect(result.width).toBe(100);
        expect(result.height).toBe(200);
    });

    it('overrides x/y with user values', () => {
        const result = assembleRenderOptions({ x: 30, y: 40 }, null, 10, 20, 100, 200, 1);
        expect(result.x).toBe(40); // 30 + 10
        expect(result.y).toBe(60); // 40 + 20
    });

    it('uses devicePixelRatio as default scale', () => {
        const result = assembleRenderOptions({}, null, 0, 0, 100, 200, 2);
        expect(result.scale).toBe(2);
    });

    it('overrides scale with user value', () => {
        const result = assembleRenderOptions({ scale: 3 }, null, 0, 0, 100, 200, 2);
        expect(result.scale).toBe(3);
    });
});
