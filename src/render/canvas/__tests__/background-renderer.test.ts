import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundRenderer, BackgroundRendererDependencies } from '../background-renderer';
import { Context } from '../../../core/context';
import { Cache } from '../../../core/cache-storage';
import { Bounds } from '../../../css/layout/bounds';
import { ElementContainer } from '../../../dom/element-container';
import { Html2CanvasConfig } from '../../../config';
import { createMockContext } from '../../__mocks__/canvas';
import { Parser } from '../../../css/syntax/parser';
import { FLAG_INTEGER, TokenType } from '../../../css/syntax/token-types';
import { color } from '../../../css/types/color';
import { CSSImageType, CSSRadialExtent, CSSRadialShape } from '../../../css/types/image';
import { backgroundPosition } from '../../../css/property-descriptors/background-position';
import { backgroundSize } from '../../../css/property-descriptors/background-size';
import { BACKGROUND_REPEAT } from '../../../css/property-descriptors/background-repeat';
import { IMAGE_RENDERING } from '../../../css/property-descriptors/image-rendering';

const parseColor = (value: string) => color.parse({} as Context, Parser.parseValue(value));

const px = (n: number) => ({
    type: TokenType.DIMENSION_TOKEN,
    number: n,
    flags: FLAG_INTEGER,
    unit: 'px'
});

const parseSizeLayer = (value: string) => backgroundSize.parse({} as Context, Parser.parseValues(value))[0];
const parsePositionLayer = (value: string) => backgroundPosition.parse({} as Context, Parser.parseValues(value))[0];

const AUTO_TOKEN = { type: TokenType.IDENT_TOKEN, value: 'auto', flags: 0 };

const urlImage = (url: string) => ({ url, type: CSSImageType.URL });

const linearGradientImage = (first: string, second: string) => ({
    angle: 0,
    type: CSSImageType.LINEAR_GRADIENT,
    stops: [
        { color: parseColor(first), stop: null },
        { color: parseColor(second), stop: null }
    ]
});

const repeatingGradientImage = (firstStop: number, secondStop: number) => ({
    angle: 0,
    type: CSSImageType.REPEATING_LINEAR_GRADIENT,
    stops: [
        { color: parseColor('red'), stop: px(firstStop) },
        { color: parseColor('blue'), stop: px(secondStop) }
    ]
});

const radialGradientImage = (overrides: Record<string, unknown> = {}) => ({
    angle: 0,
    type: CSSImageType.RADIAL_GRADIENT,
    shape: CSSRadialShape.ELLIPSE,
    size: CSSRadialExtent.FARTHEST_CORNER,
    position: [],
    stops: [
        { color: parseColor('red'), stop: null },
        { color: parseColor('blue'), stop: null }
    ],
    ...overrides
});

describe('BackgroundRenderer', () => {
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

    let context: Context;
    let cache: { match: ReturnType<typeof vi.fn> };
    let onError: ReturnType<typeof vi.fn>;
    let loggerError: ReturnType<typeof vi.fn>;
    let loggerDebug: ReturnType<typeof vi.fn>;
    let createdContexts: CanvasRenderingContext2D[];

    beforeEach(() => {
        createdContexts = [];
        cache = { match: vi.fn() };
        onError = vi.fn();
        loggerError = vi.fn();
        loggerDebug = vi.fn();
        const config = new Html2CanvasConfig({ window: mockWindow });
        context = new Context(
            {
                logging: false,
                imageTimeout: 15000,
                useCORS: false,
                allowTaint: false,
                cache: cache as unknown as Cache,
                onError
            },
            new Bounds(0, 0, 800, 600),
            config
        );
        (context.logger as unknown as { error: ReturnType<typeof vi.fn> }).error = loggerError;
        (context.logger as unknown as { debug: ReturnType<typeof vi.fn> }).debug = loggerDebug;

        // Offscreen canvases created by the renderer get a mock 2d context,
        // recorded in creation order for assertions.
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
            const mock = createMockContext();
            createdContexts.push(mock);
            return mock;
        });
    });

    afterEach(() => vi.restoreAllMocks());

    const createRenderer = (ctx = createMockContext()) => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const deps: BackgroundRendererDependencies = {
            ctx,
            context,
            canvas,
            options: { width: 800, height: 600, scale: 1 }
        };
        return { renderer: new BackgroundRenderer(deps), ctx, canvas };
    };

    const container = (styles: Record<string, unknown>): ElementContainer =>
        ({
            bounds: new Bounds(0, 0, 100, 50),
            styles: {
                backgroundImage: [],
                backgroundOrigin: [0],
                backgroundClip: [0],
                backgroundSize: [[AUTO_TOKEN]],
                backgroundPosition: [parsePositionLayer('0px 0px')],
                backgroundRepeat: [BACKGROUND_REPEAT.REPEAT],
                backgroundBlendMode: [],
                imageRendering: IMAGE_RENDERING.AUTO,
                ...styles
            }
        }) as unknown as ElementContainer;

    it('should be instantiated', () => {
        const { renderer } = createRenderer();
        expect(renderer).toBeTruthy();
    });

    describe('renderBackgroundImage', () => {
        it('does nothing for an empty background-image list', async () => {
            const { renderer, ctx } = createRenderer();
            await renderer.renderBackgroundImage(container({ backgroundImage: [] }));
            expect(ctx.createPattern).not.toHaveBeenCalled();
            expect(ctx.fill).not.toHaveBeenCalled();
        });

        it('skips image types it cannot render', async () => {
            const { renderer, ctx } = createRenderer();
            await renderer.renderBackgroundImage(container({ backgroundImage: [{ type: 99 }] as never[] }));
            expect(ctx.createPattern).not.toHaveBeenCalled();
            expect(ctx.fill).not.toHaveBeenCalled();
        });
    });

    describe('URL background images', () => {
        it('resizes the image and fills with a pattern', async () => {
            const image = { width: 50, height: 100 } as HTMLImageElement;
            cache.match.mockResolvedValue(image);
            const { renderer, ctx } = createRenderer();
            await renderer.renderBackgroundImage(
                container({
                    backgroundImage: [urlImage('http://localhost/img.png')],
                    backgroundSize: [parseSizeLayer('50% 50%')],
                    backgroundPosition: [parsePositionLayer('10px 20px')],
                    backgroundRepeat: [BACKGROUND_REPEAT.NO_REPEAT]
                })
            );

            expect(cache.match).toHaveBeenCalledWith('http://localhost/img.png');
            // pattern created from a resized canvas of the computed size
            expect(ctx.createPattern).toHaveBeenCalledTimes(1);
            const [patternSource, repeatMode] = ctx.createPattern.mock.calls[0];
            expect(patternSource.width).toBe(50);
            expect(patternSource.height).toBe(25);
            expect(repeatMode).toBe('no-repeat');

            // the image was drawn into the resize canvas
            const resizeCtx = createdContexts[0];
            expect(resizeCtx.drawImage).toHaveBeenCalledWith(image, 0, 0, 50, 100, 0, 0, 50, 25);

            // the pattern was used to fill the translated tile path
            expect(ctx.fillStyle).toBe(ctx.createPattern.mock.results[0].value);
            expect(ctx.translate).toHaveBeenCalledWith(10, 20);
            expect(ctx.translate).toHaveBeenCalledWith(-10, -20);
            expect(ctx.fill).toHaveBeenCalledTimes(1);
        });

        it.each([
            [BACKGROUND_REPEAT.NO_REPEAT, 'no-repeat'],
            [BACKGROUND_REPEAT.REPEAT, 'repeat'],
            [BACKGROUND_REPEAT.REPEAT_X, 'repeat-x'],
            [BACKGROUND_REPEAT.REPEAT_Y, 'repeat-y']
        ])('maps background-repeat %s to canvas pattern mode %s', async (repeat, expected) => {
            cache.match.mockResolvedValue({ width: 10, height: 10 } as HTMLImageElement);
            const { renderer, ctx } = createRenderer();
            await renderer.renderBackgroundImage(
                container({ backgroundImage: [urlImage('http://localhost/img.png')], backgroundRepeat: [repeat] })
            );
            expect(ctx.createPattern).toHaveBeenCalledTimes(1);
            expect(ctx.createPattern.mock.calls[0][1]).toBe(expected);
        });

        it('treats NaN/zero intrinsic dimensions as one pixel', async () => {
            cache.match.mockResolvedValue({ width: NaN, height: 0 } as HTMLImageElement);
            const { renderer, ctx } = createRenderer();
            await renderer.renderBackgroundImage(
                container({ backgroundImage: [urlImage('http://localhost/img.png')] })
            );
            // auto size with 1x1 intrinsic dimensions renders at 1x1
            expect(ctx.createPattern).toHaveBeenCalledTimes(1);
            expect(ctx.createPattern.mock.calls[0][0].width).toBe(1);
            expect(ctx.createPattern.mock.calls[0][0].height).toBe(1);
        });

        it('reuses the cached pattern for identical rendering parameters', async () => {
            cache.match.mockResolvedValue({ width: 50, height: 100 } as HTMLImageElement);
            const { renderer, ctx } = createRenderer();
            const styles = {
                backgroundImage: [urlImage('http://localhost/img.png')],
                backgroundSize: [parseSizeLayer('50% 50%')]
            };
            await renderer.renderBackgroundImage(container(styles));
            await renderer.renderBackgroundImage(container(styles));
            expect(ctx.createPattern).toHaveBeenCalledTimes(1);
            expect(ctx.fill).toHaveBeenCalledTimes(2);
        });

        it('creates a new pattern when image-rendering changes', async () => {
            cache.match.mockResolvedValue({ width: 50, height: 100 } as HTMLImageElement);
            const { renderer, ctx } = createRenderer();
            await renderer.renderBackgroundImage(
                container({ backgroundImage: [urlImage('http://localhost/img.png')] })
            );
            await renderer.renderBackgroundImage(
                container({
                    backgroundImage: [urlImage('http://localhost/img.png')],
                    imageRendering: IMAGE_RENDERING.PIXELATED
                })
            );
            expect(ctx.createPattern).toHaveBeenCalledTimes(2);
        });

        it('disables image smoothing for pixelated and crisp-edges rendering', async () => {
            cache.match.mockResolvedValue({ width: 50, height: 100 } as HTMLImageElement);
            const { renderer } = createRenderer();
            await renderer.renderBackgroundImage(
                container({
                    backgroundImage: [urlImage('http://localhost/img.png')],
                    imageRendering: IMAGE_RENDERING.PIXELATED
                })
            );
            expect(createdContexts[0].imageSmoothingEnabled).toBe(false);
            expect(loggerError).not.toHaveBeenCalled();
            expect(loggerDebug).toHaveBeenCalledWith(
                'Disabling image smoothing for background image due to CSS image-rendering'
            );

            await renderer.renderBackgroundImage(
                container({
                    backgroundImage: [urlImage('http://localhost/img.png')],
                    backgroundSize: [parseSizeLayer('51% 51%')],
                    imageRendering: IMAGE_RENDERING.CRISP_EDGES
                })
            );
            expect(createdContexts[1].imageSmoothingEnabled).toBe(false);
        });

        it('enables image smoothing for smooth rendering and inherits quality', async () => {
            cache.match.mockResolvedValue({ width: 50, height: 100 } as HTMLImageElement);
            const { renderer } = createRenderer();
            await renderer.renderBackgroundImage(
                container({
                    backgroundImage: [urlImage('http://localhost/img.png')],
                    imageRendering: IMAGE_RENDERING.SMOOTH
                })
            );
            expect(createdContexts[0].imageSmoothingEnabled).toBe(true);
            expect(createdContexts[0].imageSmoothingQuality).toBe('low');
        });

        it('inherits smoothing from the renderer context for auto rendering', async () => {
            cache.match.mockResolvedValue({ width: 50, height: 100 } as HTMLImageElement);
            const ctx = createMockContext();
            ctx.imageSmoothingEnabled = false;
            const { renderer } = createRenderer(ctx);
            await renderer.renderBackgroundImage(
                container({ backgroundImage: [urlImage('http://localhost/img.png')] })
            );
            expect(createdContexts[0].imageSmoothingEnabled).toBe(false);
        });

        it('logs an error and skips rendering when the image fails to load', async () => {
            cache.match.mockRejectedValue(new Error('network down'));
            const { renderer, ctx } = createRenderer();
            await renderer.renderBackgroundImage(
                container({ backgroundImage: [urlImage('http://localhost/missing.png')] })
            );
            expect(loggerError).toHaveBeenCalledWith('Error loading background-image http://localhost/missing.png');
            expect(onError).toHaveBeenCalledTimes(1);
            expect((onError.mock.calls[0][0] as Error).message).toBe('network down');
            expect(ctx.createPattern).not.toHaveBeenCalled();
            expect(ctx.fill).not.toHaveBeenCalled();
        });

        it('does nothing when the cache has no image for the url', async () => {
            cache.match.mockResolvedValue(undefined);
            const { renderer, ctx } = createRenderer();
            await renderer.renderBackgroundImage(
                container({ backgroundImage: [urlImage('http://localhost/missing.png')] })
            );
            expect(loggerError).not.toHaveBeenCalled();
            expect(onError).not.toHaveBeenCalled();
            expect(ctx.createPattern).not.toHaveBeenCalled();
            expect(ctx.fill).not.toHaveBeenCalled();
        });
    });

    describe('linear gradients', () => {
        it('paints a linear gradient pattern over the background area', async () => {
            const { renderer, ctx } = createRenderer();
            const gradient = linearGradientImage('red', 'blue');
            await renderer.renderBackgroundImage(container({ backgroundImage: [gradient] }));

            const offCtx = createdContexts[0];
            expect(offCtx.createLinearGradient).toHaveBeenCalledTimes(1);
            const offscreenGradient = (offCtx.createLinearGradient as ReturnType<typeof vi.fn>).mock.results[0].value;
            expect(offscreenGradient.addColorStop).toHaveBeenCalledWith(0, 'rgb(255,0,0)');
            expect(offscreenGradient.addColorStop).toHaveBeenCalledWith(1, 'rgb(0,0,255)');
            expect(offCtx.fillRect).toHaveBeenCalledWith(0, 0, 100, 50);

            expect(ctx.createPattern).toHaveBeenCalledTimes(1);
            const [patternSource, repeatMode] = ctx.createPattern.mock.calls[0];
            expect(patternSource.width).toBe(100);
            expect(patternSource.height).toBe(50);
            expect(repeatMode).toBe('repeat');
            expect(ctx.fill).toHaveBeenCalledTimes(1);
        });

        it('reuses the cached gradient pattern for identical layers', async () => {
            const { renderer, ctx } = createRenderer();
            const gradient = linearGradientImage('red', 'blue');
            await renderer.renderBackgroundImage(container({ backgroundImage: [gradient] }));
            await renderer.renderBackgroundImage(container({ backgroundImage: [gradient] }));
            expect(ctx.createPattern).toHaveBeenCalledTimes(1);
            expect(ctx.fill).toHaveBeenCalledTimes(2);
        });

        it('creates a different pattern when the gradient dimensions change', async () => {
            const { renderer, ctx } = createRenderer();
            const gradient = linearGradientImage('red', 'blue');
            await renderer.renderBackgroundImage(container({ backgroundImage: [gradient] }));
            await renderer.renderBackgroundImage(
                container({ backgroundImage: [gradient], backgroundSize: [parseSizeLayer('50% 50%')] })
            );
            expect(ctx.createPattern).toHaveBeenCalledTimes(2);
        });

        it('clamps zero-sized areas to one pixel and still paints', async () => {
            const { renderer, ctx } = createRenderer();
            const gradient = linearGradientImage('red', 'blue');
            const element = container({ backgroundImage: [gradient] });
            (element as { bounds: Bounds }).bounds = new Bounds(0, 0, 0, 0);
            await renderer.renderBackgroundImage(element);
            expect(ctx.createPattern).toHaveBeenCalledTimes(1);
            const [patternSource] = ctx.createPattern.mock.calls[0];
            expect(patternSource.width).toBe(1);
            expect(patternSource.height).toBe(1);
            expect(ctx.fill).toHaveBeenCalledTimes(1);
        });
    });

    describe('repeating linear gradients', () => {
        it('renders one cycle as a repeating pattern', async () => {
            const { renderer, ctx } = createRenderer();
            // angle 0 -> line length is the element height (50); stops at 0px and 25px
            const gradient = repeatingGradientImage(0, 25);
            await renderer.renderBackgroundImage(container({ backgroundImage: [gradient] }));

            const offCtx = createdContexts[0];
            const repeatingGradient = (offCtx.createLinearGradient as ReturnType<typeof vi.fn>).mock.results[0].value;
            expect(repeatingGradient.addColorStop).toHaveBeenCalledWith(0, 'rgb(255,0,0)');
            expect(repeatingGradient.addColorStop).toHaveBeenCalledWith(1, 'rgb(0,0,255)');

            expect(ctx.createPattern).toHaveBeenCalledTimes(1);
            const [patternSource, repeatMode] = ctx.createPattern.mock.calls[0];
            expect(patternSource.width).toBe(25);
            expect(patternSource.height).toBe(25);
            expect(repeatMode).toBe('repeat');
            expect(ctx.fill).toHaveBeenCalledTimes(1);
        });

        it('falls back to a plain linear gradient when the stop span is empty', async () => {
            const { renderer, ctx } = createRenderer();
            // the second stop is clamped up to the first, so the repeating span is zero
            const gradient = repeatingGradientImage(20, 5);
            await renderer.renderBackgroundImage(container({ backgroundImage: [gradient] }));

            // fallback paints the full area (100x50) instead of a 20x20 cycle
            expect(ctx.createPattern).toHaveBeenCalledTimes(1);
            const [patternSource] = ctx.createPattern.mock.calls[0];
            expect(patternSource.width).toBe(100);
            expect(patternSource.height).toBe(50);
            expect(ctx.fill).toHaveBeenCalledTimes(1);
        });
    });

    describe('radial gradients', () => {
        it('paints an ellipse pattern clipped to the background area', async () => {
            const { renderer, ctx } = createRenderer();
            const fillStyles: unknown[] = [];
            vi.spyOn(ctx, 'fillStyle', 'set').mockImplementation((value) => {
                fillStyles.push(value);
            });
            await renderer.renderBackgroundImage(container({ backgroundImage: [radialGradientImage()] }));

            const offCtx = createdContexts[0];
            // center at 50%/50% of 100x50; the farthest-corner ellipse passes through the
            // corner while keeping the farthest-side aspect ratio (ry = rx / 2)
            const rx = Math.sqrt(5000);
            const ry = rx * 0.5;
            expect(offCtx.createRadialGradient).toHaveBeenCalledWith(rx, rx, 0, rx, rx, rx);
            expect(offCtx.scale).toHaveBeenCalledWith(1, 0.5);
            expect(offCtx.fillRect).toHaveBeenCalledWith(0, 0, rx * 2, rx * 2);

            expect(ctx.createPattern).toHaveBeenCalledTimes(1);
            const [patternSource, repeatMode] = ctx.createPattern.mock.calls[0];
            expect(patternSource.width).toBe(Math.ceil(rx * 2));
            expect(patternSource.height).toBe(Math.ceil(ry * 2));
            expect(repeatMode).toBe('no-repeat');

            // outside the ending shape is painted with the last stop colour, then the
            // ellipse pattern is laid on top
            expect(fillStyles).toContain('rgb(0,0,255)');
            expect(ctx.clip).toHaveBeenCalledTimes(1);
            expect(ctx.save).toHaveBeenCalledTimes(1);
            expect(ctx.restore).toHaveBeenCalledTimes(1);
            expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, rx * 2, ry * 2);
        });

        it('clamps a zero radius gradient to a minimum size without scaling', async () => {
            const { renderer, ctx } = createRenderer();
            await renderer.renderBackgroundImage(
                container({
                    backgroundImage: [
                        radialGradientImage({
                            shape: CSSRadialShape.CIRCLE,
                            size: CSSRadialExtent.CLOSEST_SIDE,
                            // center at the bottom edge -> zero closest-side radius
                            position: [parsePositionLayer('50px 50px')[0], parsePositionLayer('50px 50px')[1]]
                        })
                    ]
                })
            );

            const offCtx = createdContexts[0];
            expect(offCtx.createRadialGradient).toHaveBeenCalledWith(0.01, 0.01, 0, 0.01, 0.01, 0.01);
            expect(offCtx.scale).not.toHaveBeenCalled();
            expect(offCtx.fillRect).toHaveBeenCalledWith(0, 0, 0.02, 0.02);
            expect(ctx.clip).toHaveBeenCalledTimes(1);
            expect(ctx.fill).toHaveBeenCalledTimes(1);
        });
    });

    describe('background blend modes', () => {
        const twoLayers = {
            backgroundImage: [linearGradientImage('red', 'blue'), linearGradientImage('green', 'yellow')]
        };

        it('applies the layer blend mode around non-first layers', async () => {
            const { renderer, ctx } = createRenderer();
            await renderer.renderBackgroundImage(
                container({ ...twoLayers, backgroundBlendMode: ['normal', 'multiply'] })
            );

            // layers render back-to-front: the second iteration is a non-first layer
            expect(ctx.save).toHaveBeenCalledTimes(1);
            expect(ctx.restore).toHaveBeenCalledTimes(1);
            expect(ctx.globalCompositeOperation).toBe('multiply');
            expect(ctx.createPattern).toHaveBeenCalledTimes(2);
        });

        it('falls back to the first blend mode when the layer has none', async () => {
            const { renderer, ctx } = createRenderer();
            await renderer.renderBackgroundImage(container({ ...twoLayers, backgroundBlendMode: ['multiply'] }));
            expect(ctx.save).toHaveBeenCalledTimes(1);
            expect(ctx.globalCompositeOperation).toBe('multiply');
        });

        it('does not save the context for normal blending', async () => {
            const { renderer, ctx } = createRenderer();
            await renderer.renderBackgroundImage(container({ ...twoLayers, backgroundBlendMode: [] }));
            expect(ctx.save).not.toHaveBeenCalled();
            expect(ctx.restore).not.toHaveBeenCalled();
            expect(ctx.createPattern).toHaveBeenCalledTimes(2);
        });
    });
});
