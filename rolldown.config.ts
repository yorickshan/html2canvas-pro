import { defineConfig } from 'rolldown';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const banner = `/*!
 * ${pkg.name} ${pkg.version} <${pkg.homepage}>
 * Copyright (c) 2024-present yorickshan and html2canvas-pro contributors
 * Released under ${pkg.license} License
 */`;

const umdFooter = 'if (typeof window !== "undefined" && window.html2canvas && window.html2canvas.default) { window.html2canvas = window.html2canvas.default; }';

const baseInput = {
    input: 'src/index.ts',
    resolve: {
        extensions: ['.ts', '.js', '.json']
    },
    platform: 'browser' as const,
    external: []
};

export default defineConfig([
    // CJS bundle (for Node.js require())
    {
        ...baseInput,
        output: {
            file: 'dist/html2canvas-pro.cjs',
            format: 'cjs',
            exports: 'named',
            banner,
            sourcemap: true
        }
    },
    // ESM bundle
    {
        ...baseInput,
        output: {
            file: pkg.module,
            format: 'esm',
            exports: 'named',
            banner,
            sourcemap: true
        }
    },
    // UMD bundle (for browser <script> tag)
    {
        ...baseInput,
        output: {
            file: 'dist/html2canvas-pro.js',
            format: 'umd',
            name: 'html2canvas',
            exports: 'named',
            banner,
            footer: umdFooter,
            sourcemap: true
        }
    },
    // Minified UMD bundle
    {
        ...baseInput,
        output: {
            file: 'dist/html2canvas-pro.min.js',
            format: 'umd',
            name: 'html2canvas',
            exports: 'named',
            banner,
            footer: umdFooter,
            minify: {
                compress: true,
                mangle: true,
                codegen: {
                    legalComments: 'inline'
                }
            }
        }
    }
]);
