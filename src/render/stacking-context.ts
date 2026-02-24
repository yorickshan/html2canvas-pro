import { ElementContainer, FLAGS } from '../dom/element-container';
import { contains } from '../core/bitwise';
import { BoundCurves, calculateBorderBoxPath, calculatePaddingBoxPath } from './bound-curves';
import {
    ClipEffect,
    ClipPathEffect,
    EffectTarget,
    IElementEffect,
    isClipEffect,
    OpacityEffect,
    TransformEffect
} from './effects';
import { Matrix } from '../css/property-descriptors/transform';
import { OVERFLOW } from '../css/property-descriptors/overflow';
import { equalPath } from './path';
import { DISPLAY } from '../css/property-descriptors/display';
import { OLElementContainer } from '../dom/elements/ol-element-container';
import { LIElementContainer } from '../dom/elements/li-element-container';
import { createCounterText } from '../css/types/functions/counter';
import { POSITION } from '../css/property-descriptors/position';
import { getAbsoluteValue } from '../css/types/length-percentage';
import { Bounds } from '../css/layout/bounds';
import { CLIP_PATH_TYPE, ClipPathValue, ShapeRadius } from '../css/property-descriptors/clip-path';

export class StackingContext {
    element: ElementPaint;
    negativeZIndex: StackingContext[];
    zeroOrAutoZIndexOrTransformedOrOpacity: StackingContext[];
    positiveZIndex: StackingContext[];
    nonPositionedFloats: StackingContext[];
    nonPositionedInlineLevel: StackingContext[];
    inlineLevel: ElementPaint[];
    nonInlineLevel: ElementPaint[];

    constructor(container: ElementPaint) {
        this.element = container;
        this.inlineLevel = [];
        this.nonInlineLevel = [];
        this.negativeZIndex = [];
        this.zeroOrAutoZIndexOrTransformedOrOpacity = [];
        this.positiveZIndex = [];
        this.nonPositionedFloats = [];
        this.nonPositionedInlineLevel = [];
    }
}

export class ElementPaint {
    readonly effects: IElementEffect[] = [];
    readonly curves: BoundCurves;
    listValue?: string;

    constructor(
        readonly container: ElementContainer,
        readonly parent: ElementPaint | null
    ) {
        this.curves = new BoundCurves(this.container);
        if (this.container.styles.opacity < 1) {
            this.effects.push(new OpacityEffect(this.container.styles.opacity));
        }

        if (this.container.styles.rotate !== null) {
            const origin = this.container.styles.transformOrigin;
            const offsetX = this.container.bounds.left + getAbsoluteValue(origin[0], this.container.bounds.width);
            const offsetY = this.container.bounds.top + getAbsoluteValue(origin[1], this.container.bounds.height);
            // Apply rotate property if present
            const angle = this.container.styles.rotate;
            const rad = (angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const rotateMatrix: Matrix = [cos, sin, -sin, cos, 0, 0];
            this.effects.push(new TransformEffect(offsetX, offsetY, rotateMatrix));
        }

        if (this.container.styles.transform !== null) {
            const origin = this.container.styles.transformOrigin;
            const offsetX = this.container.bounds.left + getAbsoluteValue(origin[0], this.container.bounds.width);
            const offsetY = this.container.bounds.top + getAbsoluteValue(origin[1], this.container.bounds.height);
            const matrix = this.container.styles.transform;
            this.effects.push(new TransformEffect(offsetX, offsetY, matrix));
        }

        if (this.container.styles.overflowX !== OVERFLOW.VISIBLE) {
            const borderBox = calculateBorderBoxPath(this.curves);
            const paddingBox = calculatePaddingBoxPath(this.curves);

            if (equalPath(borderBox, paddingBox)) {
                this.effects.push(new ClipEffect(borderBox, EffectTarget.BACKGROUND_BORDERS | EffectTarget.CONTENT));
            } else {
                this.effects.push(new ClipEffect(borderBox, EffectTarget.BACKGROUND_BORDERS));
                this.effects.push(new ClipEffect(paddingBox, EffectTarget.CONTENT));
            }
        }

        if (this.container.styles.clipPath.type !== CLIP_PATH_TYPE.NONE) {
            const clipPathEffect = buildClipPathEffect(this.container.styles.clipPath, this.container.bounds);
            if (clipPathEffect) {
                this.effects.push(clipPathEffect);
            }
        }
    }

    getEffects(target: EffectTarget): IElementEffect[] {
        let inFlow = [POSITION.ABSOLUTE, POSITION.FIXED].indexOf(this.container.styles.position) === -1;
        let parent = this.parent;
        const effects = this.effects.slice(0);
        while (parent) {
            const croplessEffects = parent.effects.filter((effect) => !isClipEffect(effect));
            if (inFlow || parent.container.styles.position !== POSITION.STATIC || !parent.parent) {
                inFlow = [POSITION.ABSOLUTE, POSITION.FIXED].indexOf(parent.container.styles.position) === -1;
                if (parent.container.styles.overflowX !== OVERFLOW.VISIBLE) {
                    const borderBox = calculateBorderBoxPath(parent.curves);
                    const paddingBox = calculatePaddingBoxPath(parent.curves);
                    if (!equalPath(borderBox, paddingBox)) {
                        effects.unshift(
                            new ClipEffect(paddingBox, EffectTarget.BACKGROUND_BORDERS | EffectTarget.CONTENT)
                        );
                    }
                }
                effects.unshift(...croplessEffects);
            } else {
                effects.unshift(...croplessEffects);
            }

            parent = parent.parent;
        }

        return effects.filter((effect) => contains(effect.target, target));
    }
}

/**
 * Resolve a `closest-side` or `farthest-side` shape-radius keyword to pixels
 * for a single axis. Used by both `circle()` (per-axis) and `ellipse()`.
 *
 * @param r       - The ShapeRadius (keyword or length-percentage).
 * @param center  - Absolute center coordinate on this axis (cx or cy).
 * @param start   - Absolute start of the reference box on this axis.
 * @param end     - Absolute end of the reference box on this axis.
 * @param dimRef  - Reference dimension for resolving a length-percentage value.
 */
const resolveAxisRadius = (r: ShapeRadius, center: number, start: number, end: number, dimRef: number): number => {
    if (r === 'closest-side') return Math.min(center - start, end - center);
    if (r === 'farthest-side') return Math.max(center - start, end - center);
    return getAbsoluteValue(r, dimRef);
};

/**
 * Convert a parsed ClipPathValue + element bounds into a ClipPathEffect whose
 * `applyClip` callback draws the clip shape directly onto the canvas context.
 *
 * All coordinates are computed in page-absolute space at construction time so
 * the callback itself is allocation-free and executes synchronously.
 */
const buildClipPathEffect = (clipPath: ClipPathValue, bounds: Bounds): ClipPathEffect | null => {
    const { left: bLeft, top: bTop, width: bWidth, height: bHeight } = bounds;

    switch (clipPath.type) {
        case CLIP_PATH_TYPE.INSET: {
            const iLeft = getAbsoluteValue(clipPath.left, bWidth);
            const iTop = getAbsoluteValue(clipPath.top, bHeight);
            const x = bLeft + iLeft;
            const y = bTop + iTop;
            // Clamp to zero: per CSS spec, overlapping insets produce an empty shape.
            const w = Math.max(0, bWidth - iLeft - getAbsoluteValue(clipPath.right, bWidth));
            const h = Math.max(0, bHeight - iTop - getAbsoluteValue(clipPath.bottom, bHeight));
            return new ClipPathEffect((ctx) => {
                ctx.beginPath();
                ctx.rect(x, y, w, h);
                ctx.clip();
            });
        }

        case CLIP_PATH_TYPE.CIRCLE: {
            const cx = bLeft + getAbsoluteValue(clipPath.cx, bWidth);
            const cy = bTop + getAbsoluteValue(clipPath.cy, bHeight);
            let r: number;
            if (clipPath.radius === 'closest-side') {
                r = Math.min(cx - bLeft, cy - bTop, bLeft + bWidth - cx, bTop + bHeight - cy);
            } else if (clipPath.radius === 'farthest-side') {
                r = Math.max(cx - bLeft, cy - bTop, bLeft + bWidth - cx, bTop + bHeight - cy);
            } else {
                // Per CSS spec, percentage is relative to sqrt(w² + h²) / sqrt(2).
                r = getAbsoluteValue(clipPath.radius, Math.sqrt(bWidth * bWidth + bHeight * bHeight) / Math.SQRT2);
            }
            return new ClipPathEffect((ctx) => {
                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2);
                ctx.clip();
            });
        }

        case CLIP_PATH_TYPE.ELLIPSE: {
            const cx = bLeft + getAbsoluteValue(clipPath.cx, bWidth);
            const cy = bTop + getAbsoluteValue(clipPath.cy, bHeight);
            const rx = resolveAxisRadius(clipPath.rx, cx, bLeft, bLeft + bWidth, bWidth);
            const ry = resolveAxisRadius(clipPath.ry, cy, bTop, bTop + bHeight, bHeight);
            return new ClipPathEffect((ctx) => {
                ctx.beginPath();
                ctx.ellipse(cx, cy, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2);
                ctx.clip();
            });
        }

        case CLIP_PATH_TYPE.POLYGON: {
            // Pre-compute all vertices in page-absolute coordinates.
            const absPoints = clipPath.points.map(
                ([px, py]) =>
                    [bLeft + getAbsoluteValue(px, bWidth), bTop + getAbsoluteValue(py, bHeight)] as [number, number]
            );
            return new ClipPathEffect((ctx) => {
                ctx.beginPath();
                if (absPoints.length > 0) {
                    ctx.moveTo(absPoints[0][0], absPoints[0][1]);
                    for (let i = 1; i < absPoints.length; i++) {
                        ctx.lineTo(absPoints[i][0], absPoints[i][1]);
                    }
                    ctx.closePath();
                }
                // Calling clip() with an empty path (zero points) is intentional:
                // it clips the entire region to nothing, which is the correct
                // behaviour for a degenerate polygon() per the CSS spec.
                ctx.clip();
            });
        }

        case CLIP_PATH_TYPE.PATH: {
            // path() coordinates are in the element's local space (0,0 = element top-left).
            // We temporarily translate the canvas origin to the element's position, clip
            // with the Path2D, then restore only the transform matrix (not the clipping
            // region) via setTransform so the clip persists for the enclosing
            // ctx.save() / ctx.restore() pair managed by EffectsRenderer.
            //
            // When the element also has a CSS transform, that transform was already applied
            // by a preceding TransformEffect, so the path coordinates end up correctly in
            // the element's transformed local space — matching browser behaviour.
            const { d } = clipPath;
            return new ClipPathEffect((ctx) => {
                try {
                    const savedTransform = ctx.getTransform();
                    ctx.translate(bLeft, bTop);
                    ctx.clip(new Path2D(d));
                    ctx.setTransform(savedTransform);
                } catch (_e) {
                    // Path2D or getTransform/setTransform not supported in this environment.
                }
            });
        }

        case CLIP_PATH_TYPE.NONE:
            return null;

        default: {
            // Exhaustiveness guard: if a new CLIP_PATH_TYPE is added in the future
            // without a corresponding case above, TypeScript will raise a compile-time
            // error here rather than silently falling through.
            const _exhaustive: never = clipPath;
            void _exhaustive;
            return null;
        }
    }
};

const parseStackTree = (
    parent: ElementPaint,
    stackingContext: StackingContext,
    realStackingContext: StackingContext,
    listItems: ElementPaint[]
) => {
    parent.container.elements.forEach((child) => {
        const treatAsRealStackingContext = contains(child.flags, FLAGS.CREATES_REAL_STACKING_CONTEXT);
        const createsStackingContext = contains(child.flags, FLAGS.CREATES_STACKING_CONTEXT);
        const paintContainer = new ElementPaint(child, parent);
        if (contains(child.styles.display, DISPLAY.LIST_ITEM)) {
            listItems.push(paintContainer);
        }

        const listOwnerItems = contains(child.flags, FLAGS.IS_LIST_OWNER) ? [] : listItems;

        if (treatAsRealStackingContext || createsStackingContext) {
            const parentStack =
                treatAsRealStackingContext || child.styles.isPositioned() ? realStackingContext : stackingContext;

            const stack = new StackingContext(paintContainer);

            if (child.styles.isPositioned() || child.styles.opacity < 1 || child.styles.isTransformed()) {
                const order = child.styles.zIndex.order;
                if (order < 0) {
                    let index = 0;

                    parentStack.negativeZIndex.some((current, i) => {
                        if (order > current.element.container.styles.zIndex.order) {
                            index = i;
                            return false;
                        } else if (index > 0) {
                            return true;
                        }

                        return false;
                    });
                    parentStack.negativeZIndex.splice(index, 0, stack);
                } else if (order > 0) {
                    let index = 0;
                    parentStack.positiveZIndex.some((current, i) => {
                        if (order >= current.element.container.styles.zIndex.order) {
                            index = i + 1;
                            return false;
                        } else if (index > 0) {
                            return true;
                        }

                        return false;
                    });
                    parentStack.positiveZIndex.splice(index, 0, stack);
                } else {
                    parentStack.zeroOrAutoZIndexOrTransformedOrOpacity.push(stack);
                }
            } else {
                if (child.styles.isFloating()) {
                    parentStack.nonPositionedFloats.push(stack);
                } else {
                    parentStack.nonPositionedInlineLevel.push(stack);
                }
            }

            parseStackTree(
                paintContainer,
                stack,
                treatAsRealStackingContext ? stack : realStackingContext,
                listOwnerItems
            );
        } else {
            if (child.styles.isInlineLevel()) {
                stackingContext.inlineLevel.push(paintContainer);
            } else {
                stackingContext.nonInlineLevel.push(paintContainer);
            }

            parseStackTree(paintContainer, stackingContext, realStackingContext, listOwnerItems);
        }

        if (contains(child.flags, FLAGS.IS_LIST_OWNER)) {
            processListItems(child, listOwnerItems);
        }
    });
};

const processListItems = (owner: ElementContainer, elements: ElementPaint[]) => {
    let numbering = owner instanceof OLElementContainer ? owner.start : 1;
    const reversed = owner instanceof OLElementContainer ? owner.reversed : false;
    for (let i = 0; i < elements.length; i++) {
        const item = elements[i];
        if (
            item.container instanceof LIElementContainer &&
            typeof item.container.value === 'number' &&
            item.container.value !== 0
        ) {
            numbering = item.container.value;
        }

        item.listValue = createCounterText(numbering, item.container.styles.listStyleType, true);

        numbering += reversed ? -1 : 1;
    }
};

export const parseStackingContexts = (container: ElementContainer): StackingContext => {
    const paintContainer = new ElementPaint(container, null);
    const root = new StackingContext(paintContainer);
    const listItems: ElementPaint[] = [];
    parseStackTree(paintContainer, root, root, listItems);
    processListItems(paintContainer.container, listItems);
    return root;
};
