import { deepStrictEqual } from 'assert';
import { OBJECT_FIT } from '../../css/property-descriptors/object-fit';
import { calculateObjectFitRendering } from '../object-fit';

describe('calculateObjectFitRendering', () => {
    const box = { left: 10, top: 20, width: 100, height: 50 };

    it('should preserve fill rendering by default', () => {
        deepStrictEqual(calculateObjectFitRendering(200, 100, box, OBJECT_FIT.FILL), {
            sx: 0,
            sy: 0,
            sw: 200,
            sh: 100,
            dx: 10,
            dy: 20,
            dw: 100,
            dh: 50
        });
    });

    it('should calculate contain destination rectangle', () => {
        deepStrictEqual(calculateObjectFitRendering(100, 100, box, OBJECT_FIT.CONTAIN), {
            sx: 0,
            sy: 0,
            sw: 100,
            sh: 100,
            dx: 35,
            dy: 20,
            dw: 50,
            dh: 50
        });
    });

    it('should calculate cover source rectangle', () => {
        deepStrictEqual(calculateObjectFitRendering(100, 100, box, OBJECT_FIT.COVER), {
            sx: 0,
            sy: 25,
            sw: 100,
            sh: 50,
            dx: 10,
            dy: 20,
            dw: 100,
            dh: 50
        });
    });

    it('should calculate none with centered clipping', () => {
        deepStrictEqual(calculateObjectFitRendering(200, 100, box, OBJECT_FIT.NONE), {
            sx: 50,
            sy: 25,
            sw: 100,
            sh: 50,
            dx: 10,
            dy: 20,
            dw: 100,
            dh: 50
        });
    });

    it('should scale down using contain logic when image is larger than box', () => {
        deepStrictEqual(calculateObjectFitRendering(200, 50, box, OBJECT_FIT.SCALE_DOWN), {
            sx: 0,
            sy: 0,
            sw: 200,
            sh: 50,
            dx: 10,
            dy: 32.5,
            dw: 100,
            dh: 25
        });
    });

    it('should scale down using none logic when image is smaller than box', () => {
        deepStrictEqual(calculateObjectFitRendering(60, 30, box, OBJECT_FIT.SCALE_DOWN), {
            sx: 0,
            sy: 0,
            sw: 60,
            sh: 30,
            dx: 30,
            dy: 30,
            dw: 60,
            dh: 30
        });
    });
});
