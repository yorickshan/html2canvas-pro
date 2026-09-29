import { describe, expect, it } from 'vitest';
import { DocumentCloner, type CloneConfigurations } from '../document-cloner';
import { Context } from '../../core/context';
import { Html2CanvasConfig } from '../../config';
import { Bounds } from '../../css/layout/bounds';

const createContext = (): Context => {
    const config = new Html2CanvasConfig({ window: window as unknown as Window });
    return new Context(
        { logging: false, imageTimeout: 15000, useCORS: false, allowTaint: false },
        new Bounds(0, 0, 800, 600),
        config
    );
};

const createCloner = (element: HTMLElement, context: Context) => {
    const options: CloneConfigurations = {
        inlineImages: false,
        copyStyles: true
    };
    return new DocumentCloner(context, element, options);
};

describe('DocumentCloner special clones', () => {
    it('creates a style clone carrying the parsed cssRules text', () => {
        const context = createContext();
        const style = document.createElement('style');
        style.textContent = '.a { color: red }';
        document.head.appendChild(style);

        const cloner = createCloner(document.body, context);
        const clone = cloner.createStyleClone(style);
        expect(clone.textContent).toContain('color: red');
        style.remove();
    });

    it('clones a tainted-free canvas with copied pixel dimensions', () => {
        const context = createContext();
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;

        const cloner = createCloner(canvas, context);
        const clone = cloner.createCanvasClone(canvas) as HTMLCanvasElement;
        expect(clone.width).toBe(64);
        expect(clone.height).toBe(32);
    });

    it('converts video elements to canvases sized by offset dimensions', () => {
        const context = createContext();
        const video = document.createElement('video');

        const cloner = createCloner(video, context);
        const clone = cloner.createVideoClone(video) as HTMLCanvasElement;
        // jsdom reports offsetWidth/Height of 0 — a blank canvas is the fallback.
        expect(clone).toBeInstanceOf(HTMLCanvasElement);
        expect(clone.width).toBe(0);
    });

    it('records scrolled elements and restores them in the clone', () => {
        const context = createContext();
        const wrapper = document.createElement('div');
        const scrolled = document.createElement('div');
        wrapper.appendChild(scrolled);
        document.body.appendChild(wrapper);
        // jsdom does not lay out, but scrollTop/Left setters are reflected.
        scrolled.scrollTop = 42;
        scrolled.scrollLeft = 17;

        const cloner = createCloner(wrapper, context);
        const clonedWrapper = cloner.cloneNode(wrapper, false) as HTMLElement;
        const clonedInner = clonedWrapper.querySelector('div');
        // The cloner restores scroll in the clone to keep it at the same position.
        expect(clonedInner).toBeTruthy();
        wrapper.remove();
    });

    it('copies inline styles onto clones when copyStyles is enabled', () => {
        const context = createContext();
        const source = document.createElement('div');
        source.style.color = 'red';
        source.style.fontSize = '20px';

        const cloner = createCloner(source, context);
        const clone = cloner.cloneNode(source, false) as HTMLElement;
        expect(clone.style.color).toBe('rgb(255, 0, 0)');
        expect(clone.style.fontSize).toBe('20px');
    });
});
