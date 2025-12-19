import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                project: ['./tsconfig.json', './tests/tsconfig.json'],
                ecmaVersion: 2018,
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            prettier: prettier,
        },
        rules: {
            ...prettierConfig.rules,
            'no-console': ['error', { allow: ['warn', 'error'] }],
            '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
            '@typescript-eslint/interface-name-prefix': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-use-before-define': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/class-name-casing': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            'prettier/prettier': 'error',
        },
    },
];

