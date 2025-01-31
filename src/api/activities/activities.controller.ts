import { HttpContext } from '@nitric/sdk';
import { validateAuth } from '../auth/auth.middleware';
import { errorHandler } from '../common/error-handler';
import { ActivitiesService } from '../../services/activities.service';
import { Activity } from './activities.types';
import { logger } from '../../common/logger';
import { validateQuery, PaginationSchema } from '../common/request-validation';

const activitiesService = new ActivitiesService();

export async function getActivities(ctx: HttpContext) {
  try {
    const authHeader = ctx.req.headers.authorization ? ctx.req.headers.authorization[0] : '';

    const claims = await validateAuth(authHeader);
    const orgId = claims.org_id;

    const query = await validateQuery(PaginationSchema)(ctx);

    logger.info('Fetching activities', { organizationId: orgId, query });

    const activities = await activitiesService.getActivities(orgId, query);

    ctx.res.json({
      success: true,
      data: { activities }
    });
    return ctx;
  } catch (error) {
    logger.error('Failed to get activities', { error });
    ctx.res.status = 500;
    ctx.res.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get activities'
      }
    });
    return ctx;
  }
}
