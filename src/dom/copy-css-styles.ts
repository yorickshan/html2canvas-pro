/**
 * Computed-style copying for cloned elements.
 *
 * copyCSSStyles copies every computed CSS property of the source element onto
 * the clone's inline style so the clone renders identically without
 * stylesheets (the clone iframe only carries the <style> tags the cloner could
 * read). copySVGStyles copies the much smaller set that SVG content needs.
 */

const ignoredStyleProperties = [
    'all', // #2476
    'd', // #2483
    'content' // Safari shows pseudoelements if content is set
];

export const copyCSSStyles = <T extends HTMLElement | SVGElement>(style: CSSStyleDeclaration, target: T): T => {
    const parts: string[] = [];
    for (let i = style.length - 1; i >= 0; i--) {
        const property = style.item(i);
        // fix: Chrome_138 ignore custom properties
        if (ignoredStyleProperties.indexOf(property) === -1 && !property.startsWith('--')) {
            const value = style.getPropertyValue(property);
            if (value) {
                const priority = style.getPropertyPriority(property);
                parts.push(priority ? `${property}:${value} !${priority}` : `${property}:${value}`);
            }
        }
    }
    if (parts.length > 0) {
        target.style.cssText = parts.join(';') + ';';
    }
    return target;
};

/**
 * The computed properties that can change how SVG content renders once the
 * <svg> is serialized to a standalone image (SVGElementContainer). Copying
 * all ~800 computed properties onto every <svg>, <path>, <circle>, ...
 * dominated clone time on icon-heavy pages, while the rest (box model,
 * flex/grid, backgrounds, borders, scrolling, animation, ...) has no effect
 * on SVG content. The outer <svg>'s own box is laid out and painted by
 * html2canvas from the clone document, like any HTML element; inlining those
 * properties too made the image paint its border/background/padding a second
 * time inside the box.
 *
 * Inherited properties are listed too: the serialized image no longer sees
 * the page's stylesheets, so each element carries its resolved value.
 * Longhands are preferred over shorthands so the copied values round-trip
 * in every engine. `d` stays excluded (#2483), as in copyCSSStyles.
 */
export const SVG_STYLE_PROPERTIES: readonly string[] = [
    // paint
    'color',
    'fill',
    'fill-opacity',
    'fill-rule',
    'stroke',
    'stroke-width',
    'stroke-opacity',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-dasharray',
    'stroke-dashoffset',
    'paint-order',
    'vector-effect',
    'marker-start',
    'marker-mid',
    'marker-end',
    'stop-color',
    'stop-opacity',
    'flood-color',
    'flood-opacity',
    'lighting-color',
    'color-interpolation',
    'color-interpolation-filters',
    'shape-rendering',
    'text-rendering',
    'image-rendering',
    // visibility, clipping and compositing
    'display',
    'visibility',
    'opacity',
    'overflow-x',
    'overflow-y',
    'clip-path',
    'clip-rule',
    'mask-image',
    'mask-mode',
    'mask-repeat',
    'mask-position',
    'mask-clip',
    'mask-origin',
    'mask-size',
    'mask-composite',
    'mask-type',
    'filter',
    'mix-blend-mode',
    'isolation',
    // transforms
    'transform',
    'transform-origin',
    'transform-box',
    'translate',
    'rotate',
    'scale',
    // geometry properties (SVG 2)
    'x',
    'y',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'width',
    'height',
    // text
    'font-family',
    'font-size',
    'font-size-adjust',
    'font-style',
    'font-weight',
    'font-stretch',
    'font-variant-caps',
    'font-variant-ligatures',
    'font-variant-numeric',
    'font-variant-east-asian',
    'font-variant-position',
    'font-variant-alternates',
    'font-kerning',
    'font-feature-settings',
    'font-variation-settings',
    'font-optical-sizing',
    'letter-spacing',
    'word-spacing',
    'text-anchor',
    'dominant-baseline',
    'alignment-baseline',
    'baseline-shift',
    'text-decoration-line',
    'text-decoration-color',
    'text-decoration-style',
    'text-decoration-thickness',
    'text-transform',
    'white-space',
    'writing-mode',
    'text-orientation',
    'direction',
    'unicode-bidi'
];

/**
 * Copies only SVG_STYLE_PROPERTIES onto an SVG element clone. The values
 * are appended to the clone's own inline declarations (rather than replacing
 * them as copyCSSStyles does), so they win where both are set and nothing the
 * original's style attribute declared is lost.
 */
export const copySVGStyles = <T extends SVGElement>(style: CSSStyleDeclaration, target: T): T => {
    const parts: string[] = [];
    for (const property of SVG_STYLE_PROPERTIES) {
        const value = style.getPropertyValue(property);
        if (value) {
            parts.push(`${property}:${value}`);
        }
    }
    if (parts.length > 0) {
        const inline = target.style.cssText.trim();
        const separator = inline === '' || inline.endsWith(';') ? '' : ';';
        target.style.cssText = `${inline}${separator}${parts.join(';')};`;
    }
    return target;
};
