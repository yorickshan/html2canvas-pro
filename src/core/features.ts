/**
 * Runtime feature detection.
 *
 * Only checks that still gate real behaviour are kept: range-bounds
 * measurement (iOS 13 quirk), SVG drawing and CORS image support.
 * Dead probes (IE-era CORS XHR / XHR response-type checks) were removed —
 * every supported browser exposes `crossOrigin`, `responseType` and
 * `withCredentials`; Intl.Segmenter is used unconditionally.
 */

const testRangeBounds = (document: Document) => {
    const TEST_HEIGHT = 123;

    if (document.createRange) {
        const range = document.createRange();
        if (range.getBoundingClientRect) {
            const testElement = document.createElement('boundtest');
            testElement.style.height = `${TEST_HEIGHT}px`;
            testElement.style.display = 'block';
            document.body.appendChild(testElement);

            range.selectNode(testElement);
            const rangeBounds = range.getBoundingClientRect();
            const rangeHeight = Math.round(rangeBounds.height);
            document.body.removeChild(testElement);
            if (rangeHeight === TEST_HEIGHT) {
                return true;
            }
        }
    }

    return false;
};

const testCORS = (): boolean => typeof new Image().crossOrigin !== 'undefined';

const testSVG = (document: Document): boolean => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return false;
    }

    img.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>`;

    try {
        ctx.drawImage(img, 0, 0);
        canvas.toDataURL();
    } catch (e) {
        return false;
    }
    return true;
};

export const createForeignObjectSVG = (
    width: number,
    height: number,
    x: number,
    y: number,
    node: Node
): SVGForeignObjectElement => {
    const xmlns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(xmlns, 'svg');
    const foreignObject = document.createElementNS(xmlns, 'foreignObject');
    svg.setAttributeNS(null, 'width', width.toString());
    svg.setAttributeNS(null, 'height', height.toString());

    foreignObject.setAttributeNS(null, 'width', '100%');
    foreignObject.setAttributeNS(null, 'height', '100%');
    foreignObject.setAttributeNS(null, 'x', x.toString());
    foreignObject.setAttributeNS(null, 'y', y.toString());
    foreignObject.setAttributeNS(null, 'externalResourcesRequired', 'true');
    svg.appendChild(foreignObject);

    foreignObject.appendChild(node);

    return svg;
};

export const loadSerializedSVG = (svg: Node): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;

        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
    });
};

export const FEATURES = {
    get SUPPORT_RANGE_BOUNDS(): boolean {
        'use strict';
        const value = testRangeBounds(document);
        Object.defineProperty(FEATURES, 'SUPPORT_RANGE_BOUNDS', { value });
        return value;
    },
    get SUPPORT_SVG_DRAWING(): boolean {
        'use strict';
        const value = testSVG(document);
        Object.defineProperty(FEATURES, 'SUPPORT_SVG_DRAWING', { value });
        return value;
    },
    get SUPPORT_CORS_IMAGES(): boolean {
        'use strict';
        const value = testCORS();
        Object.defineProperty(FEATURES, 'SUPPORT_CORS_IMAGES', { value });
        return value;
    }
};
