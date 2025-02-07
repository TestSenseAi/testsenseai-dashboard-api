import axios, { AxiosInstance } from 'axios';
import { InternalError } from '../common/errors';
import { logger } from '../common/logger';
import { config } from '../config';

export class CoreAnalysisService {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: config.coreService.url,
            timeout: config.coreService.timeout,
        });
    }

    async analyzeTest(request: {
        projectId: string;
        testId: string;
        parameters: Record<string, unknown>;
        metadata: Record<string, unknown>;
    }) {
        try {
            logger.info('Calling core analysis service', {
                projectId: request.projectId,
                testId: request.testId,
            });

            const { data } = await this.client.post('/v1/analyze', request);

            logger.info('Core analysis service response received', {
                projectId: request.projectId,
                testId: request.testId,
                confidence: data.confidence,
            });

            return {
                summary: data.summary,
                confidence: data.confidence,
                recommendations: data.recommendations,
                metrics: data.metrics,
                insights: data.insights.map((insight: any) => ({
                    message: insight.message,
                    type: insight.type,
                    context: insight.context,
                })),
            };
        } catch (error) {
            logger.error('Core analysis service call failed', { error });
            throw new InternalError('Failed to analyze test');
        }
    }

    async getHealth(): Promise<boolean> {
        try {
            const { status } = await this.client.get('/health');
            return status === 200;
        } catch (error) {
            logger.error('Core service health check failed', { error });
            return false;
        }
    }
}
