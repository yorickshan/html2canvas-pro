import { describe, it, expect } from 'vitest';
import { Context } from '../../../core/context';
import { OLElementContainer } from '../ol-element-container';
import { LIElementContainer } from '../li-element-container';
import { SelectElementContainer } from '../select-element-container';
import { TextareaElementContainer } from '../textarea-element-container';
import { Html2CanvasConfig } from '../../../config';
import { Bounds } from '../../../css/layout/bounds';

function createMockWindow() {
    return {
        document: {
            createElement: (_name: string) => {
                let _href = '';
                return {
                    set href(value: string) {
                        _href = value;
                    },
                    get href() {
                        return _href;
                    },
                    get protocol() {
                        return 'http:';
                    },
                    get hostname() {
                        return 'localhost';
                    },
                    get port() {
                        return '';
                    }
                };
            }
        },
        location: { href: 'http://localhost/' },
        getComputedStyle: () =>
            ({
                animationDuration: '1s',
                transform: 'rotate(45deg)',
                rotate: '45deg',
                display: 'block',
                position: 'static'
            }) as CSSStyleDeclaration
    } as unknown as Window;
}

function createMockContext(): Context {
    const mockWindow = createMockWindow();
    const config = new Html2CanvasConfig({ window: mockWindow });
    return new Context(
        {
            logging: false,
            imageTimeout: 10000,
            useCORS: false,
            allowTaint: false
        },
        new Bounds(0, 0, 800, 600),
        config
    );
}

describe('OLElementContainer', () => {
    it('constructs with start and reversed properties', () => {
        const ol = document.createElement('ol');
        ol.setAttribute('start', '5');
        ol.setAttribute('reversed', '');
        const container = new OLElementContainer(createMockContext(), ol as HTMLOListElement);
        expect(container.start).toBe(5);
        expect(container.reversed).toBe(true);
    });

    it('default start is 1', () => {
        const ol = document.createElement('ol');
        const container = new OLElementContainer(createMockContext(), ol as HTMLOListElement);
        expect(container.start).toBe(1);
        expect(container.reversed).toBe(false);
    });
});

describe('LIElementContainer', () => {
    it('constructs with value property', () => {
        const li = document.createElement('li');
        li.setAttribute('value', '10');
        const container = new LIElementContainer(createMockContext(), li as HTMLLIElement);
        expect(container.value).toBe(10);
    });

    it('default value is 0', () => {
        const li = document.createElement('li');
        const container = new LIElementContainer(createMockContext(), li as HTMLLIElement);
        expect(container.value).toBe(0);
    });
});

describe('SelectElementContainer', () => {
    it('constructs with value property from selected option', () => {
        const select = document.createElement('select');
        const option = document.createElement('option');
        option.text = 'test-value';
        option.selected = true;
        select.appendChild(option);
        const container = new SelectElementContainer(createMockContext(), select as HTMLSelectElement);
        expect(container.value).toBe('test-value');
    });

    it('falls back to first option text without selected', () => {
        const select = document.createElement('select');
        const option = document.createElement('option');
        option.text = 'First';
        select.appendChild(option);
        const container = new SelectElementContainer(createMockContext(), select as HTMLSelectElement);
        expect(container.value).toBe('First');
    });

    it('defaults to empty string for empty select', () => {
        const select = document.createElement('select');
        const container = new SelectElementContainer(createMockContext(), select as HTMLSelectElement);
        expect(container.value).toBe('');
    });
});

describe('TextareaElementContainer', () => {
    it('constructs with value property', () => {
        const textarea = document.createElement('textarea');
        textarea.value = 'test content';
        const container = new TextareaElementContainer(createMockContext(), textarea as HTMLTextAreaElement);
        expect(container.value).toBe('test content');
    });

    it('defaults to empty string', () => {
        const textarea = document.createElement('textarea');
        const container = new TextareaElementContainer(createMockContext(), textarea as HTMLTextAreaElement);
        expect(container.value).toBe('');
    });
});
