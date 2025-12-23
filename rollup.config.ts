import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import { readFileSync } from 'fs';

// Rollup v4 requires ESM, use readFileSync instead of require()
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const banner = `/*!
 * ${pkg.name} ${pkg.version} <${pkg.homepage}>
 * Copyright (c) 2024-present yorickshan and html2canvas-pro contributors
 * Released under ${pkg.license} License
 */`;

export default {
    input: `src/index.ts`,
    output: [
        { file: pkg.main, name: 'html2canvas', format: 'umd', banner, sourcemap: true, exports: 'named' },
        { file: pkg.module, format: 'esm', banner, sourcemap: true },
    ],
    external: [],
    watch: {
        include: 'src/**',
    },
    plugins: [
        // Allow node_modules resolution, so you can use 'external' to control
        // which external modules to include in the bundle
        // https://github.com/rollup/rollup-plugin-node-resolve#usage
        resolve(),
        // Allow json resolution
        json(),
        // Compile TypeScript files
        typescript({ 
            sourceMap: true, 
            inlineSources: true,
            compilerOptions: {
                outDir: 'dist',
                declarationDir: 'dist/types'
            }
        }),
        // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
        commonjs({
            include: 'node_modules/**'
        }),
        // Resolve source maps to the original source
        sourceMaps(),
    ],
}
