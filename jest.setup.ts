// Set test environment variables
process.env.LOG_LEVEL = 'error';
process.env.NODE_ENV = 'test';

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
    value: {
        randomUUID: () => 'test-uuid',
    },
});
