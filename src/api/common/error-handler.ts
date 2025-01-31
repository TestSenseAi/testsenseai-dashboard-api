import { HttpContext, HttpMiddleware } from '@nitric/sdk';
import { AuthError } from '../auth/auth.middleware';
import { ZodError } from 'zod';

export const errorHandler: HttpMiddleware = async (ctx: HttpContext, next?: HttpMiddleware) => {
    try {
        if (next) {
            await next(ctx);
        }
    } catch (error) {
        console.error('API Error:', error);

        if (error instanceof AuthError) {
            ctx.res.headers = {
                'Content-Type': ['application/json'],
            };
            ctx.res.status = 401;
            ctx.res.body = JSON.stringify({
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                },
            });
            return ctx;
        }

        if (error instanceof ZodError) {
            ctx.res.headers = {
                'Content-Type': ['application/json'],
            };
            ctx.res.status = 400;
            ctx.res.body = JSON.stringify({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request data',
                    details: error.errors,
                },
            });
            return ctx;
        }

        // Default error response
        ctx.res.headers = {
            'Content-Type': ['application/json'],
        };
        ctx.res.status = 500;
        ctx.res.body = JSON.stringify({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
            },
        });
        return ctx;
    }
    return ctx;
};
