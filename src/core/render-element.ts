import { Bounds, parseBounds, parseDocumentSize } from '../css/layout/bounds';
import { COLORS } from '../css/types/color';
import { CloneConfigurations, DocumentCloner } from '../dom/document-cloner';
import { isBodyElement, isHTMLElement } from '../dom/node-type-guards';
import { parseTree } from '../dom/node-parser';
import { ElementContainer } from '../dom/element-container';
import { CanvasRenderer, RenderConfigurations } from '../render/canvas/canvas-renderer';
import { ForeignObjectRenderer } from '../render/canvas/foreignobject-renderer';
import { Context } from './context';
import { Html2CanvasConfig } from '../config';
import { createDefaultValidator } from './validator';
import { PerformanceMonitor } from './performance-monitor';
import type { Options } from '../options';
import { throwIfAborted } from './abort-helper';
import {
    coerceNumberOptions,
    assembleResourceOptions,
    assembleContextOptions,
    assembleWindowOptions,
    assembleCloneOptions,
    assembleRenderOptions
} from './config-assembler';
import { parseBackgroundColor } from './background-parser';

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

    const resourceOptions = assembleResourceOptions(opts);
    const contextOptions = assembleContextOptions(opts, config, resourceOptions);
    const windowOptions = assembleWindowOptions(opts, defaultView);

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
    const cloneOptions: CloneConfigurations = assembleCloneOptions(opts, config, foreignObjectRendering);

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

    const renderOptions: RenderConfigurations = assembleRenderOptions(
        opts,
        backgroundColor,
        left,
        top,
        width,
        height,
        defaultView.devicePixelRatio ?? 1
    );

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
            // Enter defer mode: collect all image URLs during parse without
            // starting individual loads. This avoids serialised loading in
            // DOM-traversal order.
            context.cache.startDefer();
            root = parseTree(context, clonedElement);
            perfMonitor.end('parse');

            // Batch-preload all collected images in parallel before rendering.
            perfMonitor.start('preload');
            await context.cache.preloadAll();
            perfMonitor.end('preload');

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
