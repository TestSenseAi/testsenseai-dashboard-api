/// <reference types="jest" />

import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
  InternalError,
} from '../errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an AppError with default status code', () => {
      const error = new AppError('TEST_ERROR', 'Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('AppError');
    });

    it('should create an AppError with custom status code and details', () => {
      const details = { field: 'test' };
      const error = new AppError('TEST_ERROR', 'Test error message', 422, details);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual(details);
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError', () => {
      const details = { field: 'invalid' };
      const error = new ValidationError('Invalid input', details);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError', () => {
      const error = new NotFoundError('User', '123');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('User with id 123 not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });
  });

  describe('AuthorizationError', () => {
    it('should create an AuthorizationError', () => {
      const error = new AuthorizationError('Invalid token');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthorizationError');
    });
  });

  describe('ConflictError', () => {
    it('should create a ConflictError', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.name).toBe('ConflictError');
    });
  });

  describe('InternalError', () => {
    it('should create an InternalError', () => {
      const details = { cause: 'Database connection failed' };
      const error = new InternalError('Internal server error', details);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual(details);
      expect(error.name).toBe('InternalError');
    });
  });
});
