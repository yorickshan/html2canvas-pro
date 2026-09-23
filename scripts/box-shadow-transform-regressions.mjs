// Run the same independent DOM oracle and unchanged acceptance criteria with
// transforms, fractional capture scales and blocked-filter fallback fixtures.
const outer = '18px 12px 0 0 rgb(30,70,210)';
const blurredOuter = '14px 10px 12px 4px rgba(20,40,160,.65)';
const inset = 'inset 10px 8px 12px 4px rgba(0,0,0,.65)';
const fixtures = [
    { id: 'none', shadow: 'none' },
    { id: 'outer-scale-cancels-capture', shadow: outer, css: 'transform:scale(.5);transform-origin:0 0', scales: [2] },
    { id: 'parent-scale-cancels-capture', shadow: outer, layer: 'transform:scale(.5);transform-origin:0 0', scales: [2] },
    { id: 'outer-scale-cancels-small-capture', shadow: outer, css: 'left:60px;top:50px;transform:scale(2);transform-origin:0 0', scales: [.5] },
    { id: 'outer-rotated', shadow: outer, css: 'transform:rotate(30deg)' },
    { id: 'outer-parent-rotated', shadow: outer, layer: 'transform:rotate(20deg)' },
    { id: 'outer-reflected', shadow: outer, css: 'transform:scaleX(-1)' },
    { id: 'outer-rotated-blur', shadow: blurredOuter, css: 'transform:rotate(30deg)' },
    { id: 'outer-nonuniform-blur', shadow: blurredOuter, css: 'transform:scale(1.4,.75);border-radius:20px' },
    { id: 'outer-sheared-blur', shadow: blurredOuter, css: 'transform:skewX(20deg);border-radius:20px' },
    // The parent scale(.75) maps this 24x16 offset to the same 18x12 output band
    // as the other hard-shadow fixtures. A thinner band only raises the share of
    // rotated edge pixels, where engines' antialiasing coverage legitimately differs.
    { id: 'outer-nested-transform', shadow: '24px 16px 0 0 rgb(30,70,210)', css: 'transform:rotate(-15deg)', layer: 'transform:scale(.75);transform-origin:0 0' },
    { id: 'translated-inset-into-view', shadow: inset, css: 'left:600px;transform:translateX(-500px)' },
    { id: 'translated-inset-positive', shadow: inset, css: 'left:-400px;transform:translateX(500px)' },
    { id: 'translated-inset-partial', shadow: inset, css: 'left:300px;transform:translateX(-200px)' },
    { id: 'parent-translated-inset', shadow: inset, css: 'left:600px', layer: 'transform:translateX(-500px)' },
    { id: 'inset-rotated', shadow: inset, css: 'transform:rotate(30deg)' },
    { id: 'inset-nonuniform', shadow: inset, css: 'transform:scale(1.4,.75);border-radius:20px' },
    { id: 'inset-rotated-svg', shadow: inset, css: 'transform:rotate(30deg)', svg: true },
    { id: 'inset-rotated-fallback', shadow: inset, css: 'transform:rotate(30deg)', fallback: true },
    { id: 'inset-translated-fallback', shadow: inset, css: 'left:600px;transform:translateX(-500px)', fallback: true },
    { id: 'inset-scaled-fallback', shadow: inset, css: 'transform:scale(.5);transform-origin:0 0', fallback: true, scales: [2] },
    { id: 'outer-fractional', shadow: outer, scales: [.5, 1.25, 1.5, 3] },
    { id: 'inset-fractional', shadow: inset, scales: [.5, 1.25, 1.5, 3] }
];
process.env.BOX_SHADOW_FIXTURES = JSON.stringify(fixtures);
process.env.BOX_SHADOW_OUTPUT = process.env.BOX_SHADOW_TRANSFORM_OUTPUT || 'tmp/box-shadow-transforms';
await import('./box-shadow-regressions.mjs');
