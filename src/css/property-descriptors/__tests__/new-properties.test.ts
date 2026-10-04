import { describe, expect, it } from 'vitest';
import { accentColor } from '../accent-color';
import { webkitTextFillColor } from '../webkit-text-fill-color';
import { isolation, ISOLATION } from '../isolation';
import { outlineColor, outlineOffset, outlineStyle, outlineWidth, OUTLINE_STYLE } from '../outline';
import { backdropFilter } from '../backdrop-filter';
import { maskImage, maskPosition, maskRepeat, maskSize } from '../mask';
import { Parser } from '../../syntax/parser';
// LIST descriptors take token arrays; VALUE descriptors take a single parsed component value.
import { BACKGROUND_REPEAT } from '../background-repeat';
import { CSSImageType } from '../../types/image';
import { Context } from '../../../core/context';
import { Html2CanvasConfig } from '../../../config';

const parseToken = (value: string) => new Parser(Parser.parseValues(value) as never).parseComponentValue();

describe('accent-color', () => {
    it('parses colors and the auto keyword', () => {
        expect(accentColor.parse(undefined as never, parseToken('#ff0000') as never)).toBe(0xff0000ff);
        expect(accentColor.parse(undefined as never, parseToken('auto') as never)).toBeNull();
    });
});

describe('-webkit-text-fill-color', () => {
    it('returns null for currentcolor so the renderer falls back to color', () => {
        expect(webkitTextFillColor.parse(undefined as never, parseToken('currentcolor') as never)).toBeNull();
        expect(webkitTextFillColor.parse(undefined as never, parseToken('#123456') as never)).toBe(0x123456ff);
    });
});

describe('isolation', () => {
    it('maps isolate/auto', () => {
        expect(isolation.parse(undefined as never, 'isolate' as never)).toBe(ISOLATION.ISOLATE);
        expect(isolation.parse(undefined as never, 'auto' as never)).toBe(ISOLATION.AUTO);
    });
});

describe('outline', () => {
    it('parses outline styles', () => {
        expect(outlineStyle.parse(undefined as never, 'solid' as never)).toBe(OUTLINE_STYLE.SOLID);
        expect(outlineStyle.parse(undefined as never, 'dashed' as never)).toBe(OUTLINE_STYLE.DASHED);
        expect(outlineStyle.parse(undefined as never, 'auto' as never)).toBe(OUTLINE_STYLE.AUTO);
        expect(outlineStyle.parse(undefined as never, 'none' as never)).toBe(OUTLINE_STYLE.NONE);
    });

    it('parses outline color with currentcolor fallback', () => {
        expect(outlineColor.parse(undefined as never, parseToken('currentcolor') as never)).toBeNull();
        expect(outlineColor.parse(undefined as never, parseToken('rgb(1, 2, 3)') as never)).toBe(0x010203ff);
    });

    it('parses numeric width and offset', () => {
        expect(outlineWidth.parse(undefined as never, parseToken('3px') as never)).toBe(3);
        expect(outlineOffset.parse(undefined as never, parseToken('4px') as never)).toBe(4);
    });
});

describe('backdrop-filter', () => {
    it('reconstructs the filter chain string', () => {
        const value = backdropFilter.parse(undefined as never, [parseToken('blur(4px)')] as never);
        expect(value).toBe('blur(4px)');
        expect(backdropFilter.parse(undefined as never, [parseToken('none')] as never)).toBeNull();
    });
});

describe('mask descriptors', () => {
    const context = (() => {
        const config = new Html2CanvasConfig({ window: window as unknown as Window });
        return new Context(
            { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
            { left: 0, top: 0, width: 800, height: 600 } as never,
            config
        );
    })();

    it('parses mask-image gradients and urls', () => {
        const gradient = maskImage.parse(context, Parser.parseValues('linear-gradient(black, transparent)'));
        const image = (gradient as ReturnType<typeof maskImage.parse>)[0];
        expect(image?.type).toBe(CSSImageType.LINEAR_GRADIENT);

        const none = maskImage.parse(context, Parser.parseValues('none'));
        expect(none).toEqual([]);
    });

    it('parses mask-position/size/repeat like their background counterparts', () => {
        const position = maskPosition.parse(context, Parser.parseValues('50% 50%')) as unknown as {
            0: { number: number }[];
        };
        expect(position[0]?.[0]?.number).toBe(50);

        const size = maskSize.parse(context, Parser.parseValues('cover')) as Array<Array<{ value: string }>>;
        expect(size[0]?.[0]?.value).toBe('cover');

        const repeat = maskRepeat.parse(context, Parser.parseValues('no-repeat'));
        expect(repeat).toEqual([BACKGROUND_REPEAT.NO_REPEAT]);
    });
});
