import { strictEqual, deepStrictEqual, ok } from 'assert';
import { Parser } from '../../syntax/parser';
import { clipPath, CLIP_PATH_TYPE, ClipPathValue } from '../clip-path';
import { LengthPercentage } from '../../types/length-percentage';
import { TokenType } from '../../syntax/tokenizer';

/** Helper that runs a CSS value string through the clipPath descriptor. */
const parse = (css: string): ClipPathValue => {
    const token = Parser.parseValue(css);
    return clipPath.parse(null as any, token);
};

describe('clip-path property descriptor', () => {
    // ------------------------------------------------------------------ none
    describe('none / fallbacks', () => {
        it('should return NONE for "none"', () => {
            strictEqual(parse('none').type, CLIP_PATH_TYPE.NONE);
        });

        it('should return NONE for unknown ident', () => {
            strictEqual(parse('auto').type, CLIP_PATH_TYPE.NONE);
        });

        it('should return NONE for unsupported function', () => {
            // url() is not yet supported
            strictEqual(parse('url(#mask)').type, CLIP_PATH_TYPE.NONE);
        });
    });

    // ----------------------------------------------------------------- inset
    describe('inset()', () => {
        it('should parse a single length (all sides equal)', () => {
            const result = parse('inset(10px)');
            if (result.type !== CLIP_PATH_TYPE.INSET) throw new Error('wrong type');
            strictEqual(result.top.number, 10);
            strictEqual(result.right.number, 10);
            strictEqual(result.bottom.number, 10);
            strictEqual(result.left.number, 10);
        });

        it('should parse two values (top/bottom | left/right)', () => {
            const result = parse('inset(10px 20%)');
            if (result.type !== CLIP_PATH_TYPE.INSET) throw new Error('wrong type');
            strictEqual(result.top.number, 10);
            strictEqual(result.right.number, 20);
            strictEqual(result.bottom.number, 10);
            strictEqual(result.left.number, 20);
        });

        it('should parse four values', () => {
            const result = parse('inset(5px 10px 15px 20px)');
            if (result.type !== CLIP_PATH_TYPE.INSET) throw new Error('wrong type');
            strictEqual(result.top.number, 5);
            strictEqual(result.right.number, 10);
            strictEqual(result.bottom.number, 15);
            strictEqual(result.left.number, 20);
        });

        it('should parse three values (top | left/right | bottom)', () => {
            const result = parse('inset(5px 10px 15px)');
            if (result.type !== CLIP_PATH_TYPE.INSET) throw new Error('wrong type');
            strictEqual(result.top.number, 5);
            strictEqual(result.right.number, 10);
            strictEqual(result.bottom.number, 15);
            strictEqual(result.left.number, 10, 'left should mirror right');
        });

        it('should ignore the "round" clause', () => {
            const result = parse('inset(10px round 5px)');
            if (result.type !== CLIP_PATH_TYPE.INSET) throw new Error('wrong type');
            strictEqual(result.top.number, 10);
        });

        it('should parse percentage values', () => {
            const result = parse('inset(25%)');
            if (result.type !== CLIP_PATH_TYPE.INSET) throw new Error('wrong type');
            strictEqual(result.top.type, TokenType.PERCENTAGE_TOKEN);
            strictEqual(result.top.number, 25);
        });

        it('should parse overlapping insets (>50% each side) — clamping to 0 is done at render time', () => {
            // The parser stores the raw values; buildClipPathEffect clamps w/h to Math.max(0, …).
            const result = parse('inset(60%)');
            if (result.type !== CLIP_PATH_TYPE.INSET) throw new Error('wrong type');
            strictEqual(result.top.number, 60);
            strictEqual(result.right.number, 60);
        });
    });

    // ---------------------------------------------------------------- circle
    describe('circle()', () => {
        it('should default to closest-side radius and 50% 50% center', () => {
            const result = parse('circle()');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            strictEqual(result.radius, 'closest-side');
            strictEqual(result.cx.number, 50);
            strictEqual(result.cy.number, 50);
        });

        it('should parse a percentage radius', () => {
            const result = parse('circle(50%)');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            ok(result.radius !== 'closest-side' && result.radius !== 'farthest-side');
            strictEqual((result.radius as LengthPercentage).number, 50);
        });

        it('should parse closest-side keyword', () => {
            const result = parse('circle(closest-side)');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            strictEqual(result.radius, 'closest-side');
        });

        it('should parse farthest-side keyword', () => {
            const result = parse('circle(farthest-side)');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            strictEqual(result.radius, 'farthest-side');
        });

        it('should parse "at" position', () => {
            const result = parse('circle(50% at 30% 70%)');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            strictEqual(result.cx.number, 30);
            strictEqual(result.cy.number, 70);
        });

        it('should parse "at center" as 50% 50%', () => {
            const result = parse('circle(at center)');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            strictEqual(result.cx.number, 50);
            strictEqual(result.cy.number, 50);
        });

        it('should parse "at left top" as 0 0', () => {
            const result = parse('circle(at left top)');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            strictEqual(result.cx.number, 0);
            strictEqual(result.cy.number, 0);
        });

        it('should parse "at top" as cx=50% cy=0 (top is y-axis)', () => {
            const result = parse('circle(at top)');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            strictEqual(result.cx.number, 50, 'cx should default to 50% (center)');
            strictEqual(result.cy.number, 0, 'cy should be 0 (top)');
        });

        it('should parse "at bottom" as cx=50% cy=100%', () => {
            const result = parse('circle(at bottom)');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            strictEqual(result.cx.number, 50);
            strictEqual(result.cy.number, 100);
        });

        it('should parse "at right" as cx=100% cy=50%', () => {
            const result = parse('circle(at right)');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            strictEqual(result.cx.number, 100);
            strictEqual(result.cy.number, 50);
        });

        it('should parse "at top left" (reversed order) as cx=0 cy=0', () => {
            const result = parse('circle(at top left)');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            strictEqual(result.cx.number, 0);
            strictEqual(result.cy.number, 0);
        });

        it('should parse mixed "at top 30%" as cx=30% cy=0', () => {
            const result = parse('circle(at top 30%)');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            strictEqual(result.cx.number, 30, 'cx should be the length-percentage');
            strictEqual(result.cy.number, 0, 'cy should be 0 (top)');
        });

        it('should parse "at center 30%" as cx=50% cy=30%', () => {
            const result = parse('circle(at center 30%)');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            strictEqual(result.cx.number, 50);
            strictEqual(result.cy.number, 30);
        });

        it('should parse "at 30% center" as cx=30% cy=50%', () => {
            const result = parse('circle(at 30% center)');
            if (result.type !== CLIP_PATH_TYPE.CIRCLE) throw new Error('wrong type');
            strictEqual(result.cx.number, 30);
            strictEqual(result.cy.number, 50);
        });
    });

    // --------------------------------------------------------------- ellipse
    describe('ellipse()', () => {
        it('should default both radii to closest-side and center to 50% 50%', () => {
            const result = parse('ellipse()');
            if (result.type !== CLIP_PATH_TYPE.ELLIPSE) throw new Error('wrong type');
            strictEqual(result.rx, 'closest-side');
            strictEqual(result.ry, 'closest-side');
            strictEqual(result.cx.number, 50);
            strictEqual(result.cy.number, 50);
        });

        it('should parse two length-percentage radii', () => {
            const result = parse('ellipse(40% 30%)');
            if (result.type !== CLIP_PATH_TYPE.ELLIPSE) throw new Error('wrong type');
            ok(result.rx !== 'closest-side' && result.rx !== 'farthest-side');
            ok(result.ry !== 'closest-side' && result.ry !== 'farthest-side');
            strictEqual((result.rx as LengthPercentage).number, 40);
            strictEqual((result.ry as LengthPercentage).number, 30);
        });

        it('should parse radii and "at" position', () => {
            const result = parse('ellipse(40px 20px at 50% 50%)');
            if (result.type !== CLIP_PATH_TYPE.ELLIPSE) throw new Error('wrong type');
            strictEqual((result.rx as LengthPercentage).number, 40);
            strictEqual((result.ry as LengthPercentage).number, 20);
            strictEqual(result.cx.number, 50);
            strictEqual(result.cy.number, 50);
        });
    });

    // -------------------------------------------------------------- polygon
    describe('polygon()', () => {
        it('should parse a triangle', () => {
            const result = parse('polygon(0% 0%, 100% 0%, 50% 100%)');
            if (result.type !== CLIP_PATH_TYPE.POLYGON) throw new Error('wrong type');
            strictEqual(result.points.length, 3);
            strictEqual(result.points[0][0].number, 0);
            strictEqual(result.points[0][1].number, 0);
            strictEqual(result.points[1][0].number, 100);
            strictEqual(result.points[2][0].number, 50);
        });

        it('should skip a leading fill-rule keyword', () => {
            const result = parse('polygon(evenodd, 0% 0%, 100% 50%, 0% 100%)');
            if (result.type !== CLIP_PATH_TYPE.POLYGON) throw new Error('wrong type');
            strictEqual(result.points.length, 3);
        });

        it('should parse pixel coordinates', () => {
            const result = parse('polygon(10px 20px, 100px 20px, 100px 80px, 10px 80px)');
            if (result.type !== CLIP_PATH_TYPE.POLYGON) throw new Error('wrong type');
            strictEqual(result.points.length, 4);
            strictEqual(result.points[0][0].number, 10);
            strictEqual(result.points[0][1].number, 20);
        });

        it('should return empty points array for empty polygon', () => {
            const result = parse('polygon()');
            if (result.type !== CLIP_PATH_TYPE.POLYGON) throw new Error('wrong type');
            deepStrictEqual(result.points, []);
        });
    });

    // ------------------------------------------------------------------ path
    describe('path()', () => {
        it('should parse a valid SVG path string', () => {
            const result = parse("path('M 0 0 L 100 0 L 100 100 Z')");
            if (result.type !== CLIP_PATH_TYPE.PATH) throw new Error('wrong type');
            strictEqual(result.d, 'M 0 0 L 100 0 L 100 100 Z');
        });

        it('should return NONE when no string is provided', () => {
            strictEqual(parse('path()').type, CLIP_PATH_TYPE.NONE);
        });
    });

    // ---------------------------------------- initial value / descriptor meta
    describe('descriptor metadata', () => {
        it('should have name "clip-path"', () => {
            strictEqual(clipPath.name, 'clip-path');
        });

        it('should have initial value "none"', () => {
            strictEqual(clipPath.initialValue, 'none');
        });

        it('should not require vendor prefix', () => {
            strictEqual(clipPath.prefix, false);
        });
    });
});
