/**
 * Type declaration for body-parser module
 */
declare module 'body-parser' {
    import { RequestHandler } from 'express';
    function json(options?: any): RequestHandler;
    function urlencoded(options?: any): RequestHandler;
    namespace bodyParser {
        export { json, urlencoded };
    }
    export = bodyParser;
}
