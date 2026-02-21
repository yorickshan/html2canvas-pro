import { deepStrictEqual } from 'assert';
import { Parser } from '../../syntax/parser';
import { backgroundImage } from '../background-image';
import { CSSImageType } from '../../types/image';
import { pack } from '../../types/color-utilities';
import { deg } from '../../types/angle';

jest.mock('../../../core/context');
import { Context } from '../../../core/context';

jest.mock('../../../core/features');

const backgroundImageParse = (context: Context, value: string) =>
    backgroundImage.parse(context, Parser.parseValues(value));

import { Html2CanvasConfig } from '../../../config';

describe('property-descriptors', () => {
    let context: Context;
    beforeEach(() => {
        const mockWindow = {
            location: { href: 'http://example.com' },
            document: { createElement: () => ({ href: '' }) }
        } as any;
        const config = new Html2CanvasConfig({ window: mockWindow });
        context = new Context({} as any, {} as any, config);
    });
    describe('background-image', () => {
        it('none', () => {
            deepStrictEqual(backgroundImageParse(context, 'none'), []);
            expect(context.cache.addImage).not.toHaveBeenCalled();
        });

        it('url(test.jpg), url(test2.jpg)', () => {
            deepStrictEqual(
                backgroundImageParse(context, 'url(http://example.com/test.jpg), url(http://example.com/test2.jpg)'),
                [
                    { url: 'http://example.com/test.jpg', type: CSSImageType.URL },
                    { url: 'http://example.com/test2.jpg', type: CSSImageType.URL }
                ]
            );
            expect(context.cache.addImage).toHaveBeenCalledWith('http://example.com/test.jpg');
            expect(context.cache.addImage).toHaveBeenCalledWith('http://example.com/test2.jpg');
        });

        it(`linear-gradient(to bottom, rgba(255,255,0,0.5), rgba(0,0,255,0.5)), url('https://html2canvas.hertzen.com')`, () =>
            deepStrictEqual(
                backgroundImageParse(
                    context,
                    `linear-gradient(to bottom, rgba(255,255,0,0.5), rgba(0,0,255,0.5)), url('https://html2canvas.hertzen.com')`
                ),
                [
                    {
                        angle: deg(180),
                        type: CSSImageType.LINEAR_GRADIENT,
                        stops: [
                            { color: pack(255, 255, 0, 0.5), stop: null },
                            { color: pack(0, 0, 255, 0.5), stop: null }
                        ]
                    },
                    { url: 'https://html2canvas.hertzen.com', type: CSSImageType.URL }
                ]
            ));
    });
});
