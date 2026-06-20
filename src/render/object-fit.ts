import { OBJECT_FIT, ObjectFit } from '../css/property-descriptors/object-fit';

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
    objectFit: ObjectFit
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

    if (objectFit === OBJECT_FIT.CONTAIN) {
        if (imgRatio > boxRatio) {
            dh = dw / imgRatio;
            dy += (box.height - dh) / 2;
        } else {
            dw = dh * imgRatio;
            dx += (box.width - dw) / 2;
        }
    } else if (objectFit === OBJECT_FIT.COVER) {
        if (imgRatio > boxRatio) {
            sw = sh * boxRatio;
            sx += (intrinsicWidth - sw) / 2;
        } else {
            sh = sw / boxRatio;
            sy += (intrinsicHeight - sh) / 2;
        }
    } else if (objectFit === OBJECT_FIT.NONE) {
        if (sw > dw) {
            sx += (sw - dw) / 2;
            sw = dw;
        } else {
            dx += (dw - sw) / 2;
            dw = sw;
        }
        if (sh > dh) {
            sy += (sh - dh) / 2;
            sh = dh;
        } else {
            dy += (dh - sh) / 2;
            dh = sh;
        }
    } else if (objectFit === OBJECT_FIT.SCALE_DOWN) {
        const containW = imgRatio > boxRatio ? dw : dh * imgRatio;
        const noneW = sw > dw ? sw : dw;
        if (containW < noneW) {
            if (imgRatio > boxRatio) {
                dh = dw / imgRatio;
                dy += (box.height - dh) / 2;
            } else {
                dw = dh * imgRatio;
                dx += (box.width - dw) / 2;
            }
        } else {
            if (sw > dw) {
                sx += (sw - dw) / 2;
                sw = dw;
            } else {
                dx += (dw - sw) / 2;
                dw = sw;
            }
            if (sh > dh) {
                sy += (sh - dh) / 2;
                sh = dh;
            } else {
                dy += (dh - sh) / 2;
                dh = sh;
            }
        }
    }

    return { sx, sy, sw, sh, dx, dy, dw, dh };
};
