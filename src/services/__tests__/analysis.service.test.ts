// Establish mocks before any imports
jest.mock('@/common/logger');
jest.mock('@nitric/sdk', () => ({
    kv: jest.fn().mockReturnValue({
        set: jest.fn().mockImplementation(async () => undefined),
        get: jest.fn().mockImplementation(async (...args: any[]) => {
            const key = args[0];
            return {
                id: key,
                orgId: 'org-123',
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                context: {
                    projectId: 'proj-123',
                    testId: 'test-123',
                    parameters: {},
                    metadata: {},
                },
                options: {
                    priority: 'high',
                    notifyOnCompletion: true,
                    analysisDepth: 'detailed',
                },
            };
        }),
        allow: jest.fn().mockReturnThis(),
    }),
}));

import { jest } from '@jest/globals';
import { kv, KeyValueStoreResource } from '@nitric/sdk';
import { logger } from '@/common/logger';
import { InternalError } from '@/common/errors';
import { AnalysisService } from '../analysis.service';
import { AnalysisRequest } from '../../api/analysis/analysis.types';
import { NotificationService } from '../notification.service';
import { CoreAnalysisService } from '../core-analysis.service';

// Get the mocked kv store
const mockKvStore = kv('analyses') as unknown as jest.Mocked<KeyValueStoreResource<any>> & {
    set: jest.MockedFunction<(key: string, value: any) => Promise<void>>;
    get: jest.MockedFunction<(key: string) => Promise<any>>;
};

// Create strongly-typed test fixtures
const dummyAnalysisResult = {
    summary: 'Test analysis summary',
    confidence: 0.9,
    recommendations: [
        {
            title: 'Improve tests',
            description: 'Increase test coverage',
            priority: 'high',
            category: 'quality',
            actionable: true,
        },
    ],
    metrics: { coverage: 85 },
    insights: [
        {
            message: 'Potential performance issue',
            type: 'warning',
            context: { metric: 'load_time' },
        },
    ],
} as const;

const dummyRequest: AnalysisRequest = {
    context: {
        projectId: 'proj-123',
        testId: 'test-123',
        parameters: { param1: 'value1' },
        metadata: { environment: 'test', version: '1.0.0' },
    },
    options: {
        priority: 'high',
        notifyOnCompletion: true,
        analysisDepth: 'detailed',
    },
};

function createDummyAnalysis(overrides: Partial<any> = {}) {
    return {
        ...dummyRequest,
        id: 'analysis-123',
        orgId: 'org-123',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
    };
}

describe('AnalysisService', () => {
    let service: AnalysisService;
    let coreAnalysisService: jest.Mocked<CoreAnalysisService>;
    let notificationService: jest.Mocked<NotificationService>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create properly typed mocks for dependent services
        coreAnalysisService = {
            analyzeTest: jest.fn().mockImplementation(async () => dummyAnalysisResult),
            getHealth: jest.fn().mockImplementation(async () => true),
        } as unknown as jest.Mocked<CoreAnalysisService>;

        notificationService = {
            notifyAnalysisComplete: jest.fn().mockImplementation(async () => undefined),
            notifyAnalysisFailed: jest.fn().mockImplementation(async () => undefined),
            getInstance: jest.fn().mockReturnThis(),
        } as unknown as jest.Mocked<NotificationService>;

        service = new AnalysisService(coreAnalysisService, notificationService);
    });

    describe('createAnalysis', () => {
        const orgId = 'org-123';

        it('should create analysis successfully', async () => {
            mockKvStore.set.mockResolvedValue(undefined);

            const analysis = await service.createAnalysis(orgId, dummyRequest);

            expect(analysis).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    orgId,
                    status: 'pending',
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String),
                })
            );

            expect(mockKvStore.set).toHaveBeenCalledWith(analysis.id, expect.objectContaining(analysis));
        });

        it('should handle storage errors gracefully', async () => {
            const storageError = new Error('Storage failure');
            mockKvStore.set.mockRejectedValue(storageError);

            await expect(service.createAnalysis(orgId, dummyRequest)).rejects.toThrow(InternalError);

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to create analysis',
                expect.objectContaining({ error: storageError })
            );
        });
    });

    // ... Rest of the test cases remain similar but with improved typing

    describe('processAnalysis', () => {
        const analysis = createDummyAnalysis();

        beforeEach(() => {
            mockKvStore.get.mockResolvedValue(analysis);
            mockKvStore.set.mockResolvedValue(undefined);
        });

        it('should process analysis and notify on completion', async () => {
            coreAnalysisService.analyzeTest.mockResolvedValue(dummyAnalysisResult);

            await (service as any).processAnalysis(analysis);

            expect(mockKvStore.set).toHaveBeenCalledWith(
                analysis.id,
                expect.objectContaining({
                    status: 'completed',
                    result: dummyAnalysisResult,
                })
            );

            expect(notificationService.notifyAnalysisComplete).toHaveBeenCalledWith(
                analysis.orgId,
                analysis.id,
                expect.objectContaining({
                    summary: dummyAnalysisResult.summary,
                    recommendations: dummyAnalysisResult.recommendations,
                })
            );
        });

        it('should handle processing errors correctly', async () => {
            const processingError = new Error('Analysis failed');
            coreAnalysisService.analyzeTest.mockRejectedValue(processingError);

            await expect((service as any).processAnalysis(analysis)).rejects.toThrow(processingError);

            expect(mockKvStore.set).toHaveBeenCalledWith(
                analysis.id,
                expect.objectContaining({
                    status: 'failed',
                    error: expect.objectContaining({
                        message: processingError.message,
                    }),
                })
            );

            expect(notificationService.notifyAnalysisFailed).toHaveBeenCalled();
        });
    });
});
