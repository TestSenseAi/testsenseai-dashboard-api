/// <reference types="jest" />
import { Logger } from '../logger';
import { jest } from '@jest/globals';

describe('Logger', () => {
    let logger: Logger;
    let mockDate: string;
    let originalConsole: typeof console;
    let originalLogLevel: string | undefined;

    beforeEach(() => {
        jest.clearAllMocks();
        originalConsole = { ...console };
        originalLogLevel = process.env.LOG_LEVEL;
        console.error = jest.fn();
        console.warn = jest.fn();
        console.info = jest.fn();
        console.debug = jest.fn();
        mockDate = '2025-02-03T10:25:30.783Z';
        jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
        process.env.LOG_LEVEL = 'debug';
        logger = new Logger();
    });

    afterEach(() => {
        Object.assign(console, originalConsole);
        process.env.LOG_LEVEL = originalLogLevel;
        jest.restoreAllMocks();
    });

    test('should log error messages', () => {
        const message = 'Test error message';
        const expectedLog = {
            level: 'error',
            message,
            timestamp: mockDate,
        };

        logger.error(message);
        expect(console.error).toHaveBeenCalledWith(JSON.stringify(expectedLog));
    });

    test('should log warning messages', () => {
        const message = 'Test warning message';
        const expectedLog = {
            level: 'warn',
            message,
            timestamp: mockDate,
        };

        logger.warn(message);
        expect(console.warn).toHaveBeenCalledWith(JSON.stringify(expectedLog));
    });

    test('should log info messages', () => {
        const message = 'Test info message';
        const expectedLog = {
            level: 'info',
            message,
            timestamp: mockDate,
        };

        logger.info(message);
        expect(console.info).toHaveBeenCalledWith(JSON.stringify(expectedLog));
    });

    test('should log debug messages', () => {
        const message = 'Test debug message';
        const expectedLog = {
            level: 'debug',
            message,
            timestamp: mockDate,
        };

        logger.debug(message);
        expect(console.debug).toHaveBeenCalledWith(JSON.stringify(expectedLog));
    });

    test('should respect log level settings', () => {
        process.env.LOG_LEVEL = 'warn';
        logger = new Logger();

        logger.debug('Debug message');
        logger.info('Info message');
        logger.warn('Warning message');
        logger.error('Error message');

        expect(console.debug).not.toHaveBeenCalled();
        expect(console.info).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();
    });
});
