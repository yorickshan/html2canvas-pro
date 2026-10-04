import { CloneOptions, WindowOptions } from './dom/document-cloner';
import { RenderOptions } from './render/canvas/canvas-renderer';
import { ContextOptions } from './core/context';
import { Validator } from './core/validator';

/**
 * Options passed to {@link html2canvas}.
 *
 * Combines clone, window, render, and context configuration into a single
 * options object. All properties are optional.
 */
export type Options = CloneOptions &
    WindowOptions &
    RenderOptions &
    ContextOptions & {
        /** Background color for the resulting canvas. Use `null` for transparent. */
        backgroundColor: string | null;
        /** Use foreignObject rendering (SVG-based) instead of the default Canvas 2D pipeline. */
        foreignObjectRendering: boolean;
        /** Whether to remove the cloned iframe after rendering. @default true */
        removeContainer?: boolean;
        /**
         * Normalize the cloned DOM before parsing: disable CSS animations and
         * replace active transforms with identity values so element bounds are
         * measured in layout space. Set to `false` to keep animation/transform
         * state intact during capture.
         * @default true
         */
        normalizeDom?: boolean;
        /** CSP nonce for inline style elements. */
        cspNonce?: string;
        /** Custom input validator. */
        validator?: Validator;
        /** Skip pre-render validation of element and options. */
        skipValidation?: boolean;
        /** Enable performance monitoring and log a timing summary. */
        enablePerformanceMonitoring?: boolean;
        /**
         * An AbortSignal that can be used to cancel an in-progress render.
         * When the signal is aborted, the returned promise rejects with an
         * `AbortError` DOMException.
         */
        signal?: AbortSignal;
        /**
         * Enable/disable image smoothing (anti-aliasing) globally.
         * - `false`: Pixel-perfect rendering for pixel art, sprites, and retro graphics
         * - `true`: Smooth rendering for photos and high-quality images
         * - CSS `image-rendering` property on individual elements takes precedence
         * @default true (browser default)
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
        /**
         * Called when a resource fails to load (image, font, iframe, etc.).
         * The render continues — this is a notification hook, not an abort.
         */
        onError?: (error: Error) => void;
        /**
         * Called at key milestones during the render pipeline.
         * `phase` is one of: 'clone' | 'parse' | 'preload' | 'layout' | 'render'.
         * `progress` is a coarse 0–100 estimate. Milestones:
         *   clone 10 (cloning starts), clone 30 (cloned document ready),
         *   parse 50 (style/DOM parse done),
         *   preload 50–60 (image fetching; one event per settled batch),
         *   layout 60 (bounds + images ready),
         *   render 90 (canvas painted), render 100 (cleanup done).
         * Callback exceptions are caught and logged, never fatal.
         */
        onProgress?: (phase: string, progress: number) => void;
    };
