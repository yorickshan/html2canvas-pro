import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// Rollup v4 requires ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

const banner = `/*
 * ${pkg.name} ${pkg.version} <${pkg.homepage}>
 * Copyright (c) 2024-present yorickshan and html2canvas-pro contributors
 * Released under ${pkg.license} License
 */`;

export default {
    input: `tests/testrunner.ts`,
    output: [
        {
            file: resolve(__dirname, '../build/testrunner.js'),
            name: 'testrunner',
            format: 'iife',
            banner,
            sourcemap: true
        }
    ],
    external: [],
    watch: {
        include: 'tests/**'
    },
    plugins: [
        // Compile TypeScript files
        typescript({
            tsconfig: resolve(__dirname, 'tsconfig.json'),
            compilerOptions: {
                outDir: 'build',
                declarationDir: null
            }
        }),
        // Allow node_modules resolution
        nodeResolve({
            extensions: ['.ts', '.js', '.json']
        }),
        // Allow json resolution
        json(),
        // Allow bundling cjs modules
        commonjs({
            include: 'node_modules/**'
        }),
        // Resolve source maps to the original source
        sourceMaps()
    ]
};
