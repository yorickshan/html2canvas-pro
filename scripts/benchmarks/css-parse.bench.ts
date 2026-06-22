/**
 * CSS Property Parsing Benchmarks
 *
 * Measures performance of the CSS tokenizer, parser, and property parsing pipeline.
 * Run with: npx tsx scripts/benchmarks/css-parse.bench.ts
 */

import { JSDOM } from 'jsdom';
import { Context } from '../../src/core/context';
import { CSSParsedDeclaration } from '../../src/css/index';
import { Html2CanvasConfig } from '../../src/config';
import { Bounds } from '../../src/css/layout/bounds';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const win = dom.window;

interface BenchmarkResult {
    name: string;
    duration: number;
    ops: number;
    iterations: number;
}

const run = (name: string, fn: () => void, iterations: number): BenchmarkResult => {
    // Warmup
    for (let i = 0; i < Math.min(iterations, 10); i++) {
        fn();
    }

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const duration = performance.now() - start;
    return { name, duration, ops: Math.round(iterations / (duration / 1000)), iterations };
};

const formatMs = (ms: number): string => {
    if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
};

const logResult = (r: BenchmarkResult): void => {
    const perOp = r.duration / r.iterations;
    console.log(`  ${r.name.padEnd(40)} ${formatMs(perOp).padStart(10)}/op  (${r.ops.toLocaleString()} ops/s, ${r.iterations} iters)`);
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

// Minimal browser-like CSSStyleDeclaration mock
const createMockDeclaration = (overrides: Record<string, string> = {}): CSSStyleDeclaration => {
    const defaults: Record<string, string> = {
        display: 'block',
        opacity: '1',
        visibility: 'visible',
        color: 'rgb(0, 0, 0)',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        backgroundImage: 'none',
        backgroundClip: 'border-box',
        backgroundOrigin: 'padding-box',
        backgroundPosition: '0% 0%',
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto',
        borderTopColor: 'rgb(0, 0, 0)',
        borderRightColor: 'rgb(0, 0, 0)',
        borderBottomColor: 'rgb(0, 0, 0)',
        borderLeftColor: 'rgb(0, 0, 0)',
        borderTopWidth: '0px',
        borderRightWidth: '0px',
        borderBottomWidth: '0px',
        borderLeftWidth: '0px',
        borderTopStyle: 'none',
        borderRightStyle: 'none',
        borderBottomStyle: 'none',
        borderLeftStyle: 'none',
        borderTopLeftRadius: '0px',
        borderTopRightRadius: '0px',
        borderBottomRightRadius: '0px',
        borderBottomLeftRadius: '0px',
        boxShadow: 'none',
        clipPath: 'none',
        direction: 'ltr',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'normal',
        fontVariant: 'normal',
        fontWeight: '400',
        letterSpacing: 'normal',
        lineBreak: 'auto',
        lineHeight: 'normal',
        listStyleImage: 'none',
        listStylePosition: 'outside',
        listStyleType: 'disc',
        marginTop: '0px',
        marginRight: '0px',
        marginBottom: '0px',
        marginLeft: '0px',
        overflow: 'visible',
        overflowWrap: 'normal',
        paddingTop: '0px',
        paddingRight: '0px',
        paddingBottom: '0px',
        paddingLeft: '0px',
        paintOrder: 'normal',
        position: 'static',
        textAlign: 'start',
        textDecorationColor: 'rgb(0, 0, 0)',
        textDecorationLine: 'none',
        textDecorationStyle: 'solid',
        textDecorationThickness: 'auto',
        textUnderlineOffset: 'auto',
        textShadow: 'none',
        textTransform: 'none',
        textOverflow: 'clip',
        transform: 'none',
        transformOrigin: '50% 50%',
        rotate: 'none',
        wordBreak: 'normal',
        writingMode: 'horizontal-tb',
        zIndex: 'auto',
        objectFit: 'fill',
        imageRendering: 'auto',
        animationDuration: '0s',
        webkitTextStrokeColor: 'rgb(0, 0, 0)',
        webkitTextStrokeWidth: '0px',
        webkitLineClamp: 'none',
        cssFloat: 'none',
        content: 'none',
        quotes: 'auto',
        counterIncrement: 'none',
        counterReset: 'none'
    };

    const merged = { ...defaults, ...overrides };
    const keys = Object.keys(merged);

    return {
        getPropertyValue: (prop: string) => merged[prop] ?? '',
        getPropertyPriority: () => '',
        item: (i: number) => keys[i] ?? '',
        get length() { return keys.length; },
        display: merged.display,
        cssFloat: merged.cssFloat,
        textDecorationColor: merged.textDecorationColor,
        textDecorationLine: merged.textDecorationLine,
        color: merged.color,
        overflow: merged.overflow,
        content: merged.content,
        quotes: merged.quotes,
        counterIncrement: merged.counterIncrement,
        counterReset: merged.counterReset
    } as unknown as CSSStyleDeclaration;
};

// Create a minimal Context mock
const config = new Html2CanvasConfig({ window: win as unknown as Window });
const bounds = new Bounds(0, 0, 800, 600);
const context = new Context({ logging: false, cache: undefined, allowTaint: false }, bounds, config);

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

console.log('\nCSS Property Parsing Benchmarks');
console.log('================================\n');

// Benchmark 1: Single property declaration parsing (typical element)
{
    console.log('1. CSSParsedDeclaration (typical block element):');
    const decl = createMockDeclaration();

    const ITERATIONS = 1000;
    let result: CSSParsedDeclaration | undefined;
    logResult(run('  cold (no cache)', () => {
        result = new CSSParsedDeclaration(context, decl);
    }, ITERATIONS));

    // Keep reference to prevent optimization
    void result;
    result = undefined;
}

// Benchmark 2: display:none fast path
{
    console.log('\n2. CSSParsedDeclaration (display:none fast path):');
    const decl = createMockDeclaration({ display: 'none' });

    const ITERATIONS = 5000;
    logResult(run('  display:none element', () => {
        new CSSParsedDeclaration(context, decl);
    }, ITERATIONS));
}

// Benchmark 3: Property with complex values
{
    console.log('\n3. CSSParsedDeclaration (complex properties):');
    const complex = createMockDeclaration({
        backgroundImage: 'url("https://example.com/image.jpg"), linear-gradient(45deg, red, blue)',
        transform: 'matrix(0.866025, 0.5, -0.5, 0.866025, 100, 50)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1)',
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
    });

    const ITERATIONS = 1000;
    logResult(run('  complex values', () => {
        new CSSParsedDeclaration(context, complex);
    }, ITERATIONS));
}

// Benchmark 4: Parse cache hit rate (repeated identical declarations)
{
    console.log('\n4. Parse cache effectiveness (repeated declarations):');
    const decl = createMockDeclaration();

    // Parse once to warm cache
    new CSSParsedDeclaration(context, decl);

    const ITERATIONS = 10000;
    logResult(run('  cached (same declaration)', () => {
        new CSSParsedDeclaration(context, decl);
    }, ITERATIONS));
}

// Benchmark 5: Mix of different elements (simulates real page)
{
    console.log('\n5. Mixed workload (simulates 1000-element page):');

    const elementTypes: CSSStyleDeclaration[] = [
        createMockDeclaration(),
        createMockDeclaration({ display: 'none' }),
        createMockDeclaration({ fontSize: '14px', color: 'rgb(51, 51, 51)' }),
        createMockDeclaration({
            backgroundColor: 'rgb(255, 255, 255)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            borderRadius: '4px'
        }),
        createMockDeclaration({
            position: 'absolute',
            transform: 'translateX(-50%)',
            zIndex: '10'
        })
    ];

    const ITERATIONS = 5000;
    let idx = 0;
    logResult(run('  mixed 5 element types', () => {
        new CSSParsedDeclaration(context, elementTypes[idx % elementTypes.length]);
        idx++;
    }, ITERATIONS));
}

console.log('\nDone.\n');
