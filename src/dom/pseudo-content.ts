/**
 * Pseudo-element (::before / ::after) content resolution.
 *
 * Extracted from DocumentCloner: the cloner creates surrogate
 * `<html2canvaspseudoelement>` nodes carrying the pseudo's computed styles and
 * resolved content tokens (strings, url() images, attr(), counter(s), and
 * quotes) as children of the cloning element. The hide classes ensure the
 * surrogate itself is never painted; only its children are.
 */

import { isIdentToken, nonFunctionArgSeparator } from '../css/syntax/parser';
import { TokenType } from '../css/syntax/tokenizer';
import { CounterState, createCounterText } from '../css/types/functions/counter';
import { LIST_STYLE_TYPE, listStyleType } from '../css/property-descriptors/list-style-type';
import { CSSParsedCounterDeclaration, CSSParsedPseudoDeclaration } from '../css/index';
import { getQuote } from '../css/property-descriptors/quotes';
import { Context } from '../core/context';
import { copyCSSStyles } from './copy-css-styles';
import { isSVGElementNode } from './node-type-guards';

export enum PseudoElementType {
    BEFORE,
    AFTER
}

const PSEUDO_BEFORE = ':before';
const PSEUDO_AFTER = ':after';
const PSEUDO_HIDE_ELEMENT_CLASS_BEFORE = '___html2canvas___pseudoelement_before';
const PSEUDO_HIDE_ELEMENT_CLASS_AFTER = '___html2canvas___pseudoelement_after';

const PSEUDO_HIDE_ELEMENT_STYLE = `{
    content: "" !important;
    display: none !important;
}`;

/**
 * Inject the stylesheet that hides pseudo-element surrogate containers.
 * Called on the cloned <body> so the surrogates themselves never render.
 */
export const createPseudoHideStyles = (body: HTMLElement, cspNonce?: string): void => {
    createStyles(
        body,
        `.${PSEUDO_HIDE_ELEMENT_CLASS_BEFORE}${PSEUDO_BEFORE}${PSEUDO_HIDE_ELEMENT_STYLE}
         .${PSEUDO_HIDE_ELEMENT_CLASS_AFTER}${PSEUDO_AFTER}${PSEUDO_HIDE_ELEMENT_STYLE}`,
        cspNonce
    );
};

const createStyles = (body: HTMLElement, styles: string, cspNonce?: string): void => {
    const document = body.ownerDocument;
    if (document) {
        const style = document.createElement('style');
        style.textContent = styles;
        if (cspNonce) {
            style.nonce = cspNonce;
        }
        body.appendChild(style);
    }
};

/**
 * Resolves computed `content` of ::before/::after into surrogate DOM nodes.
 *
 * One instance per DocumentCloner: `quoteDepth` tracks open-quote/close-quote
 * pairing across the whole clone walk, shared with the cloner's counter state.
 */
export class PseudoContentResolver {
    private quoteDepth = 0;

    constructor(
        private readonly context: Context,
        private readonly counters: CounterState
    ) {}

    resolvePseudoContent(
        node: Element,
        clone: Element,
        style: CSSStyleDeclaration,
        pseudoElt: PseudoElementType
    ): HTMLElement | void {
        if (!style) {
            return;
        }

        const value = style.content;
        const document = clone.ownerDocument;
        if (!document || !value || value === 'none' || value === '-moz-alt-content' || style.display === 'none') {
            return;
        }

        this.counters.parse(new CSSParsedCounterDeclaration(this.context, style));
        const declaration = new CSSParsedPseudoDeclaration(this.context, style);

        const anonymousReplacedElement = document.createElement('html2canvaspseudoelement');
        copyCSSStyles(style, anonymousReplacedElement);

        declaration.content.forEach((token) => {
            if (token.type === TokenType.STRING_TOKEN) {
                anonymousReplacedElement.appendChild(document.createTextNode(token.value));
            } else if (token.type === TokenType.URL_TOKEN) {
                const img = document.createElement('img');
                img.src = token.value;
                img.style.opacity = '1';
                anonymousReplacedElement.appendChild(img);
            } else if (token.type === TokenType.FUNCTION) {
                if (token.name === 'attr') {
                    const attr = token.values.filter(isIdentToken);
                    if (attr.length && attr[0]) {
                        anonymousReplacedElement.appendChild(
                            document.createTextNode(node.getAttribute(attr[0].value) || '')
                        );
                    }
                } else if (token.name === 'counter') {
                    const [counter, counterStyle] = token.values.filter(nonFunctionArgSeparator);
                    if (counter && isIdentToken(counter)) {
                        const counterState = this.counters.getCounterValue(counter.value);
                        const counterType =
                            counterStyle && isIdentToken(counterStyle)
                                ? listStyleType.parse(this.context, counterStyle.value)
                                : LIST_STYLE_TYPE.DECIMAL;

                        anonymousReplacedElement.appendChild(
                            document.createTextNode(createCounterText(counterState, counterType, false))
                        );
                    }
                } else if (token.name === 'counters') {
                    const [counter, delim, counterStyle] = token.values.filter(nonFunctionArgSeparator);
                    if (counter && isIdentToken(counter)) {
                        const counterStates = this.counters.getCounterValues(counter.value);
                        const counterType =
                            counterStyle && isIdentToken(counterStyle)
                                ? listStyleType.parse(this.context, counterStyle.value)
                                : LIST_STYLE_TYPE.DECIMAL;
                        const separator = delim && delim.type === TokenType.STRING_TOKEN ? delim.value : '';
                        const text = counterStates
                            .map((value) => createCounterText(value, counterType, false))
                            .join(separator);

                        anonymousReplacedElement.appendChild(document.createTextNode(text));
                    }
                }
            } else if (token.type === TokenType.IDENT_TOKEN) {
                switch (token.value) {
                    case 'open-quote':
                        anonymousReplacedElement.appendChild(
                            document.createTextNode(getQuote(declaration.quotes, this.quoteDepth++, true))
                        );
                        break;
                    case 'close-quote': {
                        // Per CSS, close-quote at depth 0 renders nothing and
                        // must not drive the depth negative: an unbalanced
                        // close-quote would otherwise shift every later quote
                        // level by one.
                        const hasOpenQuote = this.quoteDepth > 0;
                        this.quoteDepth = Math.max(0, this.quoteDepth - 1);
                        if (hasOpenQuote) {
                            anonymousReplacedElement.appendChild(
                                document.createTextNode(getQuote(declaration.quotes, this.quoteDepth, false))
                            );
                        }
                        break;
                    }
                    default:
                        // safari doesn't parse string tokens correctly because of lack of quotes
                        anonymousReplacedElement.appendChild(document.createTextNode(token.value));
                }
            }
        });

        anonymousReplacedElement.className = `${PSEUDO_HIDE_ELEMENT_CLASS_BEFORE} ${PSEUDO_HIDE_ELEMENT_CLASS_AFTER}`;
        const newClassName =
            pseudoElt === PseudoElementType.BEFORE
                ? ` ${PSEUDO_HIDE_ELEMENT_CLASS_BEFORE}`
                : ` ${PSEUDO_HIDE_ELEMENT_CLASS_AFTER}`;

        if (isSVGElementNode(clone)) {
            clone.className.baseValue += newClassName;
        } else {
            clone.className += newClassName;
        }

        return anonymousReplacedElement;
    }
}
