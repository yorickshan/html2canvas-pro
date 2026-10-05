import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

const sharedRules = {
    ...prettierConfig.rules,
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'prettier/prettier': 'error'
};

export default [
    {
        // Library and test sources: full TypeScript-aware parsing.
        files: ['src/**/*.ts', 'tests/**/*.ts'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                project: ['./tsconfig.json', './tests/tsconfig.json'],
                ecmaVersion: 2022,
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            prettier: prettier,
        },
        rules: {
            ...sharedRules,
            '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
            '@typescript-eslint/interface-name-prefix': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-use-before-define': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/class-name-casing': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
        },
    },
    {
        // Build/CI helper scripts: run through tsx/node outside any tsconfig
        // project, so lint them without type-aware parserOptions.
        files: ['scripts/**/*.ts', 'scripts/**/*.mjs'],
        languageOptions: {
            parser: tsparser,
            ecmaVersion: 2022,
            sourceType: 'module',
        },
        plugins: {
            '@typescript-eslint': tseslint,
            prettier: prettier,
        },
        rules: {
            ...sharedRules,
            // CLI helpers print their regression/benchmark reports via console.
            'no-console': 'off',
        },
    },
];
