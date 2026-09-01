import { describe, it, expect } from 'vitest';
import { serializeWithoutBoxOffsets } from '../svg-element-container';

const svgWithStyle = (style: string | null): SVGSVGElement => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    if (style !== null) {
        svg.setAttribute('style', style);
    }
    svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'circle'));

    return svg;
};

const serialize = (style: string | null): { markup: string; svg: SVGSVGElement } => {
    const svg = svgWithStyle(style);

    return { markup: serializeWithoutBoxOffsets(new XMLSerializer(), svg), svg };
};

describe('serializeWithoutBoxOffsets', () => {
    it('drops the inset declarations', () => {
        const { markup } = serialize('position:absolute;left:-40px;top:-40px;');

        expect(markup).not.toContain('position');
        expect(markup).not.toContain('left');
        expect(markup).not.toContain('top');
    });

    it('drops margins, shorthand and longhand alike', () => {
        expect(serialize('margin-left:-40px;margin-top:-40px;').markup).not.toContain('margin');
        expect(serialize('margin:-40px 0px 0px -40px;').markup).not.toContain('margin');
    });

    it('drops the logical offsets a computed style carries alongside the physical ones', () => {
        expect(serialize('margin-inline:-40px 0px;margin-block:-40px 0px;').markup).not.toContain('margin');
        expect(serialize('inset-inline:-40px;inset-block:-40px;').markup).not.toContain('inset');
    });

    it('keeps declarations that do not move the box', () => {
        const { markup } = serialize('left:-40px;overflow:visible;opacity:0.5;');

        expect(markup).not.toContain('left');
        expect(markup).toContain('overflow: visible');
        expect(markup).toContain('opacity: 0.5');
    });

    it('keeps the contents', () => {
        expect(serialize('left:-40px;').markup).toContain('<circle');
    });

    it('restores the style attribute it borrowed', () => {
        const { svg } = serialize('position:absolute;left:-40px;');

        expect(svg.getAttribute('style')).toBe('position:absolute;left:-40px;');
    });

    it('leaves an unstyled element without a style attribute', () => {
        const { svg } = serialize(null);

        expect(svg.hasAttribute('style')).toBe(false);
    });
});
