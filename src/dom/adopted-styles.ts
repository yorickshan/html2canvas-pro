/**
 * Constructable stylesheet cloning (adoptedStyleSheets).
 *
 * `adoptedStyleSheets` on a Document or ShadowRoot is the standard way Lit,
 * React and other frameworks inject component styles, but the sheets are not
 * part of the node tree — cloneNode never carries them. A shadow root that
 * relies on adopted sheets (and whose computed styles are not inlined per
 * element, i.e. copyStyles is false) would otherwise lose those rules in the
 * clone. The rules are re-materialised as a regular <style> element, which
 * also cascades last like the spec treats adopted sheets.
 */

/**
 * Serialize the CSS rules of the given sheets into one stylesheet string.
 * Sheets that cannot be read (e.g. detached) are skipped rather than failing
 * the render.
 */
export const serializeStyleSheetRules = (sheets: readonly CSSStyleSheet[]): string => {
    let css = '';
    for (const sheet of sheets) {
        try {
            const rules = sheet.cssRules;
            for (let i = 0; i < rules.length; i++) {
                const rule = rules[i];
                if (rule && typeof rule.cssText === 'string') {
                    css += rule.cssText;
                }
            }
        } catch (e) {
            // Unreadable sheet (SecurityError or detached): skip it.
        }
    }
    return css;
};

/**
 * Build a <style> element carrying the rules of the given adopted sheets, or
 * null when there is nothing to clone. `styleDocument` must be the document
 * the clone lives in.
 */
export const createAdoptedStylesElement = (
    styleDocument: Document,
    sheets: readonly CSSStyleSheet[],
    nonce?: string
): HTMLStyleElement | null => {
    const css = serializeStyleSheetRules(sheets);
    if (!css) {
        return null;
    }
    const style = styleDocument.createElement('style');
    style.textContent = css;
    if (nonce) {
        style.nonce = nonce;
    }
    return style;
};
