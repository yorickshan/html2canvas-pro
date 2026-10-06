/**
 * Border Image Renderer
 *
 * Renders CSS border-image using 9-slice scaling.
 * The source image is divided into 9 regions (4 corners, 4 edges, 1 center)
 * based on border-image-slice values, then each region is drawn to the
 * corresponding area of the element's border box.
 */

import { BorderImageSlice } from '../../css/property-descriptors/border-image-slice';
import { BORDER_IMAGE_REPEAT, BorderImageRepeat } from '../../css/property-descriptors/border-image-repeat';
import { Bounds } from '../../css/layout/bounds';

export interface BorderImageSides {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

/**
 * Resolve border-image-width to per-side pixel widths. `auto` uses the
 * corresponding border width, numbers multiply it, lengths are absolute and
 * percentages refer to the border image area (width for left/right, height
 * for top/bottom).
 */
export const resolveBorderImageWidths = (
    width: {
        top: { kind: string; value?: number };
        right: { kind: string; value?: number };
        bottom: { kind: string; value?: number };
        left: { kind: string; value?: number };
    } | null,
    borderWidths: [number, number, number, number],
    area: Bounds
): [number, number, number, number] => {
    const sides = width ? [width.top, width.right, width.bottom, width.left] : null;
    return [0, 1, 2, 3].map((i) => {
        const side = sides ? sides[i] : null;
        const borderWidth = borderWidths[i] ?? 0;
        if (!side) return borderWidth;
        if (side.kind === 'auto') return borderWidth;
        if (side.kind === 'number') return borderWidth * (side.value ?? 1);
        if (side.kind === 'length') return side.value ?? 0;
        // percentage: left/right of the area width, top/bottom of its height
        return ((side.value ?? 0) / 100) * (i === 0 || i === 2 ? area.height : area.width);
    }) as [number, number, number, number];
};

/** Resolve border-image-outset to per-side pixel offsets (numbers multiply the border width). */
export const resolveBorderImageOutset = (
    outset: {
        top: { kind: string; value?: number };
        right: { kind: string; value?: number };
        bottom: { kind: string; value?: number };
        left: { kind: string; value?: number };
    } | null,
    borderWidths: [number, number, number, number]
): BorderImageSides => {
    const sides = outset ? [outset.top, outset.right, outset.bottom, outset.left] : null;
    const px = (i: number): number => {
        const side = sides ? sides[i] : null;
        if (!side) return 0;
        if (side.kind === 'number') return (borderWidths[i] ?? 0) * (side.value ?? 0);
        return side.value ?? 0;
    };
    return { top: px(0), right: px(1), bottom: px(2), left: px(3) };
};

export class BorderImageRenderer {
    private readonly ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    renderBorderImage(
        bounds: Bounds,
        image: HTMLImageElement,
        slice: BorderImageSlice,
        repeat: BorderImageRepeat,
        borderTopWidth: number,
        borderRightWidth: number,
        borderBottomWidth: number,
        borderLeftWidth: number,
        outset: BorderImageSides = { top: 0, right: 0, bottom: 0, left: 0 }
    ): void {
        // The border image area starts at the border box and grows outwards
        // by the outset amounts.
        bounds = bounds.add(-outset.left, -outset.top, outset.left + outset.right, outset.top + outset.bottom);
        const imgW = image.naturalWidth || image.width;
        const imgH = image.naturalHeight || image.height;
        if (imgW <= 0 || imgH <= 0) {
            return;
        }

        // Calculate source slice positions in image pixel space
        const sT = Math.min(slice.unit === 'percent' ? (slice.top / 100) * imgH : Math.min(slice.top, imgH), imgH);
        const sR = Math.min(slice.unit === 'percent' ? (slice.right / 100) * imgW : Math.min(slice.right, imgW), imgW);
        const sB = Math.min(
            slice.unit === 'percent' ? (slice.bottom / 100) * imgH : Math.min(slice.bottom, imgH),
            imgH
        );
        const sL = Math.min(slice.unit === 'percent' ? (slice.left / 100) * imgW : Math.min(slice.left, imgW), imgW);

        const { left, top, width, height } = bounds;
        if (width <= 0 || height <= 0) {
            return;
        }

        // Clamp border widths to available box dimensions
        const dT = Math.min(borderTopWidth, height);
        const dR = Math.min(borderRightWidth, width);
        const dB = Math.min(borderBottomWidth, height - dT);
        const dL = Math.min(borderLeftWidth, width - dR);

        // Draw corners
        this.drawRegion(image, 0, 0, sL, sT, left, top, dL, dT);
        this.drawRegion(image, imgW - sR, 0, sR, sT, left + width - dR, top, dR, dT);
        this.drawRegion(image, imgW - sR, imgH - sB, sR, sB, left + width - dR, top + height - dB, dR, dB);
        this.drawRegion(image, 0, imgH - sB, sL, sB, left, top + height - dB, dL, dB);

        // Draw edges. Tiling direction follows the edge identity (top/bottom
        // tile horizontally, left/right vertically) — the repeat keywords in
        // the edges array already encode that axis. Deriving the direction
        // from the destination aspect ratio mis-tiles narrow tall boxes,
        // whose top/bottom edges are taller than they are wide.
        const edges: Array<{
            sx: number;
            sy: number;
            sw: number;
            sh: number;
            dx: number;
            dy: number;
            dw: number;
            dh: number;
            repeat: BORDER_IMAGE_REPEAT;
            horizontal: boolean;
        }> = [
            {
                sx: sL,
                sy: 0,
                sw: imgW - sL - sR,
                sh: sT,
                dx: left + dL,
                dy: top,
                dw: width - dL - dR,
                dh: dT,
                repeat: repeat.horizontal,
                horizontal: true
            },
            {
                sx: imgW - sR,
                sy: sT,
                sw: sR,
                sh: imgH - sT - sB,
                dx: left + width - dR,
                dy: top + dT,
                dw: dR,
                dh: height - dT - dB,
                repeat: repeat.vertical,
                horizontal: false
            },
            {
                sx: sL,
                sy: imgH - sB,
                sw: imgW - sL - sR,
                sh: sB,
                dx: left + dL,
                dy: top + height - dB,
                dw: width - dL - dR,
                dh: dB,
                repeat: repeat.horizontal,
                horizontal: true
            },
            {
                sx: 0,
                sy: sT,
                sw: sL,
                sh: imgH - sT - sB,
                dx: left,
                dy: top + dT,
                dw: dL,
                dh: height - dT - dB,
                repeat: repeat.vertical,
                horizontal: false
            }
        ];

        for (const edge of edges) {
            if (edge.sw <= 0 || edge.sh <= 0 || edge.dw <= 0 || edge.dh <= 0) continue;

            if (edge.repeat === BORDER_IMAGE_REPEAT.STRETCH) {
                this.ctx.drawImage(image, edge.sx, edge.sy, edge.sw, edge.sh, edge.dx, edge.dy, edge.dw, edge.dh);
            } else if (edge.repeat === BORDER_IMAGE_REPEAT.REPEAT || edge.repeat === BORDER_IMAGE_REPEAT.ROUND) {
                this.drawRepeatedEdge(image, edge, edge.horizontal, edge.repeat === BORDER_IMAGE_REPEAT.ROUND);
            }
        }

        // Draw center if fill is specified. border-image-repeat applies to
        // the center region too, so stretch/tile each axis per its keyword.
        if (slice.fill) {
            this.drawCenterRegion(
                image,
                { sx: sL, sy: sT, sw: imgW - sL - sR, sh: imgH - sT - sB },
                { dx: left + dL, dy: top + dT, dw: width - dL - dR, dh: height - dT - dB },
                repeat
            );
        }
    }

    private drawRegion(
        image: HTMLImageElement,
        sx: number,
        sy: number,
        sw: number,
        sh: number,
        dx: number,
        dy: number,
        dw: number,
        dh: number
    ): void {
        if (sw > 0 && sh > 0 && dw > 0 && dh > 0) {
            this.ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        }
    }

    private drawRepeatedEdge(
        image: HTMLImageElement,
        edge: { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number },
        horizontal: boolean,
        round: boolean
    ): void {
        const srcLength = horizontal ? edge.sw : edge.sh;
        const tgLength = horizontal ? edge.dw : edge.dh;
        if (srcLength <= 0 || tgLength <= 0) return;

        let tileSize: number;
        let tileCount: number;

        if (round) {
            tileCount = Math.max(1, Math.round(tgLength / srcLength));
            tileSize = tgLength / tileCount;
        } else {
            tileSize = srcLength;
            tileCount = Math.ceil(tgLength / tileSize);
        }

        // The rect clip below crops the overflowing last tile — drawing it at
        // full size (not squeezed to the remainder) matches how browsers
        // render `repeat`.
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(edge.dx, edge.dy, edge.dw, edge.dh);
        this.ctx.clip();

        for (let i = 0; i < tileCount; i++) {
            const offset = i * tileSize;

            if (horizontal) {
                this.ctx.drawImage(
                    image,
                    edge.sx,
                    edge.sy,
                    edge.sw,
                    edge.sh,
                    edge.dx + offset,
                    edge.dy,
                    tileSize,
                    edge.dh
                );
            } else {
                this.ctx.drawImage(
                    image,
                    edge.sx,
                    edge.sy,
                    edge.sw,
                    edge.sh,
                    edge.dx,
                    edge.dy + offset,
                    edge.dw,
                    tileSize
                );
            }
        }

        this.ctx.restore();
    }

    /**
     * Draw the center region of the border image, tiling each axis per its
     * border-image-repeat keyword (stretch spans the whole axis, repeat
     * tiles at source size with the overflow cropped, round scales the tile
     * to divide the axis evenly).
     */
    private drawCenterRegion(
        image: HTMLImageElement,
        src: { sx: number; sy: number; sw: number; sh: number },
        dst: { dx: number; dy: number; dw: number; dh: number },
        repeat: BorderImageRepeat
    ): void {
        if (src.sw <= 0 || src.sh <= 0 || dst.dw <= 0 || dst.dh <= 0) {
            return;
        }
        const axis = (mode: BORDER_IMAGE_REPEAT, srcLen: number, dstLen: number): { size: number; count: number } => {
            if (mode === BORDER_IMAGE_REPEAT.STRETCH) {
                return { size: dstLen, count: 1 };
            }
            if (mode === BORDER_IMAGE_REPEAT.ROUND) {
                const count = Math.max(1, Math.round(dstLen / srcLen));
                return { size: dstLen / count, count };
            }
            return { size: srcLen, count: Math.max(1, Math.ceil(dstLen / srcLen)) };
        };
        const columns = axis(repeat.horizontal, src.sw, dst.dw);
        const rows = axis(repeat.vertical, src.sh, dst.dh);

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(dst.dx, dst.dy, dst.dw, dst.dh);
        this.ctx.clip();
        for (let row = 0; row < rows.count; row++) {
            for (let column = 0; column < columns.count; column++) {
                this.ctx.drawImage(
                    image,
                    src.sx,
                    src.sy,
                    src.sw,
                    src.sh,
                    dst.dx + column * columns.size,
                    dst.dy + row * rows.size,
                    columns.size,
                    rows.size
                );
            }
        }
        this.ctx.restore();
    }
}
