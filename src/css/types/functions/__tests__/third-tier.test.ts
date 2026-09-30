import { describe, expect, it } from 'vitest';
import {
    textEmphasisColor,
    textEmphasisPosition,
    textEmphasisStyle
} from '../../../property-descriptors/text-emphasis';
import { borderImageOutset, borderImageWidth } from '../../../property-descriptors/border-image-width';
import { webkitBoxReflect } from '../../../property-descriptors/webkit-box-reflect';
import { imageSet } from '../image-set';
import { Parser } from '../../../syntax/parser';
import { CSSImageType } from '../../image';
import { Html2CanvasConfig } from '../../../../config';
import { Context } from '../../../../core/context';

const parseList = (descriptor: { parse: (c: never, t: never) => unknown }, value: string): unknown =>
    descriptor.parse(undefined as never, Parser.parseValues(value) as never);
const parseValue = (value: string) => new Parser(Parser.parseValues(value)).parseComponentValue();

const createContext = (dpr: number): Context => {
    // jsdom's real window keeps OriginChecker happy; DPR is mocked per test.
    const mockWindow = new Proxy(window as unknown as Record<string, unknown>, {
        get: (target, prop) => (prop === 'devicePixelRatio' ? dpr : target[prop as string])
    }) as unknown as Window;
    const config = new Html2CanvasConfig({ window: mockWindow });
    return new Context(
        { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
        { left: 0, top: 0, width: 800, height: 600 } as never,
        config
    );
};

describe('text-emphasis', () => {
    it('parses keyword styles into fill/shape pairs', () => {
        expect(parseList(textEmphasisStyle, 'filled circle')).toEqual({ fill: true, shape: 'circle' });
        expect(parseList(textEmphasisStyle, 'open dot')).toEqual({ fill: false, shape: 'dot' });
        expect(parseList(textEmphasisStyle, 'sesame')).toEqual({ fill: true, shape: 'sesame' });
        expect(parseList(textEmphasisStyle, 'none')).toBeNull();
    });

    it('passes custom string marks through', () => {
        const style = parseList(textEmphasisStyle, '"★"');
        // The tokenizer hands string styles over as StringValueToken instances.
        expect(typeof style === 'string' || (style as { value?: string })?.value === '★').toBe(true);
    });

    it('parses color with currentcolor fallback', () => {
        expect(textEmphasisColor.parse(undefined as never, parseValue('#112233') as never)).toBe(0x112233ff);
        expect(textEmphasisColor.parse(undefined as never, parseValue('currentcolor') as never)).toBeNull();
    });

    it('parses position keywords', () => {
        expect(parseList(textEmphasisPosition, 'under left')).toEqual({ over: false, right: false });
        expect(parseList(textEmphasisPosition, 'over right')).toEqual({ over: true, right: true });
    });
});

describe('border-image-width / outset', () => {
    it('parses width kinds and expands 1–4 values', () => {
        const one = parseList(borderImageWidth, '5px') as { top: { kind: string; value: number } };
        expect(one.top).toEqual({ kind: 'length', value: 5 });
        expect(one.bottom).toEqual({ kind: 'length', value: 5 });

        const mixed = parseList(borderImageWidth, '1 2px 3%') as {
            top: { kind: string };
            right: { kind: string };
            bottom: { kind: string };
            left: { kind: string };
        };
        expect(mixed.top.kind).toBe('number');
        expect(mixed.right.kind).toBe('length');
        expect(mixed.bottom.kind).toBe('percentage');
        expect(mixed.left.kind).toBe('length'); // 3 values: left takes the 2nd
    });

    it('parses auto and falls back to auto for invalid input', () => {
        const auto = parseList(borderImageWidth, 'auto') as { top: { kind: string } };
        expect(auto.top.kind).toBe('auto');
        const invalid = parseList(borderImageWidth, 'red') as { top: { kind: string } };
        expect(invalid.top.kind).toBe('auto');
    });

    it('parses outset lengths and numbers', () => {
        const outset = parseList(borderImageOutset, '10px') as { top: { kind: string; value: number } };
        expect(outset.top).toEqual({ kind: 'length', value: 10 });
        const numeric = parseList(borderImageOutset, '2') as { top: { kind: string; value: number } };
        expect(numeric.top).toEqual({ kind: 'number', value: 2 });
    });
});

describe('-webkit-box-reflect', () => {
    const context = createContext(1);

    it('parses direction and offset', () => {
        const value = webkitBoxReflect.parse(context, Parser.parseValues('below 5px') as never) as {
            direction: string;
            offset: number;
            mask: unknown;
        };
        expect(value.direction).toBe('below');
        expect(value.offset).toBe(5);
        expect(value.mask).toBeNull();
    });

    it('parses the gradient mask and tolerates the border-image tail', () => {
        // Chrome appends the mask's border-image bookkeeping to the computed value.
        const value = webkitBoxReflect.parse(
            context,
            Parser.parseValues(
                'below 0px linear-gradient(rgba(0, 0, 0, 0), rgb(255, 255, 255)) 0 fill / auto / 0 stretch'
            ) as never
        ) as { direction: string; mask: { type: number } | null };
        expect(value.direction).toBe('below');
        expect(value.mask).toBeTruthy();
        expect(value.mask!.type).toBe(CSSImageType.LINEAR_GRADIENT);
        expect(value.offset).toBe(0);
    });

    it('returns null for none', () => {
        expect(webkitBoxReflect.parse(context, Parser.parseValues('none') as never)).toBeNull();
    });
});

describe('image-set', () => {
    it('selects the candidate matching the device pixel ratio', () => {
        const dpr1 = createContext(1);
        const image = imageSet(dpr1, Parser.parseValues('url(a.png) 1x, url(b.png) 2x'));
        expect(image).toEqual({ type: 0 /* CSSImageType.URL */, url: 'a.png' });

        const dpr2 = createContext(2);
        const hi = imageSet(dpr2, Parser.parseValues('url(a.png) 1x, url(b.png) 2x'));
        expect(hi).toEqual({ type: 0, url: 'b.png' });
    });

    it('falls back to the largest candidate when none satisfies the DPR', () => {
        const dpr3 = createContext(3);
        const image = imageSet(dpr3, Parser.parseValues('url(a.png) 1x, url(b.png) 2x'));
        expect(image).toEqual({ type: 0, url: 'b.png' });
    });

    it('parses dppx serialisation from computed styles', () => {
        const dpr2 = createContext(2);
        const image = imageSet(dpr2, Parser.parseValues('url("a.png") 1dppx, url("b.png") 2dppx'));
        expect(image).toEqual({ type: 0, url: 'b.png' });
    });
});
