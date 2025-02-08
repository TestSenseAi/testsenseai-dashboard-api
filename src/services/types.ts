import { AxiosResponse } from 'axios';

// Core Analysis Types
export interface CoreAnalysisResponse {
    summary: string;
    confidence: number;
    recommendations: Array<{
        priority: 'low' | 'medium' | 'high';
        title: string;
        description: string;
        category: 'quality' | 'performance' | 'security';
        actionable: boolean;
    }>;
    metrics: Record<string, any>;
    insights: Array<{
        message: string;
        type: 'info' | 'warning' | 'error';
        context: Record<string, any>;
    }>;
}

export type CoreAnalysisRequest = {
    projectId: string;
    testId: string;
    parameters: Record<string, any>;
    metadata?: Record<string, any>;
};

// Service Function Types
export type PostFn = (url: string, data: any) => Promise<AxiosResponse<CoreAnalysisResponse>>;
export type GetFn = (url: string) => Promise<AxiosResponse>;

// Metrics Types
export interface MetricsSummary {
    totalUsers: number;
    activeUsers: number;
    totalTests: number;
    passedTests: number;
}

export interface MetricsTrend {
    date: string;
    tests: number;
    passed: number;
}

export interface MetricsQuery {
    startDate?: string;
    endDate?: string;
    interval?: 'day' | 'week' | 'month';
}
