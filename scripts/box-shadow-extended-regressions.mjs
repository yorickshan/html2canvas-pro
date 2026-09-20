// Use the same independent native-DOM oracle and fixed thresholds as the original suite.
const cases = [
    { id: 'none', shadow: 'none' },
    { id: 'hard-rounded-spread', shadow: '12px 8px 0 10px #c21e50', css: 'border-radius:24px' },
    { id: 'hard-circle-spread', shadow: '12px 8px 0 10px #c21e50', css: 'width:96px;height:96px;border-radius:50%' },
    { id: 'small-radius-spread', shadow: '0 0 0 12px #c21e50', css: 'border-radius:4px' },
    { id: 'hard-rounded-inset', shadow: 'inset 12px 8px 0 10px #203080', css: 'border-radius:24px' },
    { id: 'bordered-inset', shadow: 'inset 12px 8px 10px 4px #203080', css: 'border:8px solid rgba(180,90,50,.5);border-radius:24px' },
    { id: 'bordered-hard-inset', shadow: 'inset 12px 8px 0 4px #203080', css: 'border:8px solid rgba(180,90,50,.5);border-radius:24px' },
    { id: 'collapsed-inset-hole', shadow: 'inset 0 0 12px 80px rgba(0,0,0,.5)', css: 'border-radius:24px' },
    { id: 'inset-large-offset', shadow: 'inset 200px 100px 12px 0 rgba(0,0,0,.5)', css: 'border-radius:24px' },
    { id: 'transparent-inset', shadow: 'inset -8px 10px 10px 4px rgba(0,0,0,.5)', css: 'background:transparent;border-radius:24px' },
    { id: 'multiple-insets', shadow: 'inset 12px 8px 6px 4px rgba(220,20,30,.7),inset -14px -8px 8px 2px rgba(20,40,220,.6)', css: 'border-radius:16px' },
    { id: 'forced-svg-inset', shadow: 'inset -8px 10px 10px 4px rgba(0,0,0,.5)', css: 'border-radius:24px', svg: true }
];
process.env.BOX_SHADOW_FIXTURES = JSON.stringify(cases);
process.env.BOX_SHADOW_OUTPUT = process.env.BOX_SHADOW_EXTENDED_OUTPUT || 'tmp/box-shadow-extended';
await import('./box-shadow-regressions.mjs');
