interface CSSStyleDeclaration {
    textDecorationColor: string;
    textDecorationLine: string;
    textDecorationStyle: string;
    textDecorationThickness: string;
    textUnderlineOffset: string;
    overflowWrap: string;
    rotate: string;
    webkitLineClamp: string;
    webkitBoxOrient: string;
}

interface DocumentType extends Node, ChildNode {
    readonly internalSubset: string | null;
}

interface Document {
    fonts: any;
}
