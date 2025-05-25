"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStackingContexts = exports.ElementPaint = exports.StackingContext = void 0;
var bitwise_1 = require("../core/bitwise");
var bound_curves_1 = require("./bound-curves");
var effects_1 = require("./effects");
var path_1 = require("./path");
var ol_element_container_1 = require("../dom/elements/ol-element-container");
var li_element_container_1 = require("../dom/elements/li-element-container");
var counter_1 = require("../css/types/functions/counter");
var StackingContext = /** @class */ (function () {
    function StackingContext(container) {
        this.element = container;
        this.inlineLevel = [];
        this.nonInlineLevel = [];
        this.negativeZIndex = [];
        this.zeroOrAutoZIndexOrTransformedOrOpacity = [];
        this.positiveZIndex = [];
        this.nonPositionedFloats = [];
        this.nonPositionedInlineLevel = [];
    }
    return StackingContext;
}());
exports.StackingContext = StackingContext;
var ElementPaint = /** @class */ (function () {
    function ElementPaint(container, parent) {
        this.container = container;
        this.parent = parent;
        this.effects = [];
        this.curves = new bound_curves_1.BoundCurves(this.container);
        if (this.container.styles.opacity < 1) {
            this.effects.push(new effects_1.OpacityEffect(this.container.styles.opacity));
        }
        if (this.container.styles.transform !== null) {
            var offsetX = this.container.bounds.left + this.container.styles.transformOrigin[0].number;
            var offsetY = this.container.bounds.top + this.container.styles.transformOrigin[1].number;
            var matrix = this.container.styles.transform;
            this.effects.push(new effects_1.TransformEffect(offsetX, offsetY, matrix));
        }
        if (this.container.styles.overflowX !== 0 /* OVERFLOW.VISIBLE */) {
            var borderBox = (0, bound_curves_1.calculateBorderBoxPath)(this.curves);
            var paddingBox = (0, bound_curves_1.calculatePaddingBoxPath)(this.curves);
            if ((0, path_1.equalPath)(borderBox, paddingBox)) {
                this.effects.push(new effects_1.ClipEffect(borderBox, 2 /* EffectTarget.BACKGROUND_BORDERS */ | 4 /* EffectTarget.CONTENT */));
            }
            else {
                this.effects.push(new effects_1.ClipEffect(borderBox, 2 /* EffectTarget.BACKGROUND_BORDERS */));
                this.effects.push(new effects_1.ClipEffect(paddingBox, 4 /* EffectTarget.CONTENT */));
            }
        }
    }
    ElementPaint.prototype.getEffects = function (target) {
        var inFlow = [2 /* POSITION.ABSOLUTE */, 3 /* POSITION.FIXED */].indexOf(this.container.styles.position) === -1;
        var parent = this.parent;
        var effects = this.effects.slice(0);
        while (parent) {
            var croplessEffects = parent.effects.filter(function (effect) { return !(0, effects_1.isClipEffect)(effect); });
            if (inFlow || parent.container.styles.position !== 0 /* POSITION.STATIC */ || !parent.parent) {
                inFlow = [2 /* POSITION.ABSOLUTE */, 3 /* POSITION.FIXED */].indexOf(parent.container.styles.position) === -1;
                if (parent.container.styles.overflowX !== 0 /* OVERFLOW.VISIBLE */) {
                    var borderBox = (0, bound_curves_1.calculateBorderBoxPath)(parent.curves);
                    var paddingBox = (0, bound_curves_1.calculatePaddingBoxPath)(parent.curves);
                    if (!(0, path_1.equalPath)(borderBox, paddingBox)) {
                        effects.unshift(new effects_1.ClipEffect(paddingBox, 2 /* EffectTarget.BACKGROUND_BORDERS */ | 4 /* EffectTarget.CONTENT */));
                    }
                }
                effects.unshift.apply(effects, croplessEffects);
            }
            else {
                effects.unshift.apply(effects, croplessEffects);
            }
            parent = parent.parent;
        }
        return effects.filter(function (effect) { return (0, bitwise_1.contains)(effect.target, target); });
    };
    return ElementPaint;
}());
exports.ElementPaint = ElementPaint;
var parseStackTree = function (parent, stackingContext, realStackingContext, listItems) {
    parent.container.elements.forEach(function (child) {
        var treatAsRealStackingContext = (0, bitwise_1.contains)(child.flags, 4 /* FLAGS.CREATES_REAL_STACKING_CONTEXT */);
        var createsStackingContext = (0, bitwise_1.contains)(child.flags, 2 /* FLAGS.CREATES_STACKING_CONTEXT */);
        var paintContainer = new ElementPaint(child, parent);
        if ((0, bitwise_1.contains)(child.styles.display, 2048 /* DISPLAY.LIST_ITEM */)) {
            listItems.push(paintContainer);
        }
        var listOwnerItems = (0, bitwise_1.contains)(child.flags, 8 /* FLAGS.IS_LIST_OWNER */) ? [] : listItems;
        if (treatAsRealStackingContext || createsStackingContext) {
            var parentStack = treatAsRealStackingContext || child.styles.isPositioned() ? realStackingContext : stackingContext;
            var stack = new StackingContext(paintContainer);
            if (child.styles.isPositioned() || child.styles.opacity < 1 || child.styles.isTransformed()) {
                var order_1 = child.styles.zIndex.order;
                if (order_1 < 0) {
                    var index_1 = 0;
                    parentStack.negativeZIndex.some(function (current, i) {
                        if (order_1 > current.element.container.styles.zIndex.order) {
                            index_1 = i;
                            return false;
                        }
                        else if (index_1 > 0) {
                            return true;
                        }
                        return false;
                    });
                    parentStack.negativeZIndex.splice(index_1, 0, stack);
                }
                else if (order_1 > 0) {
                    var index_2 = 0;
                    parentStack.positiveZIndex.some(function (current, i) {
                        if (order_1 >= current.element.container.styles.zIndex.order) {
                            index_2 = i + 1;
                            return false;
                        }
                        else if (index_2 > 0) {
                            return true;
                        }
                        return false;
                    });
                    parentStack.positiveZIndex.splice(index_2, 0, stack);
                }
                else {
                    parentStack.zeroOrAutoZIndexOrTransformedOrOpacity.push(stack);
                }
            }
            else {
                if (child.styles.isFloating()) {
                    parentStack.nonPositionedFloats.push(stack);
                }
                else {
                    parentStack.nonPositionedInlineLevel.push(stack);
                }
            }
            parseStackTree(paintContainer, stack, treatAsRealStackingContext ? stack : realStackingContext, listOwnerItems);
        }
        else {
            if (child.styles.isInlineLevel()) {
                stackingContext.inlineLevel.push(paintContainer);
            }
            else {
                stackingContext.nonInlineLevel.push(paintContainer);
            }
            parseStackTree(paintContainer, stackingContext, realStackingContext, listOwnerItems);
        }
        if ((0, bitwise_1.contains)(child.flags, 8 /* FLAGS.IS_LIST_OWNER */)) {
            processListItems(child, listOwnerItems);
        }
    });
};
var processListItems = function (owner, elements) {
    var numbering = owner instanceof ol_element_container_1.OLElementContainer ? owner.start : 1;
    var reversed = owner instanceof ol_element_container_1.OLElementContainer ? owner.reversed : false;
    for (var i = 0; i < elements.length; i++) {
        var item = elements[i];
        if (item.container instanceof li_element_container_1.LIElementContainer &&
            typeof item.container.value === 'number' &&
            item.container.value !== 0) {
            numbering = item.container.value;
        }
        item.listValue = (0, counter_1.createCounterText)(numbering, item.container.styles.listStyleType, true);
        numbering += reversed ? -1 : 1;
    }
};
var parseStackingContexts = function (container) {
    var paintContainer = new ElementPaint(container, null);
    var root = new StackingContext(paintContainer);
    var listItems = [];
    parseStackTree(paintContainer, root, root, listItems);
    processListItems(paintContainer.container, listItems);
    return root;
};
exports.parseStackingContexts = parseStackingContexts;
//# sourceMappingURL=stacking-context.js.map