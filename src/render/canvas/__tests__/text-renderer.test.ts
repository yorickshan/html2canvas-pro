import { ok, strictEqual } from 'assert';
import { TextRenderer, TextRendererDependencies } from '../text-renderer';
import { Context } from '../../../core/context';
import { Bounds } from '../../../css/layout/bounds';
import { Html2CanvasConfig } from '../../../config';

describe('TextRenderer', () => {
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

        const ctx = {
            fillStyle: '',
            font: '',
            save: () => {},
            restore: () => {}
        } as unknown as CanvasRenderingContext2D;

        const deps: TextRendererDependencies = {
            ctx,
            context,
            options: {
                scale: 1
            }
        };

        const renderer = new TextRenderer(deps);
        ok(renderer);

        // Test public methods exist
        strictEqual(typeof renderer.renderTextNode, 'function');
        strictEqual(typeof renderer.renderTextWithLetterSpacing, 'function');
        strictEqual(typeof renderer.createFontStyle, 'function');
    });
});
