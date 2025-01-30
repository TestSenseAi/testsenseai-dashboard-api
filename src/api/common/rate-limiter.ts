import { HttpContext, HttpMiddleware } from '@nitric/sdk';
import Redis from 'ioredis';
import { validateAuth } from '../auth/auth.middleware';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

const defaultOptions: RateLimitOptions = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP/user to 100 requests per windowMs
  keyPrefix: 'rl:', // Redis key prefix
};

export const rateLimiter = (options: Partial<RateLimitOptions> = {}): HttpMiddleware => {
  const opts = { ...defaultOptions, ...options };

  return async (ctx: HttpContext, next?: HttpMiddleware) => {
    try {
      // Get user or IP identifier
      let identifier: string;
      try {
        const authToken = Array.isArray(ctx.req.headers.authorization) ? ctx.req.headers.authorization[0] : ctx.req.headers.authorization;
        const claims = await validateAuth(authToken);
        identifier = claims.sub; // Use user ID if authenticated
      } catch {
        // Fallback to IP address if not authenticated
        identifier = (ctx.req.headers['x-forwarded-for'] || ctx.req.headers['x-real-ip'] || 'unknown')[0];
      }

      const key = `${opts.keyPrefix}${identifier}`;
      const now = Date.now();
      const windowStart = now - opts.windowMs;

      // Clean old requests and add new one
      const multi = redis.multi();
      multi.zremrangebyscore(key, 0, windowStart);
      multi.zadd(key, now, `${now}`);
      multi.zcard(key);
      multi.pexpire(key, opts.windowMs);

      const results = await multi.exec();
      const requestCount = results ? Number(results[2]?.[1]) || 0 : 0;

      if (requestCount > opts.max) {
        ctx.res.headers = {
          'Content-Type': ['application/json'],
          'Retry-After': [Math.ceil(opts.windowMs / 1000).toString()]
        };
        ctx.res.status = 429;
        ctx.res.body = JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.',
          },
        });
        return ctx;
      }

      // Add rate limit info to response headers
      ctx.res.headers = {
        ...ctx.res.headers,
        'X-RateLimit-Limit': [opts.max.toString()],
        'X-RateLimit-Remaining': [Math.max(0, opts.max - requestCount).toString()],
        'X-RateLimit-Reset': [Math.ceil((windowStart + opts.windowMs) / 1000).toString()]
      };

      if (next) {
        return next(ctx);
      }
      return ctx;
    } catch (error) {
      // In case of Redis errors, we should not block the request
      console.error('Rate limiter error:', error);
      if (next) {
        return next(ctx);
      }
      return ctx;
    }
  };
};