import { CloneOptions, WindowOptions } from './dom/document-cloner';
import { RenderOptions } from './render/canvas/canvas-renderer';
import { ContextOptions } from './core/context';
import { Validator } from './core/validator';

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
