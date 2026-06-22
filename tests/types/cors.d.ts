/**
 * Type declaration for cors module
 */
declare module 'cors' {
    import { RequestHandler } from 'express';
    function cors(options?: any): RequestHandler;
    export default cors;
}
