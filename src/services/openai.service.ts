import OpenAI from 'openai';
import { logger } from '../common/logger';
import { InternalError } from '../common/errors';
import { config } from '../config';
import { AnalysisResult } from '../api/analysis/analysis.types';

export class OpenAIService {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({
            apiKey: config.openai.apiKey,
        });
    }

    public async analyzeTest(
        projectId: string,
        testId: string,
        parameters: Record<string, any> = {},
        options: {
            model?: 'gpt-4' | 'gpt-3.5-turbo';
            temperature?: number;
        } = {}
    ): Promise<AnalysisResult> {
        try {
            const { model = 'gpt-4', temperature = 0.7 } = options;

            const response = await this.client.chat.completions.create({
                model,
                temperature,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert test analysis system. Analyze the test data and provide insights, recommendations, and metrics.
            Focus on performance, reliability, security, and maintainability aspects.
            Provide specific, actionable recommendations.`,
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            projectId,
                            testId,
                            parameters,
                        }),
                    },
                ],
                response_format: { type: 'json_object' },
            });

            const result = JSON.parse(response.choices[0]?.message?.content || '{}');

            // Ensure the response matches our expected format
            const analysis: AnalysisResult = {
                status: 'completed',
                id: 'analysis-123',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                orgId: 'org-123',
                result: {
                    summary: result.summary || 'Analysis completed',
                    confidence: result.confidence || 0.8,
                    recommendations: (result.recommendations || []).map((rec: any) => ({
                        title: rec.title || 'Recommendation',
                        description: rec.description || 'No description provided',
                        priority: rec.priority || 'medium',
                        category: rec.category || 'maintainability',
                        actionable: rec.actionable || true,
                    })),
                },
            };

            return analysis;
        } catch (error) {
            logger.error('OpenAI analysis failed', { error });
            throw new InternalError('Failed to analyze test data');
        }
    }
}
