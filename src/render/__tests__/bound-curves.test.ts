import { describe, expect, it } from 'vitest';
import { BoundCurves } from '../bound-curves';
import { BezierCurve, isBezierCurve } from '../bezier-curve';
import { ElementContainer } from '../../dom/element-container';
import { Bounds } from '../../css/layout/bounds';
import { TokenType } from '../../css/syntax/tokenizer';

const px = (n: number) => ({ type: TokenType.DIMENSION_TOKEN, flags: 0, unit: 'px', number: n });
const ZERO: ReturnType<typeof px>[] = [px(0)];

const container = (radii: {
    topLeft?: ReturnType<typeof px>[];
    topRight?: ReturnType<typeof px>[];
    bottomRight?: ReturnType<typeof px>[];
    bottomLeft?: ReturnType<typeof px>[];
}): ElementContainer =>
    ({
        bounds: new Bounds(0, 0, 100, 100),
        styles: {
            borderTopLeftRadius: radii.topLeft ?? ZERO,
            borderTopRightRadius: radii.topRight ?? ZERO,
            borderBottomRightRadius: radii.bottomRight ?? ZERO,
            borderBottomLeftRadius: radii.bottomLeft ?? ZERO,
            borderTopWidth: 4,
            borderRightWidth: 4,
            borderBottomWidth: 4,
            borderLeftWidth: 4,
            paddingTop: 0,
            paddingRight: 0,
            paddingBottom: 0,
            paddingLeft: 0
        }
    }) as unknown as ElementContainer;

describe('BoundCurves', () => {
    it('builds curved double/stroke boxes for a top-right-only radius (regression)', () => {
        // The top-right double-outer/double-inner/stroke boxes used to be
        // gated on the TOP-LEFT radii (upstream copy-paste), falling back to
        // straight Vector corners whenever only the top-right corner was
        // rounded — square corners under `border: double`.
        const curves = new BoundCurves(container({ topRight: [px(30), px(30)] }));

        expect(isBezierCurve(curves.topRightBorderDoubleOuterBox)).toBe(true);
        expect(isBezierCurve(curves.topRightBorderDoubleInnerBox)).toBe(true);
        expect(isBezierCurve(curves.topRightBorderStroke)).toBe(true);
    });

    it('keeps straight Vector corners for unrounded corners', () => {
        const curves = new BoundCurves(container({}));

        expect(isBezierCurve(curves.topRightBorderDoubleOuterBox)).toBe(false);
        expect(isBezierCurve(curves.topLeftBorderBox)).toBe(false);
    });

    it('scales all radii down proportionally when adjacent corners overlap', () => {
        // 40+40 = 80 < 100 fits; 60+60 = 120 > 100 must be scaled by 100/120.
        const curves = new BoundCurves(container({ topLeft: [px(60), px(60)], topRight: [px(60), px(60)] }));
        const outer = curves.topLeftBorderBox as BezierCurve;
        // curve start x is bounds.left (0); the horizontal radius is the
        // curve's extent from (0, ym) to (xm, y).
        expect(outer.end.x).toBeCloseTo(60 * (100 / 120), 6);
    });
});
