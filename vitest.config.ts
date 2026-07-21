import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/**/__tests__/**/*.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/__tests__/**',
                'src/**/__mocks__/**',
                'src/global.d.ts'
            ],
            thresholds: {
                branches: 70,
                functions: 75,
                lines: 60,
                statements: 60
            }
        }
    }
});
