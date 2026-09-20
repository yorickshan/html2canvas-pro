// Diagnostic harness only. Patches are serial, scoped to one capture, and restored in finally.
// Both descriptors come from real renderer modules; no hand-written replacement parser is used.
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const median = values => {
    const sorted = [...values].sort((a, b) => a - b), middle = sorted.length >> 1;
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const summary = samples => ({
    medianMs: median(samples.map(s => s.totalMs)),
    minMs: Math.min(...samples.map(s => s.totalMs)),
    maxMs: Math.max(...samples.map(s => s.totalMs)),
    medianEligibilityMs: median(samples.map(s => s.eligibilityMs)),
    medianRejectedSurfaceMs: median(samples.map(s => s.rejectedSurfaceMs))
});
const samePixels = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);
let running = false;

export async function runOverbudget({ draft, baseline, draftLegacy, draftOld, baselineFixed, iterations = 7, warmups = 2,
    cases = ['control', 'blur', 'combined'], onProgress = () => {} }) {
    assert(!running, 'The over-budget harness must run serially');
    assert(Number.isInteger(iterations) && iterations >= 2 && iterations <= 30, 'iterations must be 2..30');
    assert(Number.isInteger(warmups) && warmups >= 0 && warmups <= 10, 'warmups must be 0..10');
    assert(cases.length && cases.every(c => ['control', 'blur', 'combined'].includes(c)), 'Unknown fixture');
    const implementations = { release: baseline, 'release-fixed-descriptor': baselineFixed,
        draft, 'draft-forced-legacy': draftLegacy, 'draft-old-descriptor': draftOld };
    // CSS parsing is cached per descriptor. A parser override on an already-used module would be ignored.
    // Each variant MUST use a distinct module instance (URL query in CLI, fresh Blob in local probes).
    assert(new Set(Object.values(implementations).map(m => m.filterDescriptor)).size === 5,
        'Use five isolated module instances to avoid CSS parse-cache contamination');
    running = true;
    const currentParse = draft.filterDescriptor.parse, oldParse = baseline.filterDescriptor.parse;
    const report = { schemaVersion: 1, startedAt: new Date().toISOString(), status: 'running',
        environment: { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency,
            canvasFilterAPI: 'filter' in document.createElement('canvas').getContext('2d') },
        config: { size: 2600, scale: 1, iterations, warmups, cases }, descriptors: [], rows: [], comparisons: [] };
    try {
        // The pinned release and current parser must agree on token kinds. Parse with the current lexer.
        for (const css of ['none', 'blur(4px)', 'blur(4px) drop-shadow(12px 8px 8px rgba(0, 0, 0, 0.6))']) {
            const tokens = draft.Parser.parseValues(css);
            report.descriptors.push({ css, release: oldParse(null, tokens), current: currentParse(null, tokens) });
        }
        assert(report.descriptors[1].release === 'blur(4pxpx)', 'Pinned release descriptor changed');
        assert(report.descriptors[1].current === 'blur(4px)', 'Current descriptor lost blur units');
        const variants = ['release', 'release-fixed-descriptor', 'draft', 'draft-forced-legacy', 'draft-old-descriptor'];
        for (const scenario of cases) {
            const stage = document.createElement('div');
            Object.assign(stage.style, { position: 'relative', width: '2600px', height: '2600px' });
            const layer = document.createElement('div');
            Object.assign(layer.style, { position: 'absolute', left: '0', top: '0', width: '2600px', height: '2600px',
                background: '#176b70', opacity: scenario === 'control' ? '1' : '.5',
                filter: scenario === 'control' ? 'none' : scenario === 'blur' ? 'blur(4px)' :
                    'blur(4px) drop-shadow(12px 8px 8px rgba(0, 0, 0, 0.6))' });
            for (const shift of [0, 20]) {
                const child = document.createElement('div');
                Object.assign(child.style, { position: 'absolute', left: `${shift}px`, top: `${shift}px`,
                    width: '2560px', height: '2560px', background: '#b33c57' }); layer.append(child);
            }
            stage.append(layer); document.body.append(stage);
            const rows = Object.fromEntries(variants.map(variant => [variant, { scenario, variant, samples: [] }]));
            try {
                for (let round = 0; round < 1 + warmups + iterations; round++) {
                    const pixels = {};
                    for (let offset = 0; offset < variants.length; offset++) {
                        const variant = variants[(round + offset) % variants.length];
                        onProgress(`${scenario}/${variant}, observation ${round + 1}`);
                        const output = document.createElement('canvas'); output.width = output.height = 2600;
                        const restores = [], created = [];
                        const metrics = { eligibilityCalls: 0, eligibilityMs: 0, surfaceAttempts: 0,
                            rejectedSurfaces: 0, rejectedSurfaceMs: 0, svgEncodes: 0, filterAssignments: [], draws: {} };
                        const replace = (object, key, value) => {
                            const original = object[key]; object[key] = value;
                            restores.push(() => { object[key] = original; }); return original;
                        };
                        try {
                            const implementation = implementations[variant];
                            if (variant === 'release-fixed-descriptor') replace(implementation.filterDescriptor, 'parse', currentParse);
                            if (variant === 'draft-old-descriptor') replace(implementation.filterDescriptor, 'parse', oldParse);
                            const proto = (implementation.CanvasRenderer || draft.CanvasRenderer).prototype;
                            if (variant === 'draft-forced-legacy') replace(proto, 'renderStack', async function(stack) {
                                if (stack.element.container.styles.isVisible()) await this.renderStackContent(stack);
                            });
                            const eligible = proto.canComposite;
                            replace(proto, 'canComposite', function(...args) {
                                const start = performance.now();
                                try { return eligible.apply(this, args); }
                                finally { metrics.eligibilityCalls++; metrics.eligibilityMs += performance.now() - start; }
                            });
                            const attempt = proto.renderCompositedStack;
                            replace(proto, 'renderCompositedStack', async function(...args) {
                                const start = performance.now(); metrics.surfaceAttempts++;
                                const result = await attempt.apply(this, args);
                                if (!result) { metrics.rejectedSurfaces++; metrics.rejectedSurfaceMs += performance.now() - start; }
                                return result;
                            });
                            const create = Document.prototype.createElement;
                            replace(Document.prototype, 'createElement', function(tag, ...args) {
                                const element = create.call(this, tag, ...args);
                                if (String(tag).toLowerCase() === 'canvas') created.push(element);
                                return element;
                            });
                            const serialize = HTMLCanvasElement.prototype.toDataURL;
                            replace(HTMLCanvasElement.prototype, 'toDataURL', function(...args) {
                                metrics.svgEncodes++; return serialize.apply(this, args);
                            });
                            const cp = CanvasRenderingContext2D.prototype, desc = Object.getOwnPropertyDescriptor(cp, 'filter');
                            if (desc?.get && desc?.set) {
                                Object.defineProperty(cp, 'filter', { ...desc, set(value) {
                                    desc.set.call(this, value);
                                    // Distinct assignments are enough; avoid storing a record for every reset.
                                    const accepted = desc.get.call(this), row = `${value} -> ${accepted}`;
                                    if (!metrics.filterAssignments.includes(row)) metrics.filterAssignments.push(row);
                                }});
                                restores.push(() => Object.defineProperty(cp, 'filter', desc));
                            }
                            for (const name of ['fill', 'fillRect', 'stroke', 'drawImage', 'fillText', 'strokeText']) {
                                const draw = cp[name];
                                replace(cp, name, function(...args) {
                                    const filter = desc?.get ? desc.get.call(this) : '(no native filter API)';
                                    const key = `${name}: ${filter}`; metrics.draws[key] = (metrics.draws[key] || 0) + 1;
                                    return draw.apply(this, args);
                                });
                            }
                            const renderer = implementation.default;
                            const start = performance.now();
                            const result = await renderer(stage, { canvas: output, scale: 1, backgroundColor: null, logging: false });
                            const submitted = performance.now();
                            const data = result.getContext('2d').getImageData(0, 0, 2600, 2600).data;
                            const finish = performance.now();
                            const sample = { totalMs: finish - start, submitMs: submitted - start,
                                readbackMs: finish - submitted, ...metrics, intermediateCanvases: created.length,
                                retainedIntermediateBytes: created.reduce((sum, c) => sum + c.width * c.height * 4, 0),
                                leftoverIframes: document.querySelectorAll('.html2canvas-container').length,
                                centerAlpha: data[(1300 * 2600 + 1300) * 4 + 3] };
                            assert(result === output, 'Caller-owned output was replaced');
                            assert(sample.svgEncodes === 0, 'Over-budget fixture unexpectedly serialized a surface');
                            assert(sample.intermediateCanvases === 0, 'Over-budget rejection allocated an intermediate canvas');
                            assert(sample.retainedIntermediateBytes === 0 && sample.leftoverIframes === 0, 'Resources leaked');
                            if (variant === 'draft') {
                                const expected = scenario === 'control' ? 0 : 1;
                                assert(sample.surfaceAttempts === expected && sample.rejectedSurfaces === expected,
                                    'Expected exactly one early budget rejection, not repeated rendering');
                            }
                            if (variant === 'draft-forced-legacy') assert(sample.surfaceAttempts === 0, 'Bypass did not bypass');
                            if (report.environment.canvasFilterAPI && scenario !== 'control') {
                                const corrected = !['release', 'draft-old-descriptor'].includes(variant);
                                const expected = corrected ? 'blur(4px) -> blur(4px)' : 'blur(4pxpx) -> none';
                                assert(sample.filterAssignments.includes(expected), `${variant}: unexpected effective filter`);
                            }
                            if (round === 0) rows[variant].first = sample;
                            if (round > warmups) {
                                rows[variant].samples.push(sample);
                                if (round === warmups + 1) pixels[variant] = data;
                            }
                        } finally {
                            restores.reverse().forEach(restore => restore()); output.width = output.height = 0;
                        }
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                    if (round === warmups + 1) {
                        const pairs = [['draft', 'draft-forced-legacy'], ['draft', 'release-fixed-descriptor'],
                            ['release', 'draft-old-descriptor']];
                        for (const [a, b] of pairs) {
                            const identical = samePixels(pixels[a], pixels[b]);
                            report.comparisons.push({ scenario, a, b, identical });
                            assert(identical, `${scenario}: ${a} and ${b} differ; timing attribution is not established`);
                        }
                        report.comparisons.push({ scenario, a: 'release', b: 'draft',
                            identical: samePixels(pixels.release, pixels.draft) });
                    }
                }
                for (const row of Object.values(rows)) { Object.assign(row, summary(row.samples)); report.rows.push(row); }
            } finally { stage.remove(); }
        }
        report.status = 'passed'; return report;
    } catch (error) {
        report.status = 'failed'; report.error = String(error); error.report = report; throw error;
    } finally {
        running = false; report.completedAt = new Date().toISOString();
        assert(draft.filterDescriptor.parse === currentParse && baseline.filterDescriptor.parse === oldParse,
            'Diagnostic parser overrides were not restored');
    }
}
