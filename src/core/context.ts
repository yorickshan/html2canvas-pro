import { Logger } from './logger';
import { Cache, ResourceOptions } from './cache-storage';
import { Bounds } from '../css/layout/bounds';
import { OriginChecker } from './origin-checker';
import { Html2CanvasConfig } from '../config';

export type ContextOptions = {
    logging: boolean;
    cache?: Cache;
} & ResourceOptions;

export class Context {
    private readonly instanceName = `#${Context.instanceCount++}`;
    readonly logger: Logger;
    readonly cache: Cache;
    readonly originChecker: OriginChecker;
    readonly config: Html2CanvasConfig;

    private static instanceCount = 1;

    constructor(
        options: ContextOptions,
        public windowBounds: Bounds,
        config: Html2CanvasConfig
    ) {
        this.config = config;
        this.logger = new Logger({ id: this.instanceName, enabled: options.logging });
        this.originChecker = new OriginChecker(config.window);
        this.cache = options.cache ?? config.cache ?? new Cache(this, options);
    }
}
