/**
 * Computed-style copying for cloned elements.
 *
 * Copies every computed CSS property of the source element onto the clone's
 * inline style so the clone renders identically without stylesheets (the
 * clone iframe only carries the <style> tags the cloner could read).
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
