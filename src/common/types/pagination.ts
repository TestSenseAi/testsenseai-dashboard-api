export type PaginationOptions = {
    limit?: number;
    cursor?: string;
    filter?: Record<string, any>;
    sort?: {
        field: string;
        order: 'asc' | 'desc';
    };
};

export type PaginatedResponse<T> = {
    items: T[];
    nextCursor?: string;
    total?: number;
    hasMore: boolean;
};
