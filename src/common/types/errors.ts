export class BaseError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: Record<string, any>
    ) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class InternalError extends BaseError {
    constructor(message: string, details?: Record<string, any>) {
        super(message, 'INTERNAL_ERROR', details);
    }
}

export class NotFoundError extends BaseError {
    constructor(message: string, details?: Record<string, any>) {
        super(message, 'NOT_FOUND', details);
    }
}

export class ValidationError extends BaseError {
    constructor(message: string, details?: Record<string, any>) {
        super(message, 'VALIDATION_ERROR', details);
    }
}
