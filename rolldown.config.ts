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
    // UMD bundle
    {
        ...baseInput,
        output: {
            file: pkg.main,
            format: 'umd',
            name: 'html2canvas',
            exports: 'named',
            banner,
            footer: umdFooter,
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
    }
]);
