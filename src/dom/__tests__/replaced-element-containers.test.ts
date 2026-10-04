import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputElementContainer } from '../replaced-elements/input-element-container';
import { ImageElementContainer } from '../replaced-elements/image-element-container';
import { CanvasElementContainer } from '../replaced-elements/canvas-element-container';
import { IFrameElementContainer } from '../replaced-elements/iframe-element-container';
import { Context } from '../../core/context';
import { Html2CanvasConfig } from '../../config';
import { BACKGROUND_CLIP } from '../../css/property-descriptors/background-clip';
import { BACKGROUND_ORIGIN } from '../../css/property-descriptors/background-origin';
import { TokenType } from '../../css/syntax/tokenizer';
import { BORDER_STYLE } from '../../css/property-descriptors/border-style';

const createRealContext = (): Context => {
    const config = new Html2CanvasConfig({ window: window as unknown as Window });
    return new Context(
        { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
        { left: 0, top: 0, width: 800, height: 600 } as never,
        config
    );
};

describe('InputElementContainer', () => {
    let context: Context;
    const addImage = vi.fn();

    beforeEach(() => {
        context = createRealContext();
        (context as unknown as { cache: { addImage: typeof addImage } }).cache = { addImage };
        addImage.mockClear();
    });

    it('captures text input value and type', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = 'hello';

        const container = new InputElementContainer(context, input);
        expect(container.type).toBe('text');
        expect(container.checked).toBe(false);
        expect(container.value).toBe('hello');
        expect(container.isPlaceholder).toBe(false);
    });

    it('masks password input values', () => {
        const input = document.createElement('input');
        input.type = 'password';
        input.value = 'secret';

        const container = new InputElementContainer(context, input);
        expect(container.type).toBe('password');
        expect(container.value).toBe('\u2022\u2022\u2022\u2022\u2022\u2022');
    });

    it('detects placeholder-only inputs and colors them', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Type here';

        const container = new InputElementContainer(context, input);
        expect(container.isPlaceholder).toBe(true);
        expect(container.value).toBe('Type here');
    });

    it('styles checkboxes with solid borders and border-box clip', () => {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = true;

        const container = new InputElementContainer(context, input);
        expect(container.checked).toBe(true);
        expect(container.styles.borderTopStyle).toBe(BORDER_STYLE.SOLID);
        expect(container.styles.backgroundColor).toBe(0xdededeff);
        expect(container.styles.backgroundClip).toEqual([BACKGROUND_CLIP.BORDER_BOX]);
        expect(container.styles.backgroundOrigin).toEqual([BACKGROUND_ORIGIN.BORDER_BOX]);
    });

    it('gives radio inputs a circular border-radius token', () => {
        const input = document.createElement('input');
        input.type = 'radio';

        const container = new InputElementContainer(context, input);
        expect(container.styles.borderTopLeftRadius[0]?.type).toBe(TokenType.PERCENTAGE_TOKEN);
        expect(container.styles.borderTopLeftRadius[0]?.number).toBe(50);
    });

    it('leaves non-checkable inputs untouched', () => {
        const input = document.createElement('input');
        input.type = 'text';

        const container = new InputElementContainer(context, input);
        expect(container.styles.borderTopStyle).not.toBe(BORDER_STYLE.SOLID);
    });
});

describe('ImageElementContainer', () => {
    it('records src and intrinsic dimensions and queues the image load', () => {
        const context = createRealContext();
        const addImage = vi.fn();
        (context as unknown as { cache: { addImage: typeof addImage } }).cache = { addImage };

        const img = document.createElement('img');
        img.src = 'http://localhost/picture.png';
        Object.defineProperty(img, 'naturalWidth', { value: 320 });
        Object.defineProperty(img, 'naturalHeight', { value: 240 });

        const container = new ImageElementContainer(context, img);
        expect(container.src).toBe('http://localhost/picture.png');
        expect(container.intrinsicWidth).toBe(320);
        expect(container.intrinsicHeight).toBe(240);
        expect(addImage).toHaveBeenCalledWith('http://localhost/picture.png');
    });

    it('prefers currentSrc over src (responsive images)', () => {
        const context = createRealContext();
        (context as unknown as { cache: { addImage: ReturnType<typeof vi.fn> } }).cache = { addImage: vi.fn() };

        const img = document.createElement('img');
        img.src = 'http://localhost/small.png';
        Object.defineProperty(img, 'currentSrc', { value: 'http://localhost/large.png' });

        const container = new ImageElementContainer(context, img);
        expect(container.src).toBe('http://localhost/large.png');
    });
});

describe('CanvasElementContainer', () => {
    it('records canvas intrinsic dimensions', () => {
        const context = createRealContext();
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;

        const container = new CanvasElementContainer(context, canvas);
        expect(container.intrinsicWidth).toBe(640);
        expect(container.intrinsicHeight).toBe(480);
    });
});

describe('IFrameElementContainer', () => {
    const createContext = (): {
        context: Context;
        onError: ReturnType<typeof vi.fn>;
        warn: ReturnType<typeof vi.fn>;
    } => {
        const context = createRealContext();
        const onError = vi.fn();
        const warn = vi.fn();
        (context as unknown as { onError: (e: Error) => void }).onError = onError;
        (context as unknown as { logger: unknown }).logger = { warn, error: vi.fn(), info: vi.fn(), debug: vi.fn() };
        return { context, onError, warn };
    };

    it('reports cross-origin iframe access failures via onError instead of failing silently', () => {
        const { context, onError, warn } = createContext();
        const iframe = document.createElement('iframe');
        iframe.src = 'https://cross-origin.example/frame';
        Object.defineProperty(iframe, 'contentWindow', {
            get() {
                throw new DOMException(
                    'Blocked a frame with origin from accessing a cross-origin frame.',
                    'SecurityError'
                );
            }
        });

        const container = new IFrameElementContainer(context, iframe);

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain('https://cross-origin.example/frame');
        expect(container.tree).toBeUndefined();
    });

    it('reports same-origin access failures on the content document', () => {
        const { context, onError } = createContext();
        const iframe = document.createElement('iframe');
        Object.defineProperty(iframe, 'contentWindow', {
            get: () => ({
                get document(): Document {
                    throw new Error('document access denied');
                }
            })
        });

        const container = new IFrameElementContainer(context, iframe);

        expect(onError).toHaveBeenCalledTimes(1);
        expect((onError.mock.calls[0][0] as Error).message).toBe('document access denied');
        expect(container.tree).toBeUndefined();
    });

    it('stays silent when the iframe has no content window yet', () => {
        const { context, onError } = createContext();
        const iframe = document.createElement('iframe');

        expect(() => new IFrameElementContainer(context, iframe)).not.toThrow();
        expect(onError).not.toHaveBeenCalled();
    });
});
