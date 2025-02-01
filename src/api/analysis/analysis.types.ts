import { z } from 'zod';

export const AnalysisRequestSchema = z.object({
    context: z.object({
        projectId: z.string(),
        testId: z.string(),
        parameters: z.record(z.string(), z.any()).optional(),
        metadata: z
            .object({
                environment: z.string(),
                version: z.string(),
                tags: z.array(z.string()).optional(),
            })
            .optional(),
    }),
    options: z
        .object({
            priority: z.enum(['low', 'medium', 'high']).default('medium'),
            notifyOnCompletion: z.boolean().default(false),
            analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed'),
            includeMetrics: z.array(z.enum(['performance', 'quality', 'coverage', 'security'])).optional(),
        })
        .optional(),
});

export const AnalysisResultSchema = z.object({
    id: z.string(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']),
    createdAt: z.string(),
    updatedAt: z.string(),
    orgId: z.string(),
    result: z
        .object({
            summary: z.string(),
            confidence: z.number().min(0).max(1),
            recommendations: z.array(
                z.object({
                    title: z.string(),
                    description: z.string(),
                    priority: z.enum(['low', 'medium', 'high']),
                    category: z.enum(['performance', 'quality', 'security', 'maintainability']),
                    actionable: z.boolean().default(true),
                })
            ),
            metrics: z.record(z.string(), z.number()).optional(),
            insights: z
                .array(
                    z.object({
                        type: z.enum(['improvement', 'warning', 'info']),
                        message: z.string(),
                        context: z.record(z.string(), z.any()).optional(),
                    })
                )
                .optional(),
        })
        .optional(),
    error: z
        .object({
            message: z.string(),
            code: z.string().optional(),
            details: z.record(z.string(), z.any()).optional(),
        })
        .optional(),
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
