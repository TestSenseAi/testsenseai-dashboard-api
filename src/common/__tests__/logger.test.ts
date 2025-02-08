// logger.test.ts
import { Logger, logger } from '../logger';

describe('logger', () => {
    // Store original console methods
    const originalConsole = {
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug,
    };

    beforeEach(() => {
        // Clean mocks before each test
        jest.clearAllMocks();

        // Mock console methods
        console.error = jest.fn();
        console.warn = jest.fn();
        console.info = jest.fn();
        console.debug = jest.fn();

        // Reset environment
        process.env.LOG_LEVEL = 'debug';
    });

    afterEach(() => {
        // Restore original console methods
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
        console.info = originalConsole.info;
        console.debug = originalConsole.debug;

        delete process.env.LOG_LEVEL;
    });

    describe('singleton behavior', () => {
        it('should maintain a single instance', () => {
            const instance1 = Logger.getInstance();
            const instance2 = Logger.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('log level behavior', () => {
        it('should respect log level settings', () => {
            // Set to error level
            process.env.LOG_LEVEL = 'error';
            const testLogger = new Logger(); // Create new instance to pick up env change

            testLogger.warn('Test warning');
            testLogger.info('Test info');
            testLogger.debug('Test debug');

            expect(console.warn).not.toHaveBeenCalled();
            expect(console.info).not.toHaveBeenCalled();
            expect(console.debug).not.toHaveBeenCalled();
        });
    });

    describe('logging functionality', () => {
        it('should handle circular references in metadata', () => {
            const circularObj: any = { foo: 'bar' };
            circularObj.self = circularObj;

            logger.info('Test message', circularObj);

            expect(console.info).toHaveBeenCalledWith(expect.stringContaining('[Circular]'));
            expect(console.info).toHaveBeenCalledWith(expect.stringContaining('foo'));
        });

        it('should properly format error objects', () => {
            const testError = new Error('Test error');
            testError.stack = 'Error: Test error\n    at Test.stack';

            logger.error('Error occurred', { additionalInfo: 'test' }, testError);

            const loggedMessage = (console.error as jest.Mock).mock.calls[0][0];
            const parsedLog = JSON.parse(loggedMessage);

            expect(parsedLog.message).toBe('Error occurred');
            expect(parsedLog.error.message).toBe('Test error');
            expect(parsedLog.error.stack).toBe(testError.stack);
            expect(parsedLog.context).toEqual({ additionalInfo: 'test' });
        });

        it('should include ISO timestamp in logs', () => {
            logger.info('Test message');

            const loggedMessage = (console.info as jest.Mock).mock.calls[0][0];
            const parsedLog = JSON.parse(loggedMessage);

            expect(parsedLog.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
    });

    describe('context handling', () => {
        it('should handle undefined context', () => {
            logger.info('Test message');

            const loggedMessage = (console.info as jest.Mock).mock.calls[0][0];
            const parsedLog = JSON.parse(loggedMessage);

            expect(parsedLog.context).toBeUndefined();
        });

        it('should include context in log output', () => {
            const context = {
                organizationId: 'org-123',
                userId: 'user-456',
                correlationId: 'corr-789',
            };

            logger.info('Test message', context);

            const loggedMessage = (console.info as jest.Mock).mock.calls[0][0];
            const parsedLog = JSON.parse(loggedMessage);

            expect(parsedLog.context).toEqual(context);
        });
    });
});
