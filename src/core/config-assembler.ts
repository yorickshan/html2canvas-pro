import type { Options } from '../options';
import type { Html2CanvasConfig } from '../config';
import type { ResourceOptions } from './cache-storage';
import type { ContextOptions } from './context';
import type { CloneConfigurations } from '../dom/document-cloner';
import type { RenderConfigurations } from '../render/canvas/canvas-renderer';
import { DEFAULT_IMAGE_TIMEOUT_MS } from './constants';

/**
 * Coerce known numeric options from string (or other) values to actual numbers.
 * Mutates the opts object in place — this is intentionally a normalisation
 * (not pure) step that runs once at the beginning of renderElement.
 */
export const coerceNumberOptions = (opts: Partial<Options>): void => {
    const numKeys: (keyof Options)[] = [
        'scale',
        'width',
        'height',
        'imageTimeout',
        'x',
        'y',
        'windowWidth',
        'windowHeight',
        'scrollX',
        'scrollY'
    ];
    numKeys.forEach((key) => {
        const v = opts[key];
        if (v !== undefined && v !== null && typeof v !== 'number') {
            const n = Number(v);
            if (!Number.isNaN(n)) {
                (opts as Record<string, unknown>)[key] = n;
            }
        }
    });
};

/** Assemble resource loading options from user-provided Options. */
export const assembleResourceOptions = (opts: Partial<Options>): ResourceOptions => ({
    allowTaint: opts.allowTaint ?? false,
    imageTimeout: opts.imageTimeout ?? DEFAULT_IMAGE_TIMEOUT_MS,
    proxy: opts.proxy,
    useCORS: opts.useCORS ?? false,
    customIsSameOrigin: opts.customIsSameOrigin,
    maxCacheSize: opts.maxCacheSize
});

/** Assemble context (logging + cache) options, extending resource options. */
export const assembleContextOptions = (
    opts: Partial<Options>,
    config: Html2CanvasConfig,
    resourceOptions: ResourceOptions
): ContextOptions => ({
    logging: opts.logging ?? true,
    cache: opts.cache ?? config.cache,
    ...resourceOptions
});

/** Assemble window / viewport options. */
export interface AssembledWindowOptions {
    windowWidth: number;
    windowHeight: number;
    scrollX: number;
    scrollY: number;
}

const DEFAULT_WINDOW_WIDTH = 800;
const DEFAULT_WINDOW_HEIGHT = 600;
const DEFAULT_SCROLL = 0;

export const assembleWindowOptions = (opts: Partial<Options>, defaultView: Window): AssembledWindowOptions => {
    const win = defaultView as Window & {
        innerWidth?: number;
        innerHeight?: number;
        pageXOffset?: number;
        pageYOffset?: number;
    };
    return {
        windowWidth: opts.windowWidth ?? win.innerWidth ?? DEFAULT_WINDOW_WIDTH,
        windowHeight: opts.windowHeight ?? win.innerHeight ?? DEFAULT_WINDOW_HEIGHT,
        scrollX: opts.scrollX ?? win.pageXOffset ?? DEFAULT_SCROLL,
        scrollY: opts.scrollY ?? win.pageYOffset ?? DEFAULT_SCROLL
    };
};

/** Assemble DOM cloning options. */
export const assembleCloneOptions = (
    opts: Partial<Options>,
    config: Html2CanvasConfig,
    foreignObjectRendering: boolean
): CloneConfigurations => ({
    allowTaint: opts.allowTaint ?? false,
    onclone: opts.onclone,
    ignoreElements: opts.ignoreElements,
    iframeContainer: opts.iframeContainer,
    inlineImages: foreignObjectRendering,
    copyStyles: foreignObjectRendering,
    cspNonce: opts.cspNonce ?? config.cspNonce
});

/** Assemble canvas rendering options. */
export const assembleRenderOptions = (
    opts: Partial<Options>,
    backgroundColor: number | null,
    left: number,
    top: number,
    width: number,
    height: number,
    devicePixelRatio: number
): RenderConfigurations => ({
    canvas: opts.canvas,
    backgroundColor,
    signal: opts.signal,
    scale: opts.scale ?? devicePixelRatio ?? 1,
    x: (opts.x ?? 0) + left,
    y: (opts.y ?? 0) + top,
    width: opts.width ?? Math.ceil(width),
    height: opts.height ?? Math.ceil(height),
    imageSmoothing: opts.imageSmoothing,
    imageSmoothingQuality: opts.imageSmoothingQuality
});
