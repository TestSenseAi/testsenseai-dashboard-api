import { kv } from '@nitric/sdk';
import { logger } from '../common/logger';
import { AnalysisRequest, AnalysisResult } from '../api/analysis/analysis.types';
import { NotFoundError, InternalError } from '../common/errors';
import { NotificationService } from './notification.service';
import { CoreAnalysisService } from './core-analysis.service';

interface Analysis extends AnalysisRequest {
    id: string;
    orgId: string;
    status: AnalysisResult['status'];
    createdAt: string;
    updatedAt: string;
    result?: AnalysisResult['result'];
    error?: AnalysisResult['error'];
}

interface ListAnalysesOptions {
    status?: AnalysisResult['status'];
    limit: number;
    cursor?: string;
}

interface ListAnalysesResult {
    items: Analysis[];
    nextCursor?: string;
}

const analysisStore = kv('analyses').allow('get', 'set', 'delete');

export class AnalysisService {
    private readonly coreAnalysisService: CoreAnalysisService;
    private readonly notificationService: NotificationService;

    constructor(coreAnalysisService: CoreAnalysisService, notificationService: NotificationService) {
        this.coreAnalysisService = coreAnalysisService;
        this.notificationService = notificationService;
    }

    public async createAnalysis(orgId: string, request: AnalysisRequest): Promise<Analysis> {
        const analysis: Analysis = {
            ...request,
            id: crypto.randomUUID(),
            orgId,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        try {
            await analysisStore.set(analysis.id, analysis);
            logger.info('Analysis created', { analysisId: analysis.id, orgId });

            // Start async analysis process without awaiting
            this.processAnalysis(analysis).catch(async error => {
                logger.error('Analysis processing failed', { analysisId: analysis.id, error });
                const errorMessage = error.message || 'Processing failed';
                await this.updateAnalysisError(analysis.id, {
                    message: errorMessage,
                    code: error.name || 'Error',
                    details: { timestamp: new Date().toISOString() },
                });
                await this.notificationService.notifyAnalysisFailed(analysis.orgId, analysis.id, errorMessage);
            });

            // Return the pending analysis immediately
            return analysis;
        } catch (error) {
            logger.error('Failed to create analysis', { error });
            throw new InternalError('Failed to create analysis');
        }
    }

    public async getAnalysis(orgId: string, analysisId: string): Promise<Analysis> {
        try {
            const result = await analysisStore.get(analysisId);
            const analysis = result as Analysis | null;

            if (!analysis || analysis.orgId !== orgId) {
                throw new NotFoundError('Analysis', analysisId);
            }

            return analysis;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Failed to get analysis', { analysisId, error });
            throw new InternalError('Failed to get analysis');
        }
    }

    public async listAnalyses(orgId: string, options: ListAnalysesOptions): Promise<ListAnalysesResult> {
        try {
            const { status, limit, cursor } = options;

            // Since Nitric KV doesn't support complex queries, we'll implement a simple scan
            const allKeys = await this.scanKeys();
            let analyses: Analysis[] = [];

            // Fetch all analyses
            for (const key of allKeys) {
                const result = await analysisStore.get(key);
                const analysis = result as Analysis | null;
                if (analysis && analysis.orgId === orgId && (!status || analysis.status === status)) {
                    analyses.push(analysis);
                }
            }

            // Sort by createdAt descending
            analyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            // Apply cursor-based pagination
            if (cursor) {
                const cursorIndex = analyses.findIndex(a => a.createdAt === cursor);
                if (cursorIndex !== -1) {
                    analyses = analyses.slice(cursorIndex + 1);
                }
            }

            // Get one more item than requested to determine if there are more pages
            const items = analyses.slice(0, limit);
            const nextCursor = analyses.length > limit ? analyses[limit - 1].createdAt : undefined;

            logger.info('Listed analyses', {
                orgId,
                status,
                limit,
                count: items.length,
                hasMore: !!nextCursor,
            });

            return {
                items,
                nextCursor,
            };
        } catch (error) {
            logger.error('Failed to list analyses', { orgId, error });
            throw new InternalError('Failed to list analyses');
        }
    }

    private async processAnalysis(analysis: Analysis): Promise<void> {
        try {
            // Update status to processing
            await this.updateAnalysisStatus(analysis.id, 'processing');

            // Call core service for analysis
            const result = await this.coreAnalysisService.analyzeTest({
                projectId: analysis.context.projectId,
                testId: analysis.context.testId,
                parameters: analysis.context.parameters || {},
                metadata: analysis.context.metadata || {},
            });

            // Update analysis with results
            await this.updateAnalysisResult(analysis.id, result);

            // Send notification if requested
            if (analysis.options?.notifyOnCompletion) {
                await this.notificationService.notifyAnalysisComplete(analysis.orgId, analysis.id, {
                    summary: result.summary,
                    recommendations: result.recommendations,
                });
            }
        } catch (error) {
            const errorDetails = {
                message: error instanceof Error ? error.message : 'Unknown error occurred',
                code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
                details: { timestamp: new Date().toISOString() },
            };

            await this.updateAnalysisError(analysis.id, errorDetails);

            if (analysis.options?.notifyOnCompletion) {
                await this.notificationService.notifyAnalysisFailed(analysis.orgId, analysis.id, errorDetails.message);
            }

            throw error;
        }
    }

    private async updateAnalysisStatus(analysisId: string, status: Analysis['status']): Promise<void> {
        const result = await analysisStore.get(analysisId);
        const stored = result as Analysis | null;
        if (!stored) {
            throw new NotFoundError('Analysis', analysisId);
        }

        stored.status = status;
        stored.updatedAt = new Date().toISOString();
        await analysisStore.set(analysisId, stored);
    }

    private async updateAnalysisResult(analysisId: string, result: AnalysisResult['result']): Promise<void> {
        const storedResult = await analysisStore.get(analysisId);
        const stored = storedResult as Analysis | null;
        if (!stored) {
            throw new NotFoundError('Analysis', analysisId);
        }

        stored.status = 'completed';
        stored.result = result;
        stored.updatedAt = new Date().toISOString();
        await analysisStore.set(analysisId, stored);
    }

    private async updateAnalysisError(analysisId: string, error: AnalysisResult['error']): Promise<void> {
        const result = await analysisStore.get(analysisId);
        const stored = result as Analysis | null;
        if (!stored) {
            throw new NotFoundError('Analysis', analysisId);
        }

        stored.status = 'failed';
        stored.error = error;
        stored.updatedAt = new Date().toISOString();
        await analysisStore.set(analysisId, stored);
    }

    private async scanKeys(): Promise<string[]> {
        try {
            // This is a placeholder - in a real implementation, you would need to implement
            // a way to list all keys, possibly using a secondary index or a separate list
            // For now, we'll throw an error to indicate this needs to be implemented
            throw new Error('Key scanning not implemented');
        } catch (error) {
            logger.error('Failed to scan keys', { error });
            throw new InternalError('Failed to scan keys');
        }
    }
}
