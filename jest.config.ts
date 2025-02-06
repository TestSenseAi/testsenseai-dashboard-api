export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: 'tsconfig.json',
            },
        ],
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testMatch: ['**/src/**/__tests__/**/*.test.ts', '**/src/**/*.spec.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/docs/'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/*.test.{ts,tsx}', '!src/**/__tests__/**'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    transformIgnorePatterns: ['/node_modules/'],
    moduleDirectories: ['node_modules', 'src'],
    roots: ['<rootDir>/src'],
    modulePaths: ['<rootDir>/src'],
    modulePathIgnorePatterns: ['<rootDir>/dist/'],
    testEnvironmentOptions: {
        url: 'http://localhost',
    },
    injectGlobals: true,
};
