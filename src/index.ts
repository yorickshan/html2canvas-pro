import { Bounds, parseBounds, parseDocumentSize } from './css/layout/bounds';
import { COLORS, parseColor } from './css/types/color';
import { isTransparent } from './css/types/color-utilities';
import { CloneConfigurations, CloneOptions, DocumentCloner, WindowOptions } from './dom/document-cloner';
import { isBodyElement, isHTMLElement, parseTree } from './dom/node-parser';
import { ElementContainer } from './dom/element-container';
import { CanvasRenderer, RenderConfigurations, RenderOptions } from './render/canvas/canvas-renderer';
import { ForeignObjectRenderer } from './render/canvas/foreignobject-renderer';
import { Context, ContextOptions } from './core/context';
import { Html2CanvasConfig, ConfigOptions, setDefaultConfig } from './config';
import { createDefaultValidator, Validator, ValidationResult } from './core/validator';
import { PerformanceMonitor } from './core/performance-monitor';

export type Options = CloneOptions &
    WindowOptions &
    RenderOptions &
    ContextOptions & {
        backgroundColor: string | null;
        foreignObjectRendering: boolean;
        removeContainer?: boolean;
        cspNonce?: string;
        validator?: Validator;
        skipValidation?: boolean;
        enablePerformanceMonitoring?: boolean;
        /**
         * Enable/disable image smoothing (anti-aliasing) globally.
         * - `false`: Pixel-perfect rendering for pixel art, sprites, and retro graphics
         * - `true`: Smooth rendering for photos and high-quality images
         * - CSS `image-rendering` property on individual elements takes precedence
         * @default true (browser default)
         * @example
         * // Pixel art game screenshot
         * html2canvas(element, { imageSmoothing: false, scale: 2 });
         *
         * // High-quality photo
         * html2canvas(element, { imageSmoothing: true, imageSmoothingQuality: 'high' });
         */
        imageSmoothing?: boolean;
        /**
         * Image smoothing quality level when imageSmoothing is enabled.
         * - `'low'`: Faster, lower quality (good for preview)
         * - `'medium'`: Balanced (default in most browsers)
         * - `'high'`: Slower, best quality (good for final export)
         *
         * Browser support: Chrome 54+, Firefox 94+, Safari 17+
         * Falls back gracefully in older browsers.
         * @default browser default (usually 'low' or 'medium')
         */
        imageSmoothingQuality?: 'low' | 'medium' | 'high';
    };

/**
 * Main html2canvas function with improved configuration management
 *
 * @param element - Element to render
 * @param options - Rendering options
 * @param config - Optional configuration (for advanced use cases)
 * @returns Promise resolving to rendered canvas
 */
const html2canvas = (
    element: HTMLElement,
    options: Partial<Options> = {},
    config?: Html2CanvasConfig
): Promise<HTMLCanvasElement> => {
    // Create configuration from element if not provided
    const finalConfig =
        config ||
        Html2CanvasConfig.fromElement(element, {
            cspNonce: options.cspNonce,
            cache: options.cache
        });

    return renderElement(element, options, finalConfig);
};

/**
 * Set CSP nonce for inline styles
 * @deprecated Use options.cspNonce instead
 */
const setCspNonce = (nonce: string) => {
    console.warn(
        '[html2canvas-pro] setCspNonce is deprecated. ' +
            'Pass cspNonce in options instead: html2canvas(element, { cspNonce: "..." })'
    );

    // For backward compatibility, set default config
    if (typeof window !== 'undefined') {
        setDefaultConfig(new Html2CanvasConfig({ window, cspNonce: nonce }));
    }
};

html2canvas.setCspNonce = setCspNonce;

export default html2canvas;
export {
    html2canvas,
    setCspNonce,
    Html2CanvasConfig,
    ConfigOptions,
    Validator,
    ValidationResult,
    createDefaultValidator,
    PerformanceMonitor
};

export { IMAGE_RENDERING } from './css/property-descriptors/image-rendering';

/**
 * Coerce number-like option values for backward compatibility (e.g. string "2" from form/query).
 * Mutates opts in place; callers should avoid reusing the same options object if they rely on original types.
 */
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

const renderElement = async (
    element: HTMLElement,
    opts: Partial<Options>,
    config: Html2CanvasConfig
): Promise<HTMLCanvasElement> => {
    coerceNumberOptions(opts);

    // Input validation (unless explicitly skipped)
    if (!opts.skipValidation) {
        const validator = opts.validator || createDefaultValidator();

        // Validate element
        const elementValidation = validator.validateElement(element);
        if (!elementValidation.valid) {
            throw new Error(elementValidation.error);
        }

        // Validate options
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
        customIsSameOrigin: opts.customIsSameOrigin
    };

    const contextOptions = {
        logging: opts.logging ?? true,
        cache: opts.cache ?? config.cache,
        ...resourceOptions
    };

    // Fallbacks for minimal window (e.g. element-like mocks) so we don't get NaN
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

    // Initialize performance monitoring if enabled
    const performanceMonitoring = opts.enablePerformanceMonitoring ?? opts.logging ?? false;
    const perfMonitor = new PerformanceMonitor(context, performanceMonitoring);

    perfMonitor.start('total', {
        width: windowOptions.windowWidth,
        height: windowOptions.windowHeight
    });

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

    const { width, height, left, top } =
        isBodyElement(clonedElement) || isHTMLElement(clonedElement)
            ? parseDocumentSize(clonedElement.ownerDocument)
            : parseBounds(context, clonedElement);

    const backgroundColor = parseBackgroundColor(context, clonedElement, opts.backgroundColor);

    const renderOptions: RenderConfigurations = {
        canvas: opts.canvas,
        backgroundColor,
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
            root = parseTree(context, clonedElement);
            perfMonitor.end('parse');

            if (backgroundColor === root.styles.backgroundColor) {
                root.styles.backgroundColor = COLORS.TRANSPARENT;
            }

            context.logger.debug(
                `Starting renderer for element at ${renderOptions.x},${renderOptions.y} with size ${renderOptions.width}x${renderOptions.height}`
            );

            perfMonitor.start('render');
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

        // Log performance summary if monitoring is enabled
        if (performanceMonitoring) {
            perfMonitor.logSummary();
        }

        return canvas;
    } finally {
        // Restore DOM modifications (animations, transforms) in cloned document
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
