import axios from 'axios';
import { logger } from '../common/logger';
import { AnalysisResult } from '../api/analysis/analysis.types';
import { InternalError } from '../common/errors';
import { config } from '../config';

interface CoreAnalysisRequest {
    projectId: string;
    testId: string;
    parameters?: Record<string, any>;
    metadata?: {
        environment?: string;
        version?: string;
        tags?: string[];
    };
}

interface CoreAnalysisResponse {
    summary: string;
    confidence: number;
    recommendations: Array<{
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high';
        category: 'performance' | 'quality' | 'security' | 'maintainability';
        actionable: boolean;
    }>;
    metrics: Record<string, number>;
    insights: Array<{
        type: 'improvement' | 'warning' | 'info';
        message: string;
        context?: Record<string, any>;
    }>;
}

export class CoreAnalysisService {
    // Remove early instantiation
    // private client = axios.create({...});

    // Add lazy getter for the client
    private getClient() {
        return axios.create({
            baseURL: config.coreService.url,
            timeout: config.coreService.timeout,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.coreService.apiKey,
            },
        });
    }

    public async analyzeTest(request: CoreAnalysisRequest): Promise<NonNullable<AnalysisResult['result']>> {
        try {
            logger.info('Calling core analysis service', {
                projectId: request.projectId,
                testId: request.testId,
            });

            const client = this.getClient();
            const { data } = await client.post<CoreAnalysisResponse>('/v1/analyze', request);

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
                insights: data.insights,
            };
        } catch (error) {
            logger.error('Core analysis service call failed', { error });
            throw new InternalError('Failed to analyze test');
        }
    }

    public async getHealth(): Promise<boolean> {
        try {
            const client = this.getClient();
            const { status } = await client.get('/health');
            return status === 200;
        } catch (error) {
            logger.error('Core service health check failed', { error });
            return false;
        }
    }
}
