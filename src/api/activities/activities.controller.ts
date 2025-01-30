import { HttpContext } from '@nitric/sdk';
import { validateAuth } from '../auth/auth.middleware';
import { ActivitiesService } from '../../services/activities.service';
import { logger } from '../../common/logger';
import { validateQuery, PaginationSchema } from '../common/request-validation';

const activitiesService = new ActivitiesService();

export async function getActivities(ctx: HttpContext) {
  const authToken = Array.isArray(ctx.req.headers.authorization) ? ctx.req.headers.authorization[0] : ctx.req.headers.authorization;
  const claims = await validateAuth(authToken);
  const orgId = claims.org_id;

  const query = await validateQuery(PaginationSchema)(ctx);

  logger.info('Fetching activities', { organizationId: orgId, query });

  const activities = await activitiesService.getActivities(orgId, query);

  return ctx.res.json({
    success: true,
    data: activities,
  });
}