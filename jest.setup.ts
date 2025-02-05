import { jest } from '@jest/globals';
// Set test environment variables
process.env.LOG_LEVEL = 'error';
process.env.NODE_ENV = 'test';

// Mock console methods
const mockConsole = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: console.log,
};

// Replace console methods with mocks
Object.assign(console, mockConsole);

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
    value: {
        randomUUID: () => 'test-uuid',
    },
});

// Create a mock axios instance that will be returned by axios.create
export const mockAxiosInstance = {
    post: jest.fn(),
    get: jest.fn(),
};

// Ensure that axios is mocked early
jest.mock('axios', () => ({
    create: jest.fn(() => mockAxiosInstance),
    default: {
        create: jest.fn(() => mockAxiosInstance),
    },
}));

// Mock Nitric SDK with a consistent mock for both kv and websocket
jest.mock(
    '@nitric/sdk',
    () => ({
        kv: jest.fn(() => ({
            allow: jest.fn().mockReturnThis(),
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            list: jest.fn(),
            register: jest.fn(),
            permsToActions: jest.fn(),
            resourceType: 'kv',
            for: jest.fn(),
            name: 'test-kv',
            parent: undefined,
            ref: jest.fn(),
        })),
        websocket: jest.fn(() => ({
            send: jest.fn(),
            wsClient: {},
            register: jest.fn(),
            close: jest.fn(),
            url: '',
            resourceType: 'websocket',
            for: jest.fn(),
            name: 'test-websocket',
            parent: undefined,
            ref: jest.fn(),
            allow: jest.fn().mockReturnThis(),
            permsToActions: jest.fn(),
        })),
    }),
    { virtual: true }
);
