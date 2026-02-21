/**
 * Type declaration for mkdirp module
 * This file provides basic type support for mkdirp@0.5.x
 */
declare module 'mkdirp' {
    function mkdirp(
        dir: string,
        opts?: any,
        cb?: (err: Error | null, made?: string) => void
    ): Promise<string | undefined>;
    namespace mkdirp {
        function sync(dir: string, opts?: any): string | undefined;
    }
    export = mkdirp;
}
