// API Request/Response Types
export interface ApiResponse<T> {
    data: T;
    meta?: {
        timestamp: string;
        requestId: string;
    };
}

// Analysis API Types
export interface AnalysisRequest {
    context: {
        projectId: string;
        testId: string;
        parameters: Record<string, any>;
        metadata?: {
            environment: string;
            version: string;
            [key: string]: any;
        };
    };
    options: {
        priority: 'low' | 'medium' | 'high';
        notifyOnCompletion: boolean;
        analysisDepth: 'basic' | 'detailed' | 'comprehensive';
    };
}

export interface AnalysisResult {
    id: string;
    orgId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    updatedAt: string;
    result?: {
        summary: string;
        confidence: number;
        recommendations: Array<{
            priority: 'low' | 'medium' | 'high';
            title: string;
            description: string;
            category: string;
            actionable: boolean;
        }>;
        metrics: Record<string, any>;
        insights: Array<{
            message: string;
            type: 'info' | 'warning' | 'error';
            context: Record<string, any>;
        }>;
    };
    error?: {
        message: string;
        code: string;
        details?: Record<string, any>;
    };
}
