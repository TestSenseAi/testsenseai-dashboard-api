import { NotFoundError, ValidationError, InternalError, AppError } from '../errors';

describe('Custom Errors', () => {
    describe('AppError', () => {
        it('should create error with all parameters', () => {
            const error = new AppError('TEST_ERROR', 'Test message', 400, { detail: 'test' });
            expect(error.message).toBe('Test message');
            expect(error.code).toBe('TEST_ERROR');
            expect(error.statusCode).toBe(400);
            expect(error.details).toEqual({ detail: 'test' });
            expect(error.name).toBe('AppError');
            expect(error instanceof Error).toBe(true);
        });

        it('should create error with default status code', () => {
            const error = new AppError('TEST_ERROR', 'Test message');
            expect(error.statusCode).toBe(400);
        });
    });

    describe('NotFoundError', () => {
        it('should create error with entity and id', () => {
            const error = new NotFoundError('User', '123');
            expect(error.message).toBe('User with id 123 not found');
            expect(error.name).toBe('NotFoundError');
            expect(error.statusCode).toBe(404);
            expect(error.code).toBe('NOT_FOUND');
        });
    });

    describe('ValidationError', () => {
        it('should create error with message only', () => {
            const error = new ValidationError('Invalid input');
            expect(error.message).toBe('Invalid input');
            expect(error.name).toBe('ValidationError');
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe('VALIDATION_ERROR');
        });

        it('should create error with details', () => {
            const details = { field: 'email', issue: 'invalid format' };
            const error = new ValidationError('Invalid input', details);
            expect(error.details).toEqual(details);
        });
    });

    describe('InternalError', () => {
        it('should create error with message only', () => {
            const error = new InternalError('System failure');
            expect(error.message).toBe('System failure');
            expect(error.name).toBe('InternalError');
            expect(error.statusCode).toBe(500);
            expect(error.code).toBe('INTERNAL_ERROR');
        });

        it('should create error with details', () => {
            const cause = new Error('Original error');
            const error = new InternalError('System failure', { cause });
            expect(error.details).toEqual({ cause });
        });
    });
});
