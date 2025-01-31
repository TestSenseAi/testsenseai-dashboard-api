import { api, HttpContext } from '@nitric/sdk';
import { z } from 'zod';
import { errorHandler } from './common/error-handler';
import { rateLimiter } from './common/rate-limiter';
import { validateAuth } from './auth/auth.middleware';
import { config } from '../config/index';
import { logger } from '../common/logger';
import { getMetricsSummary, getMetricsTrends } from './metrics/metrics.controller';
import { getActivities } from './activities/activities.controller';
import { onMessage } from './websockets/realtime.controller';

// Common response types
export const ApiResponse = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
});

export type ApiResponse = z.infer<typeof ApiResponse>;

// API Definition with middleware
export const createdApi = api('dashboard', {
  middleware: [
    errorHandler,
    rateLimiter({
      windowMs: config.rateLimit.window,
      max: config.rateLimit.max,
    }),
  ],
});

// Public endpoints
createdApi.get('/health', async (ctx: HttpContext) => {
  return ctx.res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.env,
    },
  });
});

// Protected endpoints
createdApi.get('/me', async (ctx: HttpContext) => {
  const authToken = Array.isArray(ctx.req.headers.authorization)
    ? ctx.req.headers.authorization[0]
    : ctx.req.headers.authorization;
  const claims = await validateAuth(authToken);

  logger.info('User profile accessed', {
    userId: claims.sub,
    organizationId: claims.org_id,
  });

  return ctx.res.json({
    success: true,
    data: {
      id: claims.sub,
      email: claims.email,
      organizationId: claims.org_id,
      roles: claims.roles,
    },
  });
});

// Metrics endpoints
createdApi.get('/metrics/summary', getMetricsSummary);
createdApi.get('/metrics/trends', getMetricsTrends);

// Activities endpoints
createdApi.get('/activities', getActivities);

// WebSocket handling is done through the websocket function in realtime.controller.ts

// Note: Analysis endpoints are now defined directly in analysis.controller.ts using Nitric's API builder
