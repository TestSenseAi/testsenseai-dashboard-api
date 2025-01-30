import { HttpContext } from '@nitric/sdk';
import { validateAuth } from '../auth/auth.middleware';
import { MetricsService } from '../../services/metrics.service';
import { logger } from '../../common/logger';
import { validateQuery, TimeRangeSchema } from '../common/request-validation';

const metricsService = new MetricsService();

export async function getMetricsSummary(ctx: HttpContext) {
  const authToken = Array.isArray(ctx.req.headers.authorization) ? ctx.req.headers.authorization[0] : ctx.req.headers.authorization;
  const claims = await validateAuth(authToken);
  const orgId = claims.org_id;

  logger.info('Fetching metrics summary', { organizationId: orgId });

  const summary = await metricsService.getSummary(orgId);

  return ctx.res.json({
    success: true,
    data: summary,
  });
}

export async function getMetricsTrends(ctx: HttpContext) {
  const authToken = Array.isArray(ctx.req.headers.authorization) ? ctx.req.headers.authorization[0] : ctx.req.headers.authorization;
  const claims = await validateAuth(authToken);
  const orgId = claims.org_id;

  const query = await validateQuery(TimeRangeSchema)(ctx);

  logger.info('Fetching metrics trends', { organizationId: orgId, query });

  const trends = await metricsService.getTrends(orgId, query);

  return ctx.res.json({
    success: true,
    data: trends,
  });
}