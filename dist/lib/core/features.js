"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURES = exports.loadSerializedSVG = exports.createForeignObjectSVG = void 0;
var css_line_break_1 = require("css-line-break");
var testRangeBounds = function (document) {
    var TEST_HEIGHT = 123;
    if (document.createRange) {
        var range = document.createRange();
        if (range.getBoundingClientRect) {
            var testElement = document.createElement('boundtest');
            testElement.style.height = "".concat(TEST_HEIGHT, "px");
            testElement.style.display = 'block';
            document.body.appendChild(testElement);
            range.selectNode(testElement);
            var rangeBounds = range.getBoundingClientRect();
            var rangeHeight = Math.round(rangeBounds.height);
            document.body.removeChild(testElement);
            if (rangeHeight === TEST_HEIGHT) {
                return true;
            }
        }
    }
    return false;
};
var testIOSLineBreak = function (document) {
    var testElement = document.createElement('boundtest');
    testElement.style.width = '50px';
    testElement.style.display = 'block';
    testElement.style.fontSize = '12px';
    testElement.style.letterSpacing = '0px';
    testElement.style.wordSpacing = '0px';
    document.body.appendChild(testElement);
    var range = document.createRange();
    testElement.innerHTML = typeof ''.repeat === 'function' ? '&#128104;'.repeat(10) : '';
    var node = testElement.firstChild;
    var textList = (0, css_line_break_1.toCodePoints)(node.data).map(function (i) { return (0, css_line_break_1.fromCodePoint)(i); });
    var offset = 0;
    var prev = {};
    // ios 13 does not handle range getBoundingClientRect line changes correctly #2177
    var supports = textList.every(function (text, i) {
        range.setStart(node, offset);
        range.setEnd(node, offset + text.length);
        var rect = range.getBoundingClientRect();
        offset += text.length;
        var boundAhead = rect.x > prev.x || rect.y > prev.y;
        prev = rect;
        if (i === 0) {
            return true;
        }
        return boundAhead;
    });
    document.body.removeChild(testElement);
    return supports;
};
var testCORS = function () { return typeof new Image().crossOrigin !== 'undefined'; };
var testResponseType = function () { return typeof new XMLHttpRequest().responseType === 'string'; };
var testSVG = function (document) {
    var img = new Image();
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    if (!ctx) {
        return false;
    }
    img.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>";
    try {
        ctx.drawImage(img, 0, 0);
        canvas.toDataURL();
    }
    catch (e) {
        return false;
    }
    return true;
};
var isGreenPixel = function (data) {
    return data[0] === 0 && data[1] === 255 && data[2] === 0 && data[3] === 255;
};
var testForeignObject = function (document) {
    var canvas = document.createElement('canvas');
    var size = 100;
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    if (!ctx) {
        return Promise.reject(false);
    }
    ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.fillRect(0, 0, size, size);
    var img = new Image();
    var greenImageSrc = canvas.toDataURL();
    img.src = greenImageSrc;
    var svg = (0, exports.createForeignObjectSVG)(size, size, 0, 0, img);
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, size, size);
    return (0, exports.loadSerializedSVG)(svg)
        .then(function (img) {
        ctx.drawImage(img, 0, 0);
        var data = ctx.getImageData(0, 0, size, size).data;
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, size, size);
        var node = document.createElement('div');
        node.style.backgroundImage = "url(".concat(greenImageSrc, ")");
        node.style.height = "".concat(size, "px");
        // Firefox 55 does not render inline <img /> tags
        return isGreenPixel(data)
            ? (0, exports.loadSerializedSVG)((0, exports.createForeignObjectSVG)(size, size, 0, 0, node))
            : Promise.reject(false);
    })
        .then(function (img) {
        ctx.drawImage(img, 0, 0);
        // Edge does not render background-images
        return isGreenPixel(ctx.getImageData(0, 0, size, size).data);
    })
        .catch(function () { return false; });
};
var createForeignObjectSVG = function (width, height, x, y, node) {
    var xmlns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(xmlns, 'svg');
    var foreignObject = document.createElementNS(xmlns, 'foreignObject');
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
exports.createForeignObjectSVG = createForeignObjectSVG;
var loadSerializedSVG = function (svg) {
    return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () { return resolve(img); };
        img.onerror = reject;
        img.src = "data:image/svg+xml;charset=utf-8,".concat(encodeURIComponent(new XMLSerializer().serializeToString(svg)));
    });
};
exports.loadSerializedSVG = loadSerializedSVG;
exports.FEATURES = {
    get SUPPORT_RANGE_BOUNDS() {
        'use strict';
        var value = testRangeBounds(document);
        Object.defineProperty(exports.FEATURES, 'SUPPORT_RANGE_BOUNDS', { value: value });
        return value;
    },
    get SUPPORT_WORD_BREAKING() {
        'use strict';
        var value = exports.FEATURES.SUPPORT_RANGE_BOUNDS && testIOSLineBreak(document);
        Object.defineProperty(exports.FEATURES, 'SUPPORT_WORD_BREAKING', { value: value });
        return value;
    },
    get SUPPORT_SVG_DRAWING() {
        'use strict';
        var value = testSVG(document);
        Object.defineProperty(exports.FEATURES, 'SUPPORT_SVG_DRAWING', { value: value });
        return value;
    },
    get SUPPORT_FOREIGNOBJECT_DRAWING() {
        'use strict';
        var value = typeof Array.from === 'function' && typeof window.fetch === 'function'
            ? testForeignObject(document)
            : Promise.resolve(false);
        Object.defineProperty(exports.FEATURES, 'SUPPORT_FOREIGNOBJECT_DRAWING', { value: value });
        return value;
    },
    get SUPPORT_CORS_IMAGES() {
        'use strict';
        var value = testCORS();
        Object.defineProperty(exports.FEATURES, 'SUPPORT_CORS_IMAGES', { value: value });
        return value;
    },
    get SUPPORT_RESPONSE_TYPE() {
        'use strict';
        var value = testResponseType();
        Object.defineProperty(exports.FEATURES, 'SUPPORT_RESPONSE_TYPE', { value: value });
        return value;
    },
    get SUPPORT_CORS_XHR() {
        'use strict';
        var value = 'withCredentials' in new XMLHttpRequest();
        Object.defineProperty(exports.FEATURES, 'SUPPORT_CORS_XHR', { value: value });
        return value;
    },
    get SUPPORT_NATIVE_TEXT_SEGMENTATION() {
        'use strict';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        var value = !!(typeof Intl !== 'undefined' && Intl.Segmenter);
        Object.defineProperty(exports.FEATURES, 'SUPPORT_NATIVE_TEXT_SEGMENTATION', { value: value });
        return value;
    }
};
//# sourceMappingURL=features.js.map