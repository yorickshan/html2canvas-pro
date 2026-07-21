import { describe, it, expect } from 'vitest';
import { Parser } from '../../syntax/parser';
import { Context } from '../../../core/context';

// Helper: IDENT_VALUE parse takes (context, string)
const identParse = <T>(desc: { parse: (ctx: Context, v: string) => T }, v: string) =>
    desc.parse(null as unknown as Context, v);

// Helper: LIST parse takes (context, CSSValue[])
const listParse = <T>(desc: { parse: (ctx: Context, vs: ReturnType<typeof Parser.parseValues>) => T }, v: string) =>
    desc.parse(null as unknown as Context, Parser.parseValues(v));

// Helper: VALUE parse takes (context, CSSValue)
const valueParse = <T>(desc: { parse: (ctx: Context, v: ReturnType<typeof Parser.parseValue>) => T }, v: string) =>
    desc.parse(null as unknown as Context, Parser.parseValue(v));

// ======== IDENT_VALUE descriptors ========

// --- direction ---
import { direction, DIRECTION } from '../direction';
describe('direction descriptor', () => {
    it('parses ltr', () => expect(identParse(direction, 'ltr')).toBe(DIRECTION.LTR));
    it('parses rtl', () => expect(identParse(direction, 'rtl')).toBe(DIRECTION.RTL));
    it('falls back to LTR for unknown', () => expect(identParse(direction, 'xyz')).toBe(DIRECTION.LTR));
    it('has correct name and initialValue', () => {
        expect(direction.name).toBe('direction');
        expect(direction.initialValue).toBe('ltr');
    });
});

// --- float ---
import { float, FLOAT } from '../float';
describe('float descriptor', () => {
    it('parses left', () => expect(identParse(float, 'left')).toBe(FLOAT.LEFT));
    it('parses right', () => expect(identParse(float, 'right')).toBe(FLOAT.RIGHT));
    it('parses none', () => expect(identParse(float, 'none')).toBe(FLOAT.NONE));
    it('parses inline-start', () => expect(identParse(float, 'inline-start')).toBe(FLOAT.INLINE_START));
    it('parses inline-end', () => expect(identParse(float, 'inline-end')).toBe(FLOAT.INLINE_END));
    it('falls back for unknown', () => expect(identParse(float, 'xyz')).toBe(FLOAT.NONE));
    it('has correct name', () => expect(float.name).toBe('float'));
});

// --- font-style ---
import { fontStyle, FONT_STYLE } from '../font-style';
describe('font-style descriptor', () => {
    it('parses normal', () => expect(identParse(fontStyle, 'normal')).toBe(FONT_STYLE.NORMAL));
    it('parses italic', () => expect(identParse(fontStyle, 'italic')).toBe(FONT_STYLE.ITALIC));
    it('parses oblique', () => expect(identParse(fontStyle, 'oblique')).toBe(FONT_STYLE.OBLIQUE));
    it('falls back for unknown', () => expect(identParse(fontStyle, 'xyz')).toBe(FONT_STYLE.NORMAL));
});

// --- font-variant-ligatures ---
import { fontVariantLigatures, FONT_VARIANT_LIGATURES } from '../font-variant-ligatures';
describe('font-variant-ligatures descriptor', () => {
    it('parses normal', () => expect(identParse(fontVariantLigatures, 'normal')).toBe(FONT_VARIANT_LIGATURES.NORMAL));
    it('parses none', () => expect(identParse(fontVariantLigatures, 'none')).toBe(FONT_VARIANT_LIGATURES.NONE));
    it('falls back for unknown', () =>
        expect(identParse(fontVariantLigatures, 'xyz')).toBe(FONT_VARIANT_LIGATURES.NORMAL));
    it('has correct name', () => expect(fontVariantLigatures.name).toBe('font-variant-ligatures'));
});

// --- visibility ---
import { visibility, VISIBILITY } from '../visibility';
describe('visibility descriptor', () => {
    it('parses visible', () => expect(identParse(visibility, 'visible')).toBe(VISIBILITY.VISIBLE));
    it('parses hidden', () => expect(identParse(visibility, 'hidden')).toBe(VISIBILITY.HIDDEN));
    it('parses collapse', () => expect(identParse(visibility, 'collapse')).toBe(VISIBILITY.COLLAPSE));
    it('falls back for unknown', () => expect(identParse(visibility, 'xyz')).toBe(VISIBILITY.VISIBLE));
    it('has correct name', () => expect(visibility.name).toBe('visibility'));
});

// --- writing-mode ---
import { writingMode, WRITING_MODE } from '../writing-mode';
describe('writing-mode descriptor', () => {
    it('parses horizontal-tb', () => expect(identParse(writingMode, 'horizontal-tb')).toBe(WRITING_MODE.HORIZONTAL_TB));
    it('parses vertical-rl', () => expect(identParse(writingMode, 'vertical-rl')).toBe(WRITING_MODE.VERTICAL_RL));
    it('parses vertical-lr', () => expect(identParse(writingMode, 'vertical-lr')).toBe(WRITING_MODE.VERTICAL_LR));
    it('falls back for unknown', () => expect(identParse(writingMode, 'xyz')).toBe(WRITING_MODE.HORIZONTAL_TB));
    it('has correct name', () => expect(writingMode.name).toBe('writing-mode'));
});

// --- position ---
import { position, POSITION } from '../position';
describe('position descriptor', () => {
    it('parses static', () => expect(identParse(position, 'static')).toBe(POSITION.STATIC));
    it('parses relative', () => expect(identParse(position, 'relative')).toBe(POSITION.RELATIVE));
    it('parses absolute', () => expect(identParse(position, 'absolute')).toBe(POSITION.ABSOLUTE));
    it('parses fixed', () => expect(identParse(position, 'fixed')).toBe(POSITION.FIXED));
    it('parses sticky', () => expect(identParse(position, 'sticky')).toBe(POSITION.STICKY));
    it('falls back for unknown', () => expect(identParse(position, 'xyz')).toBe(POSITION.STATIC));
});

// --- overflow-wrap ---
import { overflowWrap, OVERFLOW_WRAP } from '../overflow-wrap';
describe('overflow-wrap descriptor', () => {
    it('parses normal', () => expect(identParse(overflowWrap, 'normal')).toBe(OVERFLOW_WRAP.NORMAL));
    it('parses break-word', () => expect(identParse(overflowWrap, 'break-word')).toBe(OVERFLOW_WRAP.BREAK_WORD));
    it('falls back for unknown', () => expect(identParse(overflowWrap, 'xyz')).toBe(OVERFLOW_WRAP.NORMAL));
});

// --- word-break ---
import { wordBreak, WORD_BREAK } from '../word-break';
describe('word-break descriptor', () => {
    it('parses normal', () => expect(identParse(wordBreak, 'normal')).toBe(WORD_BREAK.NORMAL));
    it('parses break-all', () => expect(identParse(wordBreak, 'break-all')).toBe(WORD_BREAK.BREAK_ALL));
    it('parses keep-all', () => expect(identParse(wordBreak, 'keep-all')).toBe(WORD_BREAK.KEEP_ALL));
    it('falls back for unknown', () => expect(identParse(wordBreak, 'xyz')).toBe(WORD_BREAK.NORMAL));
});

// --- line-break ---
import { lineBreak, LINE_BREAK } from '../line-break';
describe('line-break descriptor', () => {
    it('parses normal', () => expect(identParse(lineBreak, 'normal')).toBe(LINE_BREAK.NORMAL));
    it('parses strict', () => expect(identParse(lineBreak, 'strict')).toBe(LINE_BREAK.STRICT));
    it('falls back for unknown', () => expect(identParse(lineBreak, 'xyz')).toBe(LINE_BREAK.NORMAL));
});

// --- text-align ---
// Note: 'justify' maps to CENTER in the real implementation
import { textAlign, TEXT_ALIGN } from '../text-align';
describe('text-align descriptor', () => {
    it('parses left', () => expect(identParse(textAlign, 'left')).toBe(TEXT_ALIGN.LEFT));
    it('parses center', () => expect(identParse(textAlign, 'center')).toBe(TEXT_ALIGN.CENTER));
    it('parses right', () => expect(identParse(textAlign, 'right')).toBe(TEXT_ALIGN.RIGHT));
    it('maps justify to CENTER', () => expect(identParse(textAlign, 'justify')).toBe(TEXT_ALIGN.CENTER));
    it('falls back for unknown', () => expect(identParse(textAlign, 'xyz')).toBe(TEXT_ALIGN.LEFT));
    it('has correct name', () => expect(textAlign.name).toBe('text-align'));
});

// --- text-transform ---
import { textTransform, TEXT_TRANSFORM } from '../text-transform';
describe('text-transform descriptor', () => {
    it('parses none', () => expect(identParse(textTransform, 'none')).toBe(TEXT_TRANSFORM.NONE));
    it('parses uppercase', () => expect(identParse(textTransform, 'uppercase')).toBe(TEXT_TRANSFORM.UPPERCASE));
    it('parses lowercase', () => expect(identParse(textTransform, 'lowercase')).toBe(TEXT_TRANSFORM.LOWERCASE));
    it('parses capitalize', () => expect(identParse(textTransform, 'capitalize')).toBe(TEXT_TRANSFORM.CAPITALIZE));
    it('falls back for unknown', () => expect(identParse(textTransform, 'xyz')).toBe(TEXT_TRANSFORM.NONE));
});

// --- text-overflow ---
import { textOverflow, TEXT_OVERFLOW } from '../text-overflow';
describe('text-overflow descriptor', () => {
    it('parses clip', () => expect(identParse(textOverflow, 'clip')).toBe(TEXT_OVERFLOW.CLIP));
    it('parses ellipsis', () => expect(identParse(textOverflow, 'ellipsis')).toBe(TEXT_OVERFLOW.ELLIPSIS));
    it('falls back for unknown', () => expect(identParse(textOverflow, 'xyz')).toBe(TEXT_OVERFLOW.CLIP));
});

// --- text-decoration-style ---
import { textDecorationStyle, TEXT_DECORATION_STYLE } from '../text-decoration-style';
describe('text-decoration-style descriptor', () => {
    it('parses solid', () => expect(identParse(textDecorationStyle, 'solid')).toBe(TEXT_DECORATION_STYLE.SOLID));
    it('parses double', () => expect(identParse(textDecorationStyle, 'double')).toBe(TEXT_DECORATION_STYLE.DOUBLE));
    it('parses dotted', () => expect(identParse(textDecorationStyle, 'dotted')).toBe(TEXT_DECORATION_STYLE.DOTTED));
    it('parses dashed', () => expect(identParse(textDecorationStyle, 'dashed')).toBe(TEXT_DECORATION_STYLE.DASHED));
    it('parses wavy', () => expect(identParse(textDecorationStyle, 'wavy')).toBe(TEXT_DECORATION_STYLE.WAVY));
    it('falls back for unknown', () =>
        expect(identParse(textDecorationStyle, 'xyz')).toBe(TEXT_DECORATION_STYLE.SOLID));
});

// --- list-style-position ---
import { listStylePosition, LIST_STYLE_POSITION } from '../list-style-position';
describe('list-style-position descriptor', () => {
    it('parses inside', () => expect(identParse(listStylePosition, 'inside')).toBe(LIST_STYLE_POSITION.INSIDE));
    it('parses outside', () => expect(identParse(listStylePosition, 'outside')).toBe(LIST_STYLE_POSITION.OUTSIDE));
    it('falls back for unknown', () => expect(identParse(listStylePosition, 'xyz')).toBe(LIST_STYLE_POSITION.OUTSIDE));
});

// --- list-style-type ---
import { listStyleType, LIST_STYLE_TYPE } from '../list-style-type';
describe('list-style-type descriptor', () => {
    it('parses none', () => expect(identParse(listStyleType, 'none')).toBe(LIST_STYLE_TYPE.NONE));
    it('parses disc', () => expect(identParse(listStyleType, 'disc')).toBe(LIST_STYLE_TYPE.DISC));
    it('parses circle', () => expect(identParse(listStyleType, 'circle')).toBe(LIST_STYLE_TYPE.CIRCLE));
    it('parses square', () => expect(identParse(listStyleType, 'square')).toBe(LIST_STYLE_TYPE.SQUARE));
    it('parses decimal', () => expect(identParse(listStyleType, 'decimal')).toBe(LIST_STYLE_TYPE.DECIMAL));
    it('falls back for unknown', () => expect(identParse(listStyleType, 'xyz')).toBe(LIST_STYLE_TYPE.NONE));
    it('has correct name', () => expect(listStyleType.name).toBe('list-style-type'));
});

// --- box-decoration-break ---
import { boxDecorationBreak, BOX_DECORATION_BREAK } from '../box-decoration-break';
describe('box-decoration-break descriptor', () => {
    it('parses slice', () => expect(identParse(boxDecorationBreak, 'slice')).toBe(BOX_DECORATION_BREAK.SLICE));
    it('parses clone', () => expect(identParse(boxDecorationBreak, 'clone')).toBe(BOX_DECORATION_BREAK.CLONE));
    it('falls back for unknown', () => expect(identParse(boxDecorationBreak, 'xyz')).toBe(BOX_DECORATION_BREAK.SLICE));
});

// --- mix-blend-mode ---
// MIX_BLEND_MODE is a const object (not enum), parse returns string
import { mixBlendMode } from '../mix-blend-mode';
describe('mix-blend-mode descriptor', () => {
    it('parses normal', () => expect(identParse(mixBlendMode, 'normal')).toBe('normal'));
    it('parses multiply', () => expect(identParse(mixBlendMode, 'multiply')).toBe('multiply'));
    it('parses screen', () => expect(identParse(mixBlendMode, 'screen')).toBe('screen'));
    it('falls back for unknown', () => expect(identParse(mixBlendMode, 'xyz')).toBe('normal'));
    it('has correct name', () => expect(mixBlendMode.name).toBe('mix-blend-mode'));
});

// --- image-rendering ---
import { imageRendering, IMAGE_RENDERING } from '../image-rendering';
describe('image-rendering descriptor', () => {
    it('parses auto', () => expect(identParse(imageRendering, 'auto')).toBe(IMAGE_RENDERING.AUTO));
    it('parses crisp-edges', () => expect(identParse(imageRendering, 'crisp-edges')).toBe(IMAGE_RENDERING.CRISP_EDGES));
    it('parses pixelated', () => expect(identParse(imageRendering, 'pixelated')).toBe(IMAGE_RENDERING.PIXELATED));
    it('falls back for unknown', () => expect(identParse(imageRendering, 'xyz')).toBe(IMAGE_RENDERING.AUTO));
    it('has correct name', () => expect(imageRendering.name).toBe('image-rendering'));
});

// ======== LIST / VALUE descriptors with adapted parse signatures ========

// --- font-variant (LIST type, returns string[], no enum) ---
import { fontVariant } from '../font-variant';
describe('font-variant descriptor (LIST type)', () => {
    it('parses normal', () => {
        expect(listParse(fontVariant, 'normal')).toEqual(['normal']);
    });
    it('parses small-caps', () => {
        expect(listParse(fontVariant, 'small-caps')).toEqual(['small-caps']);
    });
    it('passes through any ident token (no validation filter)', () => {
        expect(listParse(fontVariant, 'xyz')).toEqual(['xyz']);
    });
    it('has correct name and initialValue', () => {
        expect(fontVariant.name).toBe('font-variant');
        expect(fontVariant.initialValue).toBe('none');
    });
});

// --- font-weight (VALUE type, parse takes CSSValue, returns number) ---
import { fontWeight } from '../font-weight';
describe('font-weight descriptor (VALUE type)', () => {
    it('parses bold as 700', () => expect(valueParse(fontWeight, 'bold')).toBe(700));
    it('parses normal as 400', () => expect(valueParse(fontWeight, 'normal')).toBe(400));
    it('parses numeric weights', () => {
        expect(valueParse(fontWeight, '100')).toBe(100);
        expect(valueParse(fontWeight, '400')).toBe(400);
        expect(valueParse(fontWeight, '700')).toBe(700);
        expect(valueParse(fontWeight, '900')).toBe(900);
    });
    it('falls back to 400 for unknown', () => expect(valueParse(fontWeight, 'xyz')).toBe(400));
    it('has correct name', () => expect(fontWeight.name).toBe('font-weight'));
});

// --- overflow (LIST type, returns OVERFLOW[]) ---
import { overflow, OVERFLOW } from '../overflow';
describe('overflow descriptor (LIST type)', () => {
    it('parses visible', () => expect(listParse(overflow, 'visible')).toEqual([OVERFLOW.VISIBLE]));
    it('parses hidden', () => expect(listParse(overflow, 'hidden')).toEqual([OVERFLOW.HIDDEN]));
    it('parses scroll', () => expect(listParse(overflow, 'scroll')).toEqual([OVERFLOW.SCROLL]));
    it('parses auto', () => expect(listParse(overflow, 'auto')).toEqual([OVERFLOW.AUTO]));
    it('falls back for unknown', () => expect(listParse(overflow, 'xyz')).toEqual([OVERFLOW.VISIBLE]));
    it('has correct name', () => expect(overflow.name).toBe('overflow'));
});

// --- text-decoration-line (LIST type, returns TEXT_DECORATION_LINE[]) ---
import { textDecorationLine, TEXT_DECORATION_LINE } from '../text-decoration-line';
describe('text-decoration-line descriptor (LIST type)', () => {
    it('parses underline', () =>
        expect(listParse(textDecorationLine, 'underline')).toEqual([TEXT_DECORATION_LINE.UNDERLINE]));
    it('parses overline', () =>
        expect(listParse(textDecorationLine, 'overline')).toEqual([TEXT_DECORATION_LINE.OVERLINE]));
    it('parses line-through', () =>
        expect(listParse(textDecorationLine, 'line-through')).toEqual([TEXT_DECORATION_LINE.LINE_THROUGH]));
    it('returns empty for unknown', () => expect(listParse(textDecorationLine, 'xyz')).toEqual([]));
    it('has correct name', () => expect(textDecorationLine.name).toBe('text-decoration-line'));
});

// ======== Metadata tests for remaining descriptors ========

import { backgroundBlendMode } from '../background-blend-mode';
import { backgroundClip } from '../background-clip';
import { backgroundOrigin } from '../background-origin';
import { backgroundRepeat } from '../background-repeat';
import { borderImageRepeat } from '../border-image-repeat';
import { borderTopStyle } from '../border-style';
import { objectFit } from '../object-fit';

describe('remaining descriptor metadata', () => {
    it('background-blend-mode', () => {
        expect(backgroundBlendMode.name).toBe('background-blend-mode');
        expect(backgroundBlendMode.initialValue).toBe('normal');
    });
    it('background-clip', () => {
        expect(backgroundClip.name).toBe('background-clip');
        expect(backgroundClip.initialValue).toBe('border-box');
    });
    it('background-origin', () => {
        expect(backgroundOrigin.name).toBe('background-origin');
        expect(backgroundOrigin.initialValue).toBe('border-box');
    });
    it('background-repeat', () => {
        expect(backgroundRepeat.name).toBe('background-repeat');
        expect(backgroundRepeat.initialValue).toBe('repeat');
    });
    it('border-image-repeat', () => {
        expect(borderImageRepeat.name).toBe('border-image-repeat');
        expect(borderImageRepeat.initialValue).toBe('stretch');
    });
    it('border-top-style', () => {
        expect(borderTopStyle.name).toBe('border-top-style');
        expect(borderTopStyle.initialValue).toBe('solid');
    });
    it('object-fit', () => {
        expect(objectFit.name).toBe('object-fit');
        expect(objectFit.initialValue).toBe('fill');
    });
});
