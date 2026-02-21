import { ok } from 'assert';
import { BorderRenderer, BorderRendererDependencies, PathCallbacks } from '../border-renderer';

describe('BorderRenderer', () => {
    it('should be instantiated', () => {
        const ctx = {
            strokeStyle: '',
            save: () => {},
            restore: () => {}
        } as unknown as CanvasRenderingContext2D;

        const deps: BorderRendererDependencies = {
            ctx
        };

        const pathCallbacks: PathCallbacks = {
            path: () => {},
            formatPath: () => {}
        };

        const renderer = new BorderRenderer(deps, pathCallbacks);
        ok(renderer);
    });
});
