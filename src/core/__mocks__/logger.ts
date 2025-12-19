export class Logger {
    debug(): void {}

    static create(): void {}

    static destroy(): void {}

    static getInstance(): Logger {
        return logger;
    }

    info(): void {}

    error(): void {}
}

export const logger = new Logger();
