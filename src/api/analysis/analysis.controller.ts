import { api, HttpContext } from '@nitric/sdk';
import { AnalysisService } from '../../services/analysis.service';
import { AnalysisRequestSchema, AnalysisResult } from './analysis.types';
import { logger } from '../../common/logger';
import { NotFoundError } from '../../common/errors';

const analysisApi = api('analysis');
const analysisService = new AnalysisService();

// Create analysis endpoint
analysisApi.post('/v1/analyses', async (ctx: HttpContext) => {
    try {
        const orgId = ctx.req.headers['x-organization-id'];
        if (!orgId || Array.isArray(orgId)) {
            ctx.res.status = 401;
            return ctx.res.json({ error: 'Unauthorized - Missing or invalid organization ID' });
        }

        const validatedBody = AnalysisRequestSchema.safeParse(ctx.req.json);
        if (!validatedBody.success) {
            ctx.res.status = 400;
            return ctx.res.json({
                error: 'Invalid request body',
                details: validatedBody.error.issues,
            });
        }

        const analysis = await analysisService.createAnalysis(orgId, validatedBody.data);
        ctx.res.status = 202;
        return ctx.res.json(analysis);
    } catch (error) {
        logger.error('Failed to create analysis', { error });
        ctx.res.status = 500;
        return ctx.res.json({ error: 'Internal server error' });
    }
});

// Get analysis by ID endpoint
analysisApi.get('/v1/analyses/:analysisId', async (ctx: HttpContext) => {
    try {
        const orgId = ctx.req.headers['x-organization-id'];
        if (!orgId || Array.isArray(orgId)) {
            ctx.res.status = 401;
            return ctx.res.json({ error: 'Unauthorized - Missing or invalid organization ID' });
        }

        const analysisId = ctx.req.params['analysisId'];
        if (!analysisId) {
            ctx.res.status = 400;
            return ctx.res.json({ error: 'Missing analysis ID' });
        }

        try {
            const analysis = await analysisService.getAnalysis(orgId, analysisId);
            ctx.res.status = 200;
            return ctx.res.json(analysis);
        } catch (error) {
            if (error instanceof NotFoundError) {
                ctx.res.status = 404;
                return ctx.res.json({ error: error.message });
            }
            throw error;
        }
    } catch (error) {
        logger.error('Failed to get analysis', { error });
        ctx.res.status = 500;
        return ctx.res.json({ error: 'Internal server error' });
    }
});

// List analyses endpoint
analysisApi.get('/v1/analyses', async (ctx: HttpContext) => {
    try {
        const orgId = ctx.req.headers['x-organization-id'];
        if (!orgId || Array.isArray(orgId)) {
            ctx.res.status = 401;
            return ctx.res.json({ error: 'Unauthorized - Missing or invalid organization ID' });
        }

        const { query } = ctx.req;
        const rawStatus = Array.isArray(query['status']) ? query['status'][0] : query['status'];
        const status = rawStatus as AnalysisResult['status'] | undefined;
        const limit = Math.min(
            parseInt(Array.isArray(query['limit']) ? query['limit'][0] : query['limit'] || '10', 10),
            100
        );
        const cursor = Array.isArray(query['cursor']) ? query['cursor'][0] : query['cursor'];

        // Validate status if provided
        if (status && !['pending', 'processing', 'completed', 'failed'].includes(status)) {
            ctx.res.status = 400;
            return ctx.res.json({ error: 'Invalid status value' });
        }

        const analyses = await analysisService.listAnalyses(orgId, {
            status,
            limit,
            cursor,
        });

        ctx.res.status = 200;
        return ctx.res.json(analyses);
    } catch (error) {
        logger.error('Failed to list analyses', { error });
        ctx.res.status = 500;
        return ctx.res.json({ error: 'Internal server error' });
    }
});
