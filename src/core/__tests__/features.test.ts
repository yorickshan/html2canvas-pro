import { describe, it, expect, vi, afterEach } from 'vitest';
import { FEATURES, createForeignObjectSVG, loadSerializedSVG } from '../features';

describe('FEATURES', () => {
    it('has boolean SUPPORT_RANGE_BOUNDS', () => {
        expect(typeof FEATURES.SUPPORT_RANGE_BOUNDS).toBe('boolean');
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
    'SUPPORT_SVG_DRAWING',
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

describe('SUPPORT_SVG_DRAWING failure path', () => {
    it('returns false when drawImage throws (tainted canvas)', () => {
        const realCreateElement = document.createElement.bind(document);
        const spy = vi.spyOn(document, 'createElement').mockImplementation((name: string) => {
            if (name === 'canvas') {
                return {
                    width: 0,
                    height: 0,
                    style: {},
                    getContext: () => ({
                        drawImage: () => {
                            throw new DOMException('tainted', 'SecurityError');
                        }
                    }),
                    toDataURL: () => 'data:image/png;base64,AAAA'
                } as unknown as HTMLCanvasElement;
            }
            return realCreateElement(name);
        });
        try {
            restoreFeature('SUPPORT_SVG_DRAWING');
            expect(FEATURES.SUPPORT_SVG_DRAWING).toBe(false);
        } finally {
            spy.mockRestore();
        }
    });
});
