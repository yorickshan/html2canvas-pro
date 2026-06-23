import { OBJECT_FIT, ObjectFit } from '../css/property-descriptors/object-fit';
import { LengthPercentage, getAbsoluteValue } from '../css/types/length-percentage';

export interface ObjectFitBox {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface ObjectFitRendering {
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    dx: number;
    dy: number;
    dw: number;
    dh: number;
}

export const calculateObjectFitRendering = (
    intrinsicWidth: number,
    intrinsicHeight: number,
    box: ObjectFitBox,
    objectFit: ObjectFit,
    objectPosition?: [LengthPercentage, LengthPercentage]
): ObjectFitRendering => {
    let sx = 0;
    let sy = 0;
    let sw = intrinsicWidth;
    let sh = intrinsicHeight;
    let dx = box.left;
    let dy = box.top;
    let dw = box.width;
    let dh = box.height;

    const boxRatio = dw / dh;
    const imgRatio = sw / sh;

    // Resolve object-position offsets (default: 50% 50% = center)
    const posX = objectPosition ? getAbsoluteValue(objectPosition[0], 1) : 0.5;
    const posY = objectPosition ? getAbsoluteValue(objectPosition[1], 1) : 0.5;

    if (objectFit === OBJECT_FIT.CONTAIN) {
        if (imgRatio > boxRatio) {
            dh = dw / imgRatio;
            dy += (box.height - dh) * posY;
        } else {
            dw = dh * imgRatio;
            dx += (box.width - dw) * posX;
        }
    } else if (objectFit === OBJECT_FIT.COVER) {
        if (imgRatio > boxRatio) {
            sw = sh * boxRatio;
            sx += (intrinsicWidth - sw) * posX;
        } else {
            sh = sw / boxRatio;
            sy += (intrinsicHeight - sh) * posY;
        }
    } else if (objectFit === OBJECT_FIT.NONE) {
        if (sw > dw) {
            sx += (sw - dw) * posX;
            sw = dw;
        } else {
            dx += (dw - sw) * posX;
            dw = sw;
        }
        if (sh > dh) {
            sy += (sh - dh) * posY;
            sh = dh;
        } else {
            dy += (dh - sh) * posY;
            dh = sh;
        }
    } else if (objectFit === OBJECT_FIT.SCALE_DOWN) {
        const containW = imgRatio > boxRatio ? dw : dh * imgRatio;
        const noneW = sw > dw ? sw : dw;
        if (containW < noneW) {
            if (imgRatio > boxRatio) {
                dh = dw / imgRatio;
                dy += (box.height - dh) * posY;
            } else {
                dw = dh * imgRatio;
                dx += (box.width - dw) * posX;
            }
        } else {
            if (sw > dw) {
                sx += (sw - dw) * posX;
                sw = dw;
            } else {
                dx += (dw - sw) * posX;
                dw = sw;
            }
            if (sh > dh) {
                sy += (sh - dh) * posY;
                sh = dh;
            } else {
                dy += (dh - sh) * posY;
                dh = sh;
            }
        }
    }

    return { sx, sy, sw, sh, dx, dy, dw, dh };
};
