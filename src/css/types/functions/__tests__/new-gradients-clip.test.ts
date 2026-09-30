import { describe, expect, it } from 'vitest';
import { conicGradient } from '../conic-gradient';
import { repeatingRadialGradient } from '../repeating-radial-gradient';
import { radialGradient } from '../radial-gradient';
import { CSSImageType } from '../../image';
import { clipPath } from '../../../property-descriptors/clip-path';
import { CLIP_PATH_TYPE } from '../../../property-descriptors/clip-path';
import { Context } from '../../../../core/context';
import { Html2CanvasConfig } from '../../../../config';
import { Parser } from '../../../syntax/parser';

const context = (() => {
    const config = new Html2CanvasConfig({ window: window as unknown as Window });
    return new Context(
        { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
        { left: 0, top: 0, width: 800, height: 600 } as never,
        config
    );
})();

describe('conic-gradient', () => {
    it('parses plain color stops', () => {
        const image = conicGradient(context, Parser.parseValues('red, blue'));
        expect(image.type).toBe(CSSImageType.CONIC_GRADIENT);
        expect(image.angle).toBe(0);
        expect(image.stops).toHaveLength(2);
    });

    it('parses the from angle in radians', () => {
        const image = conicGradient(context, Parser.parseValues('from 90deg, red, blue'));
        expect(image.angle).toBeCloseTo(Math.PI / 2, 5);
    });

    it('parses the at position', () => {
        const image = conicGradient(context, Parser.parseValues('at 30% 60%, red, blue'));
        expect(image.position).toHaveLength(2);
    });

    it('does not mistake the at clause for a color stop', () => {
        const image = conicGradient(context, Parser.parseValues('from 0deg at center, red, blue'));
        expect(image.stops).toHaveLength(2);
    });
});

describe('repeating-radial-gradient', () => {
    it('shares the radial grammar with a repeating image type', () => {
        const repeating = repeatingRadialGradient(context, Parser.parseValues('red, blue 50px'));
        const plain = radialGradient(context, Parser.parseValues('red, blue 50px'));
        expect(repeating.type).toBe(CSSImageType.REPEATING_RADIAL_GRADIENT);
        expect(plain.type).toBe(CSSImageType.RADIAL_GRADIENT);
        expect(repeating.stops).toEqual(plain.stops);
        expect(repeating.shape).toEqual(plain.shape);
        expect(repeating.size).toEqual(plain.size);
    });
});

const parseClipToken = (value: string) => new Parser(Parser.parseValues(value)).parseComponentValue();

describe('clip-path xywh() and rect()', () => {
    it('parses xywh into an xywh shape', () => {
        const result = clipPath.parse(context, parseClipToken('xywh(0 0 100% 50%)'));
        expect(result.type).toBe(CLIP_PATH_TYPE.XYWH);
    });

    it('rejects xywh with fewer than four values', () => {
        const result = clipPath.parse(context, parseClipToken('xywh(0 0 100%)'));
        expect(result.type).toBe(CLIP_PATH_TYPE.NONE);
    });

    it('ignores the round clause', () => {
        const result = clipPath.parse(context, parseClipToken('xywh(10px 20px 30px 40px round 4px)'));
        expect(result.type).toBe(CLIP_PATH_TYPE.XYWH);
    });

    it('parses rect() into an inset shape', () => {
        const result = clipPath.parse(context, parseClipToken('rect(10px 20px 30px 40px)'));
        expect(result.type).toBe(CLIP_PATH_TYPE.INSET);
    });

    it('resolves rect() auto keywords per edge', () => {
        const result = clipPath.parse(context, parseClipToken('rect(auto auto auto auto)'));
        expect(result.type).toBe(CLIP_PATH_TYPE.INSET);
        if (result.type === CLIP_PATH_TYPE.INSET) {
            expect(result.top.number).toBe(0);
            expect(result.left.number).toBe(0);
            expect(result.right.number).toBe(100);
            expect(result.bottom.number).toBe(100);
        }
    });

    it('rejects rect() with the wrong value count', () => {
        const result = clipPath.parse(context, parseClipToken('rect(10px 20px 30px)'));
        expect(result.type).toBe(CLIP_PATH_TYPE.NONE);
    });
});
