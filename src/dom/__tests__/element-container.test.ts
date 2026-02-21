import { strictEqual, ok } from 'assert';
import { ElementContainer, ElementContainerOptions } from '../element-container';
import { Context } from '../../core/context';
import { Bounds } from '../../css/layout/bounds';
import { Html2CanvasConfig } from '../../config';

describe('ElementContainer', () => {
    let context: Context;
    let mockElement: HTMLElement;

    beforeEach(() => {
        const mockWindow = {
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

        const config = new Html2CanvasConfig({ window: mockWindow });
        context = new Context(
            {
                logging: false,
                imageTimeout: 15000,
                useCORS: false,
                allowTaint: false
            },
            new Bounds(0, 0, 800, 600),
            config
        );

        mockElement = {
            nodeType: 1,
            tagName: 'DIV',
            style: {
                animationDuration: '1s',
                transform: 'rotate(45deg)',
                rotate: '45deg'
            },
            getAttribute: () => null,
            getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                width: 100,
                height: 100,
                right: 100,
                bottom: 100
            })
        } as unknown as HTMLElement;
    });

    it('should normalize DOM by default', () => {
        const container = new ElementContainer(context, mockElement);

        ok(container.styles);
        ok(container.bounds);
        // DOM should be normalized (animationDuration set to '0s')
        strictEqual(mockElement.style.animationDuration, '0s');
    });

    it('should not normalize DOM when normalizeDom is false', () => {
        const originalAnimation = mockElement.style.animationDuration;
        const options: ElementContainerOptions = {
            normalizeDom: false
        };

        const container = new ElementContainer(context, mockElement, options);

        ok(container.styles);
        ok(container.bounds);
        // DOM should NOT be normalized
        strictEqual(mockElement.style.animationDuration, originalAnimation);
    });

    it('should support explicit normalizeDom: true', () => {
        const options: ElementContainerOptions = {
            normalizeDom: true
        };

        const container = new ElementContainer(context, mockElement, options);

        ok(container.styles);
        ok(container.bounds);
        strictEqual(mockElement.style.animationDuration, '0s');
    });

    it('should initialize empty arrays for textNodes and elements', () => {
        const container = new ElementContainer(context, mockElement);

        ok(Array.isArray(container.textNodes));
        ok(Array.isArray(container.elements));
        strictEqual(container.textNodes.length, 0);
        strictEqual(container.elements.length, 0);
    });

    it('should initialize flags to 0', () => {
        const container = new ElementContainer(context, mockElement);

        strictEqual(container.flags, 0);
    });
});
