import { describe, it, expect, vi, afterEach } from 'vitest';
import { FEATURES, createForeignObjectSVG, loadSerializedSVG } from '../features';

describe('FEATURES', () => {
    it('has boolean SUPPORT_RANGE_BOUNDS', () => {
        expect(typeof FEATURES.SUPPORT_RANGE_BOUNDS).toBe('boolean');
    });

    it('has boolean SUPPORT_WORD_BREAKING', () => {
        expect(typeof FEATURES.SUPPORT_WORD_BREAKING).toBe('boolean');
    });

    it('has boolean SUPPORT_SVG_DRAWING', () => {
        expect(typeof FEATURES.SUPPORT_SVG_DRAWING).toBe('boolean');
    });

    it('has boolean SUPPORT_CORS_IMAGES', () => {
        expect(typeof FEATURES.SUPPORT_CORS_IMAGES).toBe('boolean');
    });

    it('has boolean SUPPORT_RESPONSE_TYPE', () => {
        expect(typeof FEATURES.SUPPORT_RESPONSE_TYPE).toBe('boolean');
    });

    it('has boolean SUPPORT_CORS_XHR', () => {
        expect(typeof FEATURES.SUPPORT_CORS_XHR).toBe('boolean');
    });

    it('has boolean or Promise SUPPORT_FOREIGNOBJECT_DRAWING', async () => {
        const val = FEATURES.SUPPORT_FOREIGNOBJECT_DRAWING;
        expect(typeof val === 'boolean' || val instanceof Promise).toBe(true);
        // In jsdom, the promise may reject due to missing canvas support; suppress unhandled rejection
        if (val instanceof Promise) {
            val.catch(() => {
                // Suppress expected error in jsdom environment
            });
            await val.catch(() => {});
        }
    });

    it('has boolean SUPPORT_NATIVE_TEXT_SEGMENTATION', () => {
        expect(typeof FEATURES.SUPPORT_NATIVE_TEXT_SEGMENTATION).toBe('boolean');
    });
});

describe('createForeignObjectSVG', () => {
    it('returns an SVG element with a foreignObject child', () => {
        const div = document.createElement('div');
        const result = createForeignObjectSVG(100, 50, 0, 0, div);
        expect(result).toBeDefined();
        // Despite the return type annotation, the function returns the SVG root element
        expect(result.tagName).toBe('svg');
        expect(result.namespaceURI).toBe('http://www.w3.org/2000/svg');
        expect(result.childNodes.length).toBeGreaterThan(0);
        expect(result.childNodes[0]?.nodeName).toBe('foreignObject');
    });
});

describe('loadSerializedSVG', () => {
    it('returns a Promise', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const result = loadSerializedSVG(svg);
        expect(result).toBeInstanceOf(Promise);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Detection path coverage
//
// Each FEATURES getter memoizes itself with Object.defineProperty on first
// access, so the descriptors below are captured at module load (before any
// test runs) to allow re-running each detection under different mocks.
// ─────────────────────────────────────────────────────────────────────────────

const FEATURE_KEYS = [
    'SUPPORT_RANGE_BOUNDS',
    'SUPPORT_WORD_BREAKING',
    'SUPPORT_SVG_DRAWING',
    'SUPPORT_FOREIGNOBJECT_DRAWING',
    'SUPPORT_CORS_IMAGES',
    'SUPPORT_RESPONSE_TYPE',
    'SUPPORT_CORS_XHR',
    'SUPPORT_NATIVE_TEXT_SEGMENTATION'
] as const;

type FeatureKey = (typeof FEATURE_KEYS)[number];

const originalDescriptors = FEATURE_KEYS.reduce(
    (acc, key) => {
        acc[key] = Object.getOwnPropertyDescriptor(FEATURES, key) as PropertyDescriptor;
        return acc;
    },
    {} as Record<FeatureKey, PropertyDescriptor>
);

/** Re-install the original getter so the next access re-runs the detection. */
const restoreFeature = (key: FeatureKey): void => {
    Object.defineProperty(FEATURES, key, originalDescriptors[key]);
};

const setFeatureValue = (key: FeatureKey, value: unknown): void => {
    Object.defineProperty(FEATURES, key, { value, configurable: true, writable: true });
};

describe('FEATURES detection paths', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('SUPPORT_RANGE_BOUNDS', () => {
        const detect = (): boolean => {
            restoreFeature('SUPPORT_RANGE_BOUNDS');
            return FEATURES.SUPPORT_RANGE_BOUNDS;
        };

        it('returns false when document.createRange is unavailable', () => {
            const own = Object.getOwnPropertyDescriptor(document, 'createRange');
            const proto = Object.getOwnPropertyDescriptor(Document.prototype as any, 'createRange');
            Object.defineProperty(document, 'createRange', { value: undefined, configurable: true });
            try {
                expect(detect()).toBe(false);
            } finally {
                if (own) {
                    Object.defineProperty(document, 'createRange', own);
                } else {
                    delete (document as any).createRange;
                }
                expect(proto).not.toBeUndefined();
            }
        });

        it('returns false when the range lacks getBoundingClientRect', () => {
            const spy = vi.spyOn(document, 'createRange').mockReturnValue({} as Range);
            try {
                expect(detect()).toBe(false);
            } finally {
                spy.mockRestore();
            }
        });

        it('returns false when the measured range height differs from the test element', () => {
            const spy = vi.spyOn(document, 'createRange').mockReturnValue({
                selectNode: () => undefined,
                getBoundingClientRect: () => ({ height: 456 })
            } as unknown as Range);
            try {
                expect(detect()).toBe(false);
            } finally {
                spy.mockRestore();
            }
        });

        it('returns true when the measured range height matches', () => {
            const spy = vi.spyOn(document, 'createRange').mockReturnValue({
                selectNode: () => undefined,
                getBoundingClientRect: () => ({ height: 123 })
            } as unknown as Range);
            try {
                expect(detect()).toBe(true);
            } finally {
                spy.mockRestore();
            }
        });
    });

    describe('SUPPORT_WORD_BREAKING', () => {
        const detect = (): boolean => {
            restoreFeature('SUPPORT_WORD_BREAKING');
            return FEATURES.SUPPORT_WORD_BREAKING;
        };

        /** Replace the boundtest element's first child and the Range used for measuring. */
        const stubLineMeasurement = (rectFor: (offset: number) => { x: number; y: number }) => {
            const realCreateElement = document.createElement.bind(document);
            const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((name: string) => {
                const el = realCreateElement(name);
                if (name === 'boundtest') {
                    const textNode = { data: 'aaaaaaaaaa' } as unknown as Text;
                    Object.defineProperty(el, 'firstChild', {
                        value: textNode,
                        configurable: true
                    });
                }
                return el;
            });
            let currentOffset = 0;
            const rangeSpy = vi.spyOn(document, 'createRange').mockReturnValue({
                setStart: (_node: Node, offset: number) => {
                    currentOffset = offset;
                },
                setEnd: () => undefined,
                getBoundingClientRect: () => rectFor(currentOffset)
            } as unknown as Range);
            return { createElementSpy, rangeSpy };
        };

        const withMeasurement = async (rectFor: (offset: number) => { x: number; y: number }, run: () => void) => {
            const { createElementSpy, rangeSpy } = stubLineMeasurement(rectFor);
            try {
                run();
            } finally {
                createElementSpy.mockRestore();
                rangeSpy.mockRestore();
            }
        };

        it('short-circuits to false when range bounds are unsupported', () => {
            setFeatureValue('SUPPORT_RANGE_BOUNDS', false);
            expect(detect()).toBe(false);
        });

        it('returns true when rects advance along x (horizontal flow)', async () => {
            setFeatureValue('SUPPORT_RANGE_BOUNDS', true);
            await withMeasurement(
                (offset) => ({ x: offset, y: 0 }),
                () => {
                    expect(detect()).toBe(true);
                }
            );
        });

        it('returns true when rects advance along y (line wrapping)', async () => {
            setFeatureValue('SUPPORT_RANGE_BOUNDS', true);
            await withMeasurement(
                (offset) => ({ x: 0, y: offset }),
                () => {
                    expect(detect()).toBe(true);
                }
            );
        });

        it('returns false when rects never advance', async () => {
            setFeatureValue('SUPPORT_RANGE_BOUNDS', true);
            await withMeasurement(
                () => ({ x: 0, y: 0 }),
                () => {
                    expect(detect()).toBe(false);
                }
            );
        });

        it('uses empty content when String.prototype.repeat is unavailable', async () => {
            setFeatureValue('SUPPORT_RANGE_BOUNDS', true);
            const repeat = String.prototype.repeat;
            delete (String.prototype as any).repeat;
            try {
                await withMeasurement(
                    (offset) => ({ x: offset, y: 0 }),
                    () => {
                        expect(detect()).toBe(true);
                    }
                );
            } finally {
                String.prototype.repeat = repeat;
            }
        });
    });

    describe('SUPPORT_SVG_DRAWING', () => {
        const detect = (): boolean => {
            restoreFeature('SUPPORT_SVG_DRAWING');
            return FEATURES.SUPPORT_SVG_DRAWING;
        };

        it('returns false when no 2D context is available (jsdom default)', () => {
            expect(detect()).toBe(false);
        });

        it('returns true when drawImage and toDataURL succeed', () => {
            const drawImage = vi.fn();
            const realCreateElement = document.createElement.bind(document);
            const spy = vi.spyOn(document, 'createElement').mockImplementation((name: string) => {
                if (name === 'canvas') {
                    return {
                        width: 0,
                        height: 0,
                        style: {},
                        getContext: () => ({ drawImage }),
                        toDataURL: () => 'data:image/png;base64,AAAA'
                    } as unknown as HTMLCanvasElement;
                }
                return realCreateElement(name);
            });
            try {
                expect(detect()).toBe(true);
                expect(drawImage).toHaveBeenCalled();
            } finally {
                spy.mockRestore();
            }
        });
    });

    describe('SUPPORT_FOREIGNOBJECT_DRAWING', () => {
        /**
         * Image stand-in that still behaves like a DOM node (required because
         * createForeignObjectSVG appends the image into the foreignObject)
         * but fires onload asynchronously once a src is assigned.
         *
         * jsdom's own Image constructor returns a plain element created via
         * document.createElement('img') and ignores `new.target`, so
         * subclassing cannot intercept `src`; a factory returning a real node
         * with an own src property can.
         */
        const AutoLoadImage = function AutoLoadImage(): HTMLImageElement {
            const img = document.createElement('img');
            let source = '';
            Object.defineProperty(img, 'src', {
                get: () => source,
                set: (value: string) => {
                    source = value;
                    queueMicrotask(() => img.onload?.());
                }
            });
            return img;
        } as unknown as { new (): HTMLImageElement };

        const detect = (): Promise<boolean> => {
            restoreFeature('SUPPORT_FOREIGNOBJECT_DRAWING');
            return FEATURES.SUPPORT_FOREIGNOBJECT_DRAWING;
        };

        /**
         * Mock canvas + Image so testForeignObject runs end to end.
         * `imageDataQueue` feeds successive getImageData(...) pixel reads.
         */
        const stubCanvasAndImages = (imageDataQueue: number[][]) => {
            const realCreateElement = document.createElement.bind(document);
            const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((name: string) => {
                if (name === 'canvas') {
                    return {
                        width: 0,
                        height: 0,
                        style: {},
                        getContext: () => ({
                            fillStyle: '',
                            fillRect: vi.fn(),
                            drawImage: vi.fn(),
                            getImageData: vi.fn(() => ({
                                data: imageDataQueue.length > 0 ? imageDataQueue.shift()! : [0, 0, 0, 0]
                            }))
                        }),
                        toDataURL: () => 'data:image/png;base64,AAAA'
                    } as unknown as HTMLCanvasElement;
                }
                return realCreateElement(name);
            });
            vi.stubGlobal('Image', AutoLoadImage);
            return { createElementSpy };
        };

        const runDetection = async (imageDataQueue: number[][]): Promise<boolean> => {
            const { createElementSpy } = stubCanvasAndImages(imageDataQueue);
            try {
                return await detect();
            } finally {
                createElementSpy.mockRestore();
                vi.unstubAllGlobals();
            }
        };

        it('returns true when foreignObject rendering round-trips green pixels', async () => {
            expect(
                await runDetection([
                    [0, 255, 0, 255],
                    [0, 255, 0, 255]
                ])
            ).toBe(true);
        });

        it('returns false when the first render is not green', async () => {
            expect(await runDetection([[255, 0, 0, 255]])).toBe(false);
        });

        it('returns false when the first render lacks the green channel', async () => {
            expect(await runDetection([[0, 0, 0, 255]])).toBe(false);
        });

        it('returns false when the first render has a wrong blue channel', async () => {
            expect(await runDetection([[0, 255, 1, 255]])).toBe(false);
        });

        it('returns false when the second render is not green (Edge background-image case)', async () => {
            expect(
                await runDetection([
                    [0, 255, 0, 255],
                    [0, 255, 0, 0]
                ])
            ).toBe(false);
        });

        it('returns false without touching the canvas when fetch is unavailable', async () => {
            const originalFetch = (window as any).fetch;
            Object.defineProperty(window, 'fetch', {
                value: undefined,
                configurable: true,
                writable: true
            });
            try {
                expect(await detect()).toBe(false);
            } finally {
                Object.defineProperty(window, 'fetch', {
                    value: originalFetch,
                    configurable: true,
                    writable: true
                });
            }
        });
    });

    describe('CORS and XHR response type detection', () => {
        it('SUPPORT_CORS_IMAGES is true for real Image elements exposing crossOrigin', () => {
            restoreFeature('SUPPORT_CORS_IMAGES');
            expect(FEATURES.SUPPORT_CORS_IMAGES).toBe(true);
        });

        it('SUPPORT_CORS_IMAGES is false when Image lacks crossOrigin', () => {
            class BareImage {}
            vi.stubGlobal('Image', BareImage);
            try {
                restoreFeature('SUPPORT_CORS_IMAGES');
                expect(FEATURES.SUPPORT_CORS_IMAGES).toBe(false);
            } finally {
                vi.unstubAllGlobals();
            }
        });

        it('SUPPORT_RESPONSE_TYPE is true for real XMLHttpRequest', () => {
            restoreFeature('SUPPORT_RESPONSE_TYPE');
            expect(FEATURES.SUPPORT_RESPONSE_TYPE).toBe(true);
        });

        it('SUPPORT_RESPONSE_TYPE is false when responseType is missing', () => {
            class BareXHR {}
            vi.stubGlobal('XMLHttpRequest', BareXHR);
            try {
                restoreFeature('SUPPORT_RESPONSE_TYPE');
                expect(FEATURES.SUPPORT_RESPONSE_TYPE).toBe(false);
            } finally {
                vi.unstubAllGlobals();
            }
        });

        it('SUPPORT_CORS_XHR is true when withCredentials is supported', () => {
            restoreFeature('SUPPORT_CORS_XHR');
            expect(FEATURES.SUPPORT_CORS_XHR).toBe(true);
        });
    });

    describe('SUPPORT_NATIVE_TEXT_SEGMENTATION', () => {
        it('is true when Intl.Segmenter exists', () => {
            restoreFeature('SUPPORT_NATIVE_TEXT_SEGMENTATION');
            expect(FEATURES.SUPPORT_NATIVE_TEXT_SEGMENTATION).toBe(true);
        });

        it('is false when Intl.Segmenter is missing', () => {
            const segmenter = (Intl as any).Segmenter;
            delete (Intl as any).Segmenter;
            try {
                restoreFeature('SUPPORT_NATIVE_TEXT_SEGMENTATION');
                expect(FEATURES.SUPPORT_NATIVE_TEXT_SEGMENTATION).toBe(false);
            } finally {
                (Intl as any).Segmenter = segmenter;
            }
        });
    });
});
