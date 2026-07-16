import { Bounds, parseBounds, parseDocumentSize } from '../css/layout/bounds';
import { COLORS, parseColor } from '../css/types/color';
import { isTransparent } from '../css/types/color-utilities';
import { CloneConfigurations, DocumentCloner } from '../dom/document-cloner';
import { isBodyElement, isHTMLElement, parseTree } from '../dom/node-parser';
import { ElementContainer } from '../dom/element-container';
import { CanvasRenderer, RenderConfigurations } from '../render/canvas/canvas-renderer';
import { ForeignObjectRenderer } from '../render/canvas/foreignobject-renderer';
import { Context } from './context';
import { Html2CanvasConfig } from '../config';
import { createDefaultValidator } from './validator';
import { PerformanceMonitor } from './performance-monitor';
import type { Options } from '../options';

const coerceNumberOptions = (opts: Partial<Options>): void => {
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

import { throwIfAborted } from './abort-helper';

export const renderElement = async (
    element: HTMLElement,
    opts: Partial<Options>,
    config: Html2CanvasConfig
): Promise<HTMLCanvasElement> => {
    coerceNumberOptions(opts);

    // Input validation (unless explicitly skipped)
    if (!opts.skipValidation) {
        const validator = opts.validator || createDefaultValidator();

        const elementValidation = validator.validateElement(element);
        if (!elementValidation.valid) {
            throw new Error(elementValidation.error);
        }

        const optionsValidation = validator.validateOptions(opts);
        if (!optionsValidation.valid) {
            throw new Error(`Invalid options: ${optionsValidation.error}`);
        }
    }

    if (!element || typeof element !== 'object') {
        throw new Error('Invalid element provided as first argument');
    }
    const ownerDocument = element.ownerDocument;

    if (!ownerDocument) {
        throw new Error(`Element is not attached to a Document`);
    }

    const defaultView = ownerDocument.defaultView;

    if (!defaultView) {
        throw new Error(`Document is not attached to a Window`);
    }

    const resourceOptions = {
        allowTaint: opts.allowTaint ?? false,
        imageTimeout: opts.imageTimeout ?? 15000,
        proxy: opts.proxy,
        useCORS: opts.useCORS ?? false,
        customIsSameOrigin: opts.customIsSameOrigin,
        maxCacheSize: opts.maxCacheSize
    };

    const contextOptions = {
        logging: opts.logging ?? true,
        cache: opts.cache ?? config.cache,
        ...resourceOptions
    };

    const DEFAULT_WINDOW_WIDTH = 800;
    const DEFAULT_WINDOW_HEIGHT = 600;
    const DEFAULT_SCROLL = 0;
    const win = defaultView as Window & {
        innerWidth?: number;
        innerHeight?: number;
        pageXOffset?: number;
        pageYOffset?: number;
    };
    const windowOptions = {
        windowWidth: opts.windowWidth ?? win.innerWidth ?? DEFAULT_WINDOW_WIDTH,
        windowHeight: opts.windowHeight ?? win.innerHeight ?? DEFAULT_WINDOW_HEIGHT,
        scrollX: opts.scrollX ?? win.pageXOffset ?? DEFAULT_SCROLL,
        scrollY: opts.scrollY ?? win.pageYOffset ?? DEFAULT_SCROLL
    };

    const windowBounds = new Bounds(
        windowOptions.scrollX,
        windowOptions.scrollY,
        windowOptions.windowWidth,
        windowOptions.windowHeight
    );

    const context = new Context(contextOptions, windowBounds, config);

    const performanceMonitoring = opts.enablePerformanceMonitoring ?? opts.logging ?? false;
    const perfMonitor = new PerformanceMonitor(context, performanceMonitoring);

    perfMonitor.start('total', {
        width: windowOptions.windowWidth,
        height: windowOptions.windowHeight
    });

    const signal = opts.signal;

    throwIfAborted(signal);

    const foreignObjectRendering = opts.foreignObjectRendering ?? false;

    const cloneOptions: CloneConfigurations = {
        allowTaint: opts.allowTaint ?? false,
        onclone: opts.onclone,
        ignoreElements: opts.ignoreElements,
        iframeContainer: opts.iframeContainer,
        inlineImages: foreignObjectRendering,
        copyStyles: foreignObjectRendering,
        cspNonce: opts.cspNonce ?? config.cspNonce
    };

    context.logger.debug(
        `Starting document clone with size ${windowBounds.width}x${
            windowBounds.height
        } scrolled to ${-windowBounds.left},${-windowBounds.top}`
    );

    perfMonitor.start('clone');
    const documentCloner = new DocumentCloner(context, element, cloneOptions);
    const clonedElement = documentCloner.clonedReferenceElement;
    if (!clonedElement) {
        throw new Error('Unable to find element in cloned iframe');
    }

    const container = await documentCloner.toIFrame(ownerDocument, windowBounds);
    perfMonitor.end('clone');

    if (signal?.aborted) {
        if (opts.removeContainer ?? true) {
            DocumentCloner.destroy(container);
        }
        throwIfAborted(signal);
    }

    const { width, height, left, top } =
        isBodyElement(clonedElement) || isHTMLElement(clonedElement)
            ? parseDocumentSize(clonedElement.ownerDocument)
            : parseBounds(context, clonedElement);

    const backgroundColor = parseBackgroundColor(context, clonedElement, opts.backgroundColor);

    const renderOptions: RenderConfigurations = {
        canvas: opts.canvas,
        backgroundColor,
        signal,
        scale: opts.scale ?? defaultView.devicePixelRatio ?? 1,
        x: (opts.x ?? 0) + left,
        y: (opts.y ?? 0) + top,
        width: opts.width ?? Math.ceil(width),
        height: opts.height ?? Math.ceil(height),
        imageSmoothing: opts.imageSmoothing,
        imageSmoothingQuality: opts.imageSmoothingQuality
    };

    let canvas;

    let root: ElementContainer | undefined;

    try {
        if (foreignObjectRendering) {
            context.logger.debug(`Document cloned, using foreign object rendering`);
            perfMonitor.start('render-foreignobject');
            const renderer = new ForeignObjectRenderer(context, renderOptions);
            canvas = await renderer.render(clonedElement);
            perfMonitor.end('render-foreignobject');
        } else {
            context.logger.debug(
                `Document cloned, element located at ${left},${top} with size ${width}x${height} using computed rendering`
            );

            context.logger.debug(`Starting DOM parsing`);
            perfMonitor.start('parse');
            throwIfAborted(signal);
            root = parseTree(context, clonedElement);
            perfMonitor.end('parse');

            if (backgroundColor === root.styles.backgroundColor) {
                root.styles.backgroundColor = COLORS.TRANSPARENT;
            }

            context.logger.debug(
                `Starting renderer for element at ${renderOptions.x},${renderOptions.y} with size ${renderOptions.width}x${renderOptions.height}`
            );

            perfMonitor.start('render');
            throwIfAborted(signal);
            const renderer = new CanvasRenderer(context, renderOptions);
            canvas = await renderer.render(root);
            perfMonitor.end('render');
        }

        perfMonitor.start('cleanup');
        if (opts.removeContainer ?? true) {
            if (!DocumentCloner.destroy(container)) {
                context.logger.error(`Cannot detach cloned iframe as it is not in the DOM anymore`);
            }
        }
        perfMonitor.end('cleanup');

        perfMonitor.end('total');
        context.logger.debug(`Finished rendering`);

        if (performanceMonitoring) {
            perfMonitor.logSummary();
        }

        return canvas;
    } finally {
        if (root) {
            root.restoreTree();
        }
    }
};

const parseBackgroundColor = (context: Context, element: HTMLElement, backgroundColorOverride?: string | null) => {
    const ownerDocument = element.ownerDocument;
    // http://www.w3.org/TR/css3-background/#special-backgrounds
    const documentBackgroundColor = ownerDocument.documentElement
        ? parseColor(context, getComputedStyle(ownerDocument.documentElement).backgroundColor as string)
        : COLORS.TRANSPARENT;
    const bodyBackgroundColor = ownerDocument.body
        ? parseColor(context, getComputedStyle(ownerDocument.body).backgroundColor as string)
        : COLORS.TRANSPARENT;

    const defaultBackgroundColor =
        typeof backgroundColorOverride === 'string'
            ? parseColor(context, backgroundColorOverride)
            : backgroundColorOverride === null
              ? COLORS.TRANSPARENT
              : 0xffffffff;

    return element === ownerDocument.documentElement
        ? isTransparent(documentBackgroundColor)
            ? isTransparent(bodyBackgroundColor)
                ? defaultBackgroundColor
                : bodyBackgroundColor
            : documentBackgroundColor
        : defaultBackgroundColor;
};
