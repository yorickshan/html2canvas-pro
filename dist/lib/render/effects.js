"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOpacityEffect = exports.isClipEffect = exports.isTransformEffect = exports.OpacityEffect = exports.ClipEffect = exports.TransformEffect = void 0;
var TransformEffect = /** @class */ (function () {
    function TransformEffect(offsetX, offsetY, matrix) {
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.matrix = matrix;
        this.type = 0 /* EffectType.TRANSFORM */;
        this.target = 2 /* EffectTarget.BACKGROUND_BORDERS */ | 4 /* EffectTarget.CONTENT */;
    }
    return TransformEffect;
}());
exports.TransformEffect = TransformEffect;
var ClipEffect = /** @class */ (function () {
    function ClipEffect(path, target) {
        this.path = path;
        this.target = target;
        this.type = 1 /* EffectType.CLIP */;
    }
    return ClipEffect;
}());
exports.ClipEffect = ClipEffect;
var OpacityEffect = /** @class */ (function () {
    function OpacityEffect(opacity) {
        this.opacity = opacity;
        this.type = 2 /* EffectType.OPACITY */;
        this.target = 2 /* EffectTarget.BACKGROUND_BORDERS */ | 4 /* EffectTarget.CONTENT */;
    }
    return OpacityEffect;
}());
exports.OpacityEffect = OpacityEffect;
var isTransformEffect = function (effect) {
    return effect.type === 0 /* EffectType.TRANSFORM */;
};
exports.isTransformEffect = isTransformEffect;
var isClipEffect = function (effect) { return effect.type === 1 /* EffectType.CLIP */; };
exports.isClipEffect = isClipEffect;
var isOpacityEffect = function (effect) { return effect.type === 2 /* EffectType.OPACITY */; };
exports.isOpacityEffect = isOpacityEffect;
//# sourceMappingURL=effects.js.map