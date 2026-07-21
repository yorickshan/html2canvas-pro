import { describe, it, expect } from 'vitest';

// --- background-color ---
import { backgroundColor } from '../background-color';
describe('background-color descriptor', () => {
    it('has correct name', () => expect(backgroundColor.name).toBe('background-color'));
    it('has defined initialValue', () => expect(backgroundColor.initialValue).toBeDefined());
});

// --- background-size ---
import { backgroundSize } from '../background-size';
describe('background-size descriptor', () => {
    it('has correct name', () => expect(backgroundSize.name).toBe('background-size'));
    it('has defined initialValue', () => expect(backgroundSize.initialValue).toBeDefined());
});

// --- background-position ---
import { backgroundPosition } from '../background-position';
describe('background-position descriptor', () => {
    it('has correct name', () => expect(backgroundPosition.name).toBe('background-position'));
    it('has defined initialValue', () => expect(backgroundPosition.initialValue).toBeDefined());
});

// --- background-image ---
import { backgroundImage } from '../background-image';
describe('background-image descriptor', () => {
    it('has correct name', () => expect(backgroundImage.name).toBe('background-image'));
    it('has defined initialValue', () => expect(backgroundImage.initialValue).toBeDefined());
});

// --- border-radius descriptors ---
import {
    borderTopLeftRadius,
    borderTopRightRadius,
    borderBottomRightRadius,
    borderBottomLeftRadius
} from '../border-radius';
describe('border-radius descriptors', () => {
    it('have correct names', () => {
        expect(borderTopLeftRadius.name).toBe('border-top-left-radius');
        expect(borderTopRightRadius.name).toBe('border-top-right-radius');
        expect(borderBottomRightRadius.name).toBe('border-bottom-right-radius');
        expect(borderBottomLeftRadius.name).toBe('border-bottom-left-radius');
    });
    it('have defined initialValues', () => {
        [borderTopLeftRadius, borderTopRightRadius, borderBottomRightRadius, borderBottomLeftRadius].forEach((desc) => {
            expect(desc.initialValue).toBeDefined();
        });
    });
});

// --- border-width descriptors ---
import { borderTopWidth, borderRightWidth, borderBottomWidth, borderLeftWidth } from '../border-width';
describe('border-width descriptors', () => {
    it('have correct names', () => {
        expect(borderTopWidth.name).toBe('border-top-width');
        expect(borderRightWidth.name).toBe('border-right-width');
        expect(borderBottomWidth.name).toBe('border-bottom-width');
        expect(borderLeftWidth.name).toBe('border-left-width');
    });
    it('have defined initialValues', () => {
        [borderTopWidth, borderRightWidth, borderBottomWidth, borderLeftWidth].forEach((desc) => {
            expect(desc.initialValue).toBeDefined();
        });
    });
});

// --- border-color descriptors ---
import { borderTopColor, borderRightColor, borderBottomColor, borderLeftColor } from '../border-color';
describe('border-color descriptors', () => {
    it('have correct names', () => {
        expect(borderTopColor.name).toBe('border-top-color');
        expect(borderRightColor.name).toBe('border-right-color');
        expect(borderBottomColor.name).toBe('border-bottom-color');
        expect(borderLeftColor.name).toBe('border-left-color');
    });
    it('have defined initialValues', () => {
        [borderTopColor, borderRightColor, borderBottomColor, borderLeftColor].forEach((desc) => {
            expect(desc.initialValue).toBeDefined();
        });
    });
});

// --- border-image-slice ---
import { borderImageSlice } from '../border-image-slice';
describe('border-image-slice descriptor', () => {
    it('has correct name', () => expect(borderImageSlice.name).toBe('border-image-slice'));
    it('has defined initialValue', () => expect(borderImageSlice.initialValue).toBeDefined());
});

// --- border-image-source ---
import { borderImageSource } from '../border-image-source';
describe('border-image-source descriptor', () => {
    it('has correct name', () => expect(borderImageSource.name).toBe('border-image-source'));
    it('has defined initialValue', () => expect(borderImageSource.initialValue).toBeDefined());
});

// --- color ---
import { color } from '../color';
describe('color descriptor', () => {
    it('has correct name', () => expect(color.name).toBe('color'));
    it('has defined initialValue', () => expect(color.initialValue).toBeDefined());
    it('is TYPE_VALUE descriptor', () => {
        expect(color.type).toBeDefined();
    });
});

// --- letter-spacing ---
import { letterSpacing } from '../letter-spacing';
describe('letter-spacing descriptor', () => {
    it('has correct name', () => expect(letterSpacing.name).toBe('letter-spacing'));
    it('has defined initialValue', () => expect(letterSpacing.initialValue).toBeDefined());
});

// --- line-height ---
import { lineHeight } from '../line-height';
describe('line-height descriptor', () => {
    it('has correct name', () => expect(lineHeight.name).toBe('line-height'));
    it('has defined initialValue', () => expect(lineHeight.initialValue).toBeDefined());
});

// --- margin descriptors ---
import { marginTop, marginRight, marginBottom, marginLeft } from '../margin';
describe('margin descriptors', () => {
    it('have correct names', () => {
        expect(marginTop.name).toBe('margin-top');
        expect(marginRight.name).toBe('margin-right');
        expect(marginBottom.name).toBe('margin-bottom');
        expect(marginLeft.name).toBe('margin-left');
    });
    it('have defined initialValues', () => {
        [marginTop, marginRight, marginBottom, marginLeft].forEach((desc) => {
            expect(desc.initialValue).toBeDefined();
        });
    });
});

// --- padding descriptors ---
import { paddingTop, paddingRight, paddingBottom, paddingLeft } from '../padding';
describe('padding descriptors', () => {
    it('have correct names', () => {
        expect(paddingTop.name).toBe('padding-top');
        expect(paddingRight.name).toBe('padding-right');
        expect(paddingBottom.name).toBe('padding-bottom');
        expect(paddingLeft.name).toBe('padding-left');
    });
    it('have defined initialValues', () => {
        [paddingTop, paddingRight, paddingBottom, paddingLeft].forEach((desc) => {
            expect(desc.initialValue).toBeDefined();
        });
    });
});

// --- text-shadow ---
import { textShadow } from '../text-shadow';
describe('text-shadow descriptor', () => {
    it('has correct name', () => expect(textShadow.name).toBe('text-shadow'));
    it('has defined initialValue', () => expect(textShadow.initialValue).toBeDefined());
});

// --- text-decoration-color ---
import { textDecorationColor } from '../text-decoration-color';
describe('text-decoration-color descriptor', () => {
    it('has correct name', () => expect(textDecorationColor.name).toBe('text-decoration-color'));
    it('has defined initialValue', () => expect(textDecorationColor.initialValue).toBeDefined());
});

// --- text-decoration-thickness ---
import { textDecorationThickness } from '../text-decoration-thickness';
describe('text-decoration-thickness descriptor', () => {
    it('has correct name', () => expect(textDecorationThickness.name).toBe('text-decoration-thickness'));
    it('has defined initialValue', () => expect(textDecorationThickness.initialValue).toBeDefined());
});

// --- text-underline-offset ---
import { textUnderlineOffset } from '../text-underline-offset';
describe('text-underline-offset descriptor', () => {
    it('has correct name', () => expect(textUnderlineOffset.name).toBe('text-underline-offset'));
    it('has defined initialValue', () => expect(textUnderlineOffset.initialValue).toBeDefined());
});

// --- transform ---
import { transform } from '../transform';
describe('transform descriptor', () => {
    it('has correct name', () => expect(transform.name).toBe('transform'));
    it('has defined initialValue', () => expect(transform.initialValue).toBeDefined());
});

// --- transform-origin ---
import { transformOrigin } from '../transform-origin';
describe('transform-origin descriptor', () => {
    it('has correct name', () => expect(transformOrigin.name).toBe('transform-origin'));
    it('has defined initialValue', () => expect(transformOrigin.initialValue).toBeDefined());
});

// --- rotate ---
import { rotate } from '../rotate';
describe('rotate descriptor', () => {
    it('has correct name', () => expect(rotate.name).toBe('rotate'));
    it('has defined initialValue', () => expect(rotate.initialValue).toBeDefined());
});

// --- z-index ---
import { zIndex } from '../z-index';
describe('z-index descriptor', () => {
    it('has correct name', () => expect(zIndex.name).toBe('z-index'));
    it('has defined initialValue', () => expect(zIndex.initialValue).toBeDefined());
});

// --- zoom ---
import { zoom } from '../zoom';
describe('zoom descriptor', () => {
    it('has correct name', () => expect(zoom.name).toBe('zoom'));
    it('has defined initialValue', () => expect(zoom.initialValue).toBeDefined());
});

// --- clip-path ---
import { clipPath } from '../clip-path';
describe('clip-path descriptor', () => {
    it('has correct name', () => expect(clipPath.name).toBe('clip-path'));
    it('has defined initialValue', () => expect(clipPath.initialValue).toBeDefined());
});

// --- content ---
import { content } from '../content';
describe('content descriptor', () => {
    it('has correct name', () => expect(content.name).toBe('content'));
    it('has defined initialValue', () => expect(content.initialValue).toBeDefined());
});

// --- counter-increment ---
import { counterIncrement } from '../counter-increment';
describe('counter-increment descriptor', () => {
    it('has correct name', () => expect(counterIncrement.name).toBe('counter-increment'));
    it('has defined initialValue', () => expect(counterIncrement.initialValue).toBeDefined());
});

// --- counter-reset ---
import { counterReset } from '../counter-reset';
describe('counter-reset descriptor', () => {
    it('has correct name', () => expect(counterReset.name).toBe('counter-reset'));
    it('has defined initialValue', () => expect(counterReset.initialValue).toBeDefined());
});

// --- duration descriptor ---
// NOTE: The duration module exports a single 'duration' descriptor, not separate
// animationDuration / transitionDuration exports as originally templated.
import { duration } from '../duration';
describe('duration descriptor', () => {
    it('has correct name', () => expect(duration.name).toBe('duration'));
    it('has defined initialValue', () => expect(duration.initialValue).toBeDefined());
});

// --- list-style-image ---
import { listStyleImage } from '../list-style-image';
describe('list-style-image descriptor', () => {
    it('has correct name', () => expect(listStyleImage.name).toBe('list-style-image'));
    it('has defined initialValue', () => expect(listStyleImage.initialValue).toBeDefined());
});

// --- opacity ---
import { opacity } from '../opacity';
describe('opacity descriptor', () => {
    it('has correct name', () => expect(opacity.name).toBe('opacity'));
    it('has defined initialValue', () => expect(opacity.initialValue).toBeDefined());
});

// --- paint-order ---
import { paintOrder } from '../paint-order';
describe('paint-order descriptor', () => {
    it('has correct name', () => expect(paintOrder.name).toBe('paint-order'));
    it('has defined initialValue', () => expect(paintOrder.initialValue).toBeDefined());
});

// --- quotes ---
import { quotes } from '../quotes';
describe('quotes descriptor', () => {
    it('has correct name', () => expect(quotes.name).toBe('quotes'));
    it('has defined initialValue', () => expect(quotes.initialValue).toBeDefined());
});

// --- webkit-line-clamp ---
import { webkitLineClamp } from '../webkit-line-clamp';
describe('webkit-line-clamp descriptor', () => {
    it('has correct name', () => expect(webkitLineClamp.name).toBe('-webkit-line-clamp'));
    it('has defined initialValue', () => expect(webkitLineClamp.initialValue).toBeDefined());
});

// --- webkit-text-stroke-color ---
import { webkitTextStrokeColor } from '../webkit-text-stroke-color';
describe('webkit-text-stroke-color descriptor', () => {
    it('has correct name', () => expect(webkitTextStrokeColor.name).toBe('-webkit-text-stroke-color'));
    it('has defined initialValue', () => expect(webkitTextStrokeColor.initialValue).toBeDefined());
});

// --- webkit-text-stroke-width ---
import { webkitTextStrokeWidth } from '../webkit-text-stroke-width';
describe('webkit-text-stroke-width descriptor', () => {
    it('has correct name', () => expect(webkitTextStrokeWidth.name).toBe('-webkit-text-stroke-width'));
    it('has defined initialValue', () => expect(webkitTextStrokeWidth.initialValue).toBeDefined());
});
