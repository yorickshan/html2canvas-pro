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

    it('should initialize stacking context flags to false', () => {
        const container = new ElementContainer(context, mockElement);

        strictEqual(container.createsStackingContext, false);
        strictEqual(container.createsRealStackingContext, false);
        strictEqual(container.isListOwner, false);
    });

    describe('legendBounds (issue #227)', () => {
        it('exposes legend bounds for a fieldset with a legend child', () => {
            const fs = document.createElement('fieldset');
            const legend = document.createElement('legend');
            legend.textContent = 'Legend';
            fs.appendChild(legend);
            document.body.appendChild(fs);
            try {
                const container = new ElementContainer(context, fs);
                ok(container.legendBounds, 'legendBounds should be defined for fieldset with legend');
            } finally {
                document.body.removeChild(fs);
            }
        });

        it('does not expose legend bounds for a fieldset without a legend', () => {
            const fs = document.createElement('fieldset');
            document.body.appendChild(fs);
            try {
                const container = new ElementContainer(context, fs);
                strictEqual(container.legendBounds, undefined);
            } finally {
                document.body.removeChild(fs);
            }
        });

        it('does not expose legend bounds for non-fieldset elements', () => {
            const div = document.createElement('div');
            document.body.appendChild(div);
            try {
                const container = new ElementContainer(context, div);
                strictEqual(container.legendBounds, undefined);
            } finally {
                document.body.removeChild(div);
            }
        });

        it('shifts the fieldset bounds so the top border sits at the legend center', () => {
            // The legend overflows above the fieldset's top border, so Chrome's
            // getBoundingClientRect() top is inflated. The container must shift
            // its bounds down to the legend's vertical center (issue #227).
            const legendMock = {
                nodeType: 1,
                tagName: 'LEGEND',
                style: {},
                getAttribute: () => null,
                getBoundingClientRect: () => ({ left: 20, top: 5, width: 50, height: 20, right: 70, bottom: 25 })
            } as unknown as HTMLElement;
            const fsMock = {
                nodeType: 1,
                tagName: 'FIELDSET',
                style: {},
                getAttribute: () => null,
                querySelector: (sel: string) => (sel === ':scope > legend' ? legendMock : null),
                getBoundingClientRect: () => ({ left: 10, top: 0, width: 100, height: 100, right: 110, bottom: 100 })
            } as unknown as HTMLElement;

            const container = new ElementContainer(context, fsMock);
            // borderTopWidth is 0 in the mock, so the border box top = legend top + half its height = 5 + 10
            strictEqual(container.bounds.left, 10);
            strictEqual(container.bounds.top, 15);
            strictEqual(container.bounds.height, 85);
        });
    });
});
