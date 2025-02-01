import { HttpContext } from '@nitric/sdk';
import { z } from 'zod';

export class ValidationError extends Error {
    constructor(public errors: z.ZodError) {
        super('Validation failed');
        this.name = 'ValidationError';
    }
}

export function validateRequest<T extends z.ZodType>(schema: T) {
    return async (ctx: HttpContext) => {
        let body: unknown;
        const contentType = ctx.req.headers['content-type'];

        if (!contentType || !contentType.includes('application/json')) {
            throw new ValidationError(
                new z.ZodError([
                    {
                        code: z.ZodIssueCode.custom,
                        path: [],
                        message: 'Content-Type must be application/json',
                    },
                ])
            );
        }

        try {
            // In Nitric, the request content is already parsed and available in ctx.req.json()
            body = await ctx.req.json();
        } catch {
            throw new ValidationError(
                new z.ZodError([
                    {
                        code: z.ZodIssueCode.custom,
                        path: [],
                        message: 'Invalid JSON body',
                    },
                ])
            );
        }

        const result = schema.safeParse(body);

        if (!result.success) {
            throw new ValidationError(result.error);
        }

        return result.data as z.infer<T>;
    };
}

export function validateQuery<T extends z.ZodType>(schema: T) {
    return async (ctx: HttpContext) => {
        const result = schema.safeParse(ctx.req.query);

        if (!result.success) {
            throw new ValidationError(result.error);
        }

        return result.data as z.infer<T>;
    };
}

// Common schemas
export const PaginationSchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const TimeRangeSchema = z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
});
