module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['src'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/__tests__/**',
        '!src/**/__mocks__/**',
        '!src/global.d.ts',
        '!src/invariant.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 10,
            functions: 10,
            lines: 10,
            statements: 10
        }
    }
};
