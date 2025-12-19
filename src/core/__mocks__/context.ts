import { logger, Logger } from './logger';

export class Context {
    readonly logger: Logger = logger;

    readonly _cache: { [key: string]: Promise<any> } = {};

    readonly cache: any;

    constructor() {
        this.cache = {
            addImage: jest.fn().mockImplementation((src: string): Promise<void> => {
                const result = Promise.resolve();
                this._cache[src] = result;
                return result;
            })
        };
    }
}
