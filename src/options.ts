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
    };
