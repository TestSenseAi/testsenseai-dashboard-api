/// <reference types="jest" />

import { Logger } from '../logger';

describe('Logger', () => {
    const originalConsole = { ...console };
    const mockConsole = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    };

    beforeAll(() => {
        console.error = mockConsole.error;
        console.warn = mockConsole.warn;
        console.info = mockConsole.info;
        console.debug = mockConsole.debug;
    });

    afterAll(() => {
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
        console.info = originalConsole.info;
        console.debug = originalConsole.debug;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.LOG_LEVEL = 'debug';
    });

    afterEach(() => {
        delete process.env.LOG_LEVEL;
    });

    it('should log error messages', () => {
        const logger = new Logger();
        const error = new Error('Test error');
        logger.error('Error message', { userId: '123' }, error);

        expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('"level":"error"'));
        expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('"message":"Error message"'));
        expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('"userId":"123"'));
        expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('"name":"Error"'));
        expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('"message":"Test error"'));
    });

    it('should log warning messages', () => {
        const logger = new Logger();
        logger.warn('Warning message', { userId: '123' });

        expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('"level":"warn"'));
        expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('"message":"Warning message"'));
        expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('"userId":"123"'));
    });

    it('should log info messages', () => {
        const logger = new Logger();
        logger.info('Info message', { userId: '123' });

        expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('"level":"info"'));
        expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('"message":"Info message"'));
        expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('"userId":"123"'));
    });

    it('should log debug messages', () => {
        const logger = new Logger();
        logger.debug('Debug message', { userId: '123' });

        expect(mockConsole.debug).toHaveBeenCalledWith(expect.stringContaining('"level":"debug"'));
        expect(mockConsole.debug).toHaveBeenCalledWith(expect.stringContaining('"message":"Debug message"'));
        expect(mockConsole.debug).toHaveBeenCalledWith(expect.stringContaining('"userId":"123"'));
    });

    it('should respect log level settings', () => {
        process.env.LOG_LEVEL = 'warn';
        const logger = new Logger();

        logger.info('This should not be logged');
        logger.warn('This should be logged');
        logger.error('This should be logged');

        expect(mockConsole.info).not.toHaveBeenCalled();
        expect(mockConsole.warn).toHaveBeenCalled();
        expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should handle invalid log levels', () => {
        process.env.LOG_LEVEL = 'invalid';
        const logger = new Logger();

        logger.info('This should be logged');
        expect(mockConsole.info).toHaveBeenCalled();
    });
});
