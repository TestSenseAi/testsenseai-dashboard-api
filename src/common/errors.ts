export class AppError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 400,
        public details?: unknown
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: unknown) {
        super('VALIDATION_ERROR', message, 400, details);
        this.name = 'ValidationError';
    }
}

/**
 * Custom error class representing a "Not Found" error.
 */
export class NotFoundError extends AppError {
    /**
     * Creates a new instance of the NotFoundError class.
     * @param entity The type of entity that was not found.
     * @param id The ID of the entity that was not found.
     */
    constructor(entity: string, id: string) {
        super('NOT_FOUND', `${entity} with id ${id} not found`, 404);
        this.name = 'NotFoundError';
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string) {
        super('UNAUTHORIZED', message, 401);
        this.name = 'AuthorizationError';
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super('CONFLICT', message, 409);
        this.name = 'ConflictError';
    }
}

export class InternalError extends AppError {
    constructor(message: string, details?: unknown) {
        super('INTERNAL_ERROR', message, 500, details);
        this.name = 'InternalError';
    }
}
