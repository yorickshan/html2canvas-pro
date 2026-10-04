import { CSSParsedDeclaration } from '../index';
import { Bounds, parseBounds } from './bounds';
import { FEATURES } from '../../core/features';
import { Context } from '../../core/context';
import { isVerticalWritingMode } from '../property-descriptors/writing-mode';

export class TextBounds {
    readonly text: string;
    readonly bounds: Bounds;

    constructor(text: string, bounds: Bounds) {
        this.text = text;
        this.bounds = bounds;
    }
}

export const parseTextBounds = (
    context: Context,
    value: string,
    styles: CSSParsedDeclaration,
    node: Text
): TextBounds[] => {
    const textList = breakText(value, styles);
    const textBounds: TextBounds[] = [];
    let offset = 0;
    textList.forEach((text) => {
        if (styles.textDecorationLine.length || text.trim().length > 0) {
            if (FEATURES.SUPPORT_RANGE_BOUNDS) {
                const clientRects = createRange(node, offset, text.length).getClientRects();
                if (clientRects.length > 1) {
                    const subSegments = segmentGraphemes(text);
                    let subOffset = 0;
                    subSegments.forEach((subSegment) => {
                        textBounds.push(
                            new TextBounds(
                                subSegment,
                                Bounds.fromDOMRectList(
                                    context,
                                    createRange(node, subOffset + offset, subSegment.length).getClientRects()
                                )
                            )
                        );
                        subOffset += subSegment.length;
                    });
                } else {
                    textBounds.push(new TextBounds(text, Bounds.fromDOMRectList(context, clientRects)));
                }
            } else {
                const replacementNode = node.splitText(text.length);
                textBounds.push(new TextBounds(text, getWrapperBounds(context, node)));
                node = replacementNode;
            }
        } else if (!FEATURES.SUPPORT_RANGE_BOUNDS) {
            node = node.splitText(text.length);
        }
        offset += text.length;
    });

    return textBounds;
};

const getWrapperBounds = (context: Context, node: Text): Bounds => {
    const ownerDocument = node.ownerDocument;
    if (ownerDocument) {
        const wrapper = ownerDocument.createElement('html2canvaswrapper');
        wrapper.appendChild(node.cloneNode(true));
        const parentNode = node.parentNode;
        if (parentNode) {
            parentNode.replaceChild(wrapper, node);
            const bounds = parseBounds(context, wrapper);
            if (wrapper.firstChild) {
                parentNode.replaceChild(wrapper.firstChild, wrapper);
            }
            return bounds;
        }
    }

    return Bounds.EMPTY;
};

const createRange = (node: Text, offset: number, length: number): Range => {
    const ownerDocument = node.ownerDocument;
    if (!ownerDocument) {
        throw new Error('Node has no owner document');
    }
    const range = ownerDocument.createRange();
    range.setStart(node, offset);
    range.setEnd(node, offset + length);
    return range;
};

// Segmenter construction is expensive and segmentation is locale-independent
// for our use, so one instance per granularity is created and reused for
// every text node of every render. Intl.Segmenter (Baseline since 2022)
// replaced the css-line-break / text-segmentation fallbacks.
const segmenterCache = new Map<'grapheme' | 'word', Intl.Segmenter>();

const getSegmenter = (granularity: 'grapheme' | 'word'): Intl.Segmenter => {
    let segmenter = segmenterCache.get(granularity);
    if (!segmenter) {
        segmenter = new Intl.Segmenter(undefined, { granularity });
        segmenterCache.set(granularity, segmenter);
    }
    return segmenter;
};

export const segmentGraphemes = (value: string): string[] =>
    Array.from(getSegmenter('grapheme').segment(value), (s) => s.segment);

const segmentWords = (value: string): string[] => {
    // Intl.Segmenter's word granularity splits words and whitespace into
    // separate segments; parseTextBounds measures each segment independently,
    // which matches the previous LineBreaker + word-separator pipeline's
    // per-fragment measurement.
    return Array.from(getSegmenter('word').segment(value), (s) => s.segment);
};

const breakText = (value: string, styles: CSSParsedDeclaration): string[] => {
    if (isVerticalWritingMode(styles.writingMode)) {
        return segmentGraphemes(value);
    }

    return styles.letterSpacing !== 0 ? segmentGraphemes(value) : segmentWords(value);
};
