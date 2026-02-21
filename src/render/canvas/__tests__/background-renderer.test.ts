import { ok } from 'assert';
import { BackgroundRenderer, BackgroundRendererDependencies } from '../background-renderer';
import { Context } from '../../../core/context';
import { Bounds } from '../../../css/layout/bounds';
import { Html2CanvasConfig } from '../../../config';

describe('BackgroundRenderer', () => {
    it('should be instantiated', () => {
        const mockWindow = {
            document: {
                createElement: (_name: string) => {
                    let _href = '';
                    return {
                        set href(value: string) {
                            _href = value;
                        },
                        get href() {
                            return _href;
                        },
                        get protocol() {
                            return 'http:';
                        },
                        get hostname() {
                            return 'localhost';
                        },
                        get port() {
                            return '';
                        }
                    };
                }
            },
            location: { href: 'http://localhost/' }
        } as unknown as Window;

        const config = new Html2CanvasConfig({ window: mockWindow });
        const context = new Context(
            {
                logging: false,
                imageTimeout: 15000,
                useCORS: false,
                allowTaint: false
            },
            new Bounds(0, 0, 800, 600),
            config
        );

        const canvas = {
            width: 800,
            height: 600
        } as unknown as HTMLCanvasElement;

        const ctx = {
            fillStyle: '',
            save: () => {},
            restore: () => {}
        } as unknown as CanvasRenderingContext2D;

        const deps: BackgroundRendererDependencies = {
            ctx,
            context,
            canvas,
            options: {
                width: 800,
                height: 600,
                scale: 1
            }
        };

        const renderer = new BackgroundRenderer(deps);
        ok(renderer);
    });
});
