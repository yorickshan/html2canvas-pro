import { Logger } from './logger';
import { Cache, ResourceOptions } from './cache-storage';
import { Bounds } from '../css/layout/bounds';
import { OriginChecker } from './origin-checker';
import { Html2CanvasConfig } from '../config';

export type ContextOptions = {
    logging: boolean;
    cache?: Cache;
    /** Called when a resource fails to load. */
    onError?: (error: Error) => void;
} & ResourceOptions;

export class Context {
    private readonly instanceName = `#${Context.instanceCount++}`;
    readonly logger: Logger;
    readonly cache: Cache;
    readonly originChecker: OriginChecker;
    readonly config: Html2CanvasConfig;
    readonly onError?: (error: Error) => void;

    private static instanceCount = 1;
    private _windowBounds: Bounds;

    constructor(options: ContextOptions, windowBounds: Bounds, config: Html2CanvasConfig) {
        this.config = config;
        this.logger = new Logger({ id: this.instanceName, enabled: options.logging });
        this.originChecker = new OriginChecker(config.window);
        this.cache = options.cache ?? config.cache ?? new Cache(this, options);
        this.onError = options.onError;
        this._windowBounds = windowBounds;
    }

    /** Viewport bounds in page coordinates; added to client rects during bounds parsing. */
    get windowBounds(): Bounds {
        return this._windowBounds;
    }

    /**
     * Compensate window bounds for a page scroll that the browser performed
     * underneath us. Used by the document cloner: WebKit's scroll anchoring can
     * scroll the cloned iframe after `onclone`, and the offset must be applied
     * to subsequent bounds parsing (the only sanctioned mutation of this value).
     */
    adjustWindowBounds(left: number, top: number): void {
        this._windowBounds = this._windowBounds.add(left, top, 0, 0);
    }
}
