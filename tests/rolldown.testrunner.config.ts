import { defineConfig } from 'rolldown';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

const banner = `/*
 * ${pkg.name} ${pkg.version} <${pkg.homepage}>
 * Copyright (c) 2024-present yorickshan and html2canvas-pro contributors
 * Released under ${pkg.license} License
 */`;

export default defineConfig({
    input: 'tests/testrunner.ts',
    output: {
        file: resolve(__dirname, '../build/testrunner.js'),
        format: 'iife',
        name: 'testrunner',
        banner,
        sourcemap: true
    },
    resolve: {
        extensions: ['.ts', '.js', '.json']
    },
    platform: 'browser',
    external: []
});
