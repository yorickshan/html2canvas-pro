import { strictEqual } from 'assert';
import { DOMNormalizer } from '../dom-normalizer';
import { CSSParsedDeclaration } from '../../css';
import { Context } from '../../core/context';
import { Bounds } from '../../css/layout/bounds';
import { Html2CanvasConfig } from '../../config';

describe('DOMNormalizer', () => {
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
            getComputedStyle: () => ({
                animationDuration: '1s',
                transform: 'rotate(45deg)',
                rotate: '45deg'
            })
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

        // Create a mock HTMLElement with style property
        mockElement = {
            nodeType: 1, // Node.ELEMENT_NODE
            tagName: 'DIV',
            style: {
                animationDuration: '1s',
                transform: 'rotate(45deg)',
                rotate: '45deg'
            }
        } as unknown as HTMLElement;
    });

    it('should disable animations on element', () => {
        const styles = new CSSParsedDeclaration(context, {
            animationDuration: '1s',
            transform: null,
            rotate: null
        } as any);

        DOMNormalizer.normalizeElement(mockElement, styles);

        strictEqual(mockElement.style.animationDuration, '0s');
    });

    it('should replace transform with identity translate (preserves containing block, Issue #101)', () => {
        const styles = new CSSParsedDeclaration(context, {
            animationDuration: '0s',
            transform: 'rotate(45deg)',
            rotate: null
        } as any);

        DOMNormalizer.normalizeElement(mockElement, styles);

        strictEqual(mockElement.style.transform, 'translate(0, 0)');
    });

    it('should replace rotate with 0deg (preserves containing block, Issue #101)', () => {
        const styles = new CSSParsedDeclaration(context, {
            animationDuration: '0s',
            transform: null,
            rotate: '45deg'
        } as any);

        DOMNormalizer.normalizeElement(mockElement, styles);

        strictEqual(mockElement.style.rotate, '0deg');
    });

    it('should normalize all properties when all are set', () => {
        const styles = new CSSParsedDeclaration(context, {
            animationDuration: '2s',
            transform: 'rotate(90deg)',
            rotate: '90deg'
        } as any);

        DOMNormalizer.normalizeElement(mockElement, styles);

        strictEqual(mockElement.style.animationDuration, '0s');
        strictEqual(mockElement.style.transform, 'translate(0, 0)');
        strictEqual(mockElement.style.rotate, '0deg');
    });

    it('should not modify element if it is not an HTMLElement', () => {
        const svgElement = {
            nodeType: 1,
            tagName: 'svg'
        } as unknown as Element;

        const styles = new CSSParsedDeclaration(context, {
            animationDuration: '1s',
            transform: 'rotate(45deg)',
            rotate: '45deg'
        } as any);

        // Should not throw and should not try to access style
        DOMNormalizer.normalizeElement(svgElement, styles);
    });
});
