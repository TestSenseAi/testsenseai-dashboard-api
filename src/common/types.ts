// Error Types
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

// Common Utility Types
export type PaginationOptions = {
    limit?: number;
    cursor?: string;
};

export type PaginatedResponse<T> = {
    items: T[];
    nextCursor?: string;
};
