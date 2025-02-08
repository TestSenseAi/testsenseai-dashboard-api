import { jest } from '@jest/globals';
import { kv, KeyValueStoreResource } from '@nitric/sdk';
import { logger } from '@/common/logger';
import { InternalError, NotFoundError } from '@/common/errors';
import { AnalysisService } from '../analysis.service';
import { AnalysisRequest } from '../../api/analysis/analysis.types';
import { NotificationService } from '../notification.service';
import { CoreAnalysisService } from '../core-analysis.service';

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

        it('should handle notification errors during success', async () => {
            // Setup successful analysis
            coreAnalysisService.analyzeTest.mockResolvedValue(dummyAnalysisResult);

            // Mock the notification to fail with InternalError
            const notificationError = new InternalError('Failed to send notification');
            notificationService.notifyAnalysisComplete.mockRejectedValue(notificationError);

            // Process should complete without throwing
            await (service as any).processAnalysis(analysis);

            // Status should be updated to completed
            expect(mockKvStore.set).toHaveBeenCalledWith(
                analysis.id,
                expect.objectContaining({
                    status: 'completed',
                    result: dummyAnalysisResult,
                })
            );

            // Verify notification was attempted
            expect(notificationService.notifyAnalysisComplete).toHaveBeenCalledWith(
                analysis.orgId,
                analysis.id,
                expect.objectContaining({
                    summary: dummyAnalysisResult.summary,
                    recommendations: dummyAnalysisResult.recommendations,
                })
            );

            // Verify error was logged
            expect(logger.error).toHaveBeenCalledWith(
                'Failed to send analysis completion notification',
                expect.objectContaining({
                    analysisId: analysis.id,
                    error: notificationError,
                })
            );
        });

        it('should handle notification errors during failure', async () => {
            const processingError = new Error('Analysis failed');
            coreAnalysisService.analyzeTest.mockRejectedValue(processingError);

            // Mock notification to fail with InternalError
            const notificationError = new InternalError('Failed to send notification');
            notificationService.notifyAnalysisFailed.mockRejectedValue(notificationError);

            // Original error should still be thrown
            await expect((service as any).processAnalysis(analysis)).rejects.toThrow(processingError);

            // Status should be updated to failed
            expect(mockKvStore.set).toHaveBeenCalledWith(
                analysis.id,
                expect.objectContaining({
                    status: 'failed',
                    error: expect.objectContaining({
                        message: processingError.message,
                    }),
                })
            );

            // Verify notification was attempted
            expect(notificationService.notifyAnalysisFailed).toHaveBeenCalledWith(
                analysis.orgId,
                analysis.id,
                processingError.message
            );

            // Verify error was logged
            expect(logger.error).toHaveBeenCalledWith(
                'Failed to send analysis failure notification',
                expect.objectContaining({
                    analysisId: analysis.id,
                    error: notificationError,
                })
            );
        });

        it('should handle storage errors during status update', async () => {
            // Mock the storage error
            const error = new Error('Storage error');
            mockKvStore.set.mockRejectedValueOnce(error);

            // Create a new analysis which will trigger processAnalysis
            await expect(service.createAnalysis('org-123', dummyRequest)).rejects.toThrow(InternalError);

            // Verify the error was logged
            expect(logger.error).toHaveBeenCalledWith('Failed to create analysis', expect.objectContaining({ error }));
        });
    });

    describe('getAnalysis', () => {
        const orgId = 'org-123';
        const analysisId = 'analysis-123';

        it('should return analysis if found and org matches', async () => {
            const analysis = createDummyAnalysis();
            mockKvStore.get.mockResolvedValue(analysis);

            const result = await service.getAnalysis(orgId, analysisId);
            expect(result).toEqual(analysis);
        });

        it('should throw NotFoundError if analysis not found', async () => {
            mockKvStore.get.mockResolvedValue(null);
            await expect(service.getAnalysis(orgId, analysisId)).rejects.toThrow(
                'Analysis with id analysis-123 not found'
            );
        });

        it('should throw NotFoundError if analysis orgId does not match', async () => {
            const analysis = createDummyAnalysis({ orgId: 'different-org' });
            mockKvStore.get.mockResolvedValue(analysis);
            await expect(service.getAnalysis(orgId, analysisId)).rejects.toThrow(
                'Analysis with id analysis-123 not found'
            );
        });

        it('should handle storage errors gracefully', async () => {
            const error = new Error('Storage error');
            mockKvStore.get.mockRejectedValue(error);
            await expect(service.getAnalysis(orgId, analysisId)).rejects.toThrow(InternalError);
        });
    });

    describe('listAnalyses', () => {
        const orgId = 'org-123';

        beforeEach(() => {
            // Mock scanKeys to return some test keys
            jest.spyOn(service as any, 'scanKeys').mockResolvedValue(['analysis-1', 'analysis-2', 'analysis-3']);
        });

        it('should list analyses with pagination', async () => {
            const analyses = [
                createDummyAnalysis({ id: 'analysis-1', createdAt: '2024-01-01T00:00:00Z' }),
                createDummyAnalysis({ id: 'analysis-2', createdAt: '2024-01-02T00:00:00Z' }),
                createDummyAnalysis({ id: 'analysis-3', createdAt: '2024-01-03T00:00:00Z' }),
            ];

            mockKvStore.get.mockImplementation(async key => analyses.find(a => a.id === key));

            const result = await service.listAnalyses(orgId, { limit: 2 });
            expect(result.items).toHaveLength(2);
            expect(result.nextCursor).toBeDefined();
        });

        it('should filter by status', async () => {
            const analyses = [
                createDummyAnalysis({ id: 'analysis-1', status: 'completed' }),
                createDummyAnalysis({ id: 'analysis-2', status: 'pending' }),
                createDummyAnalysis({ id: 'analysis-3', status: 'completed' }),
            ];

            mockKvStore.get.mockImplementation(async key => analyses.find(a => a.id === key));

            const result = await service.listAnalyses(orgId, { status: 'completed', limit: 10 });
            expect(result.items.every(item => item.status === 'completed')).toBe(true);
        });

        it('should handle cursor-based pagination', async () => {
            const analyses = [
                createDummyAnalysis({ id: 'analysis-1', createdAt: '2024-01-01T00:00:00Z' }),
                createDummyAnalysis({ id: 'analysis-2', createdAt: '2024-01-02T00:00:00Z' }),
                createDummyAnalysis({ id: 'analysis-3', createdAt: '2024-01-03T00:00:00Z' }),
            ];

            mockKvStore.get.mockImplementation(async key => analyses.find(a => a.id === key));

            const result = await service.listAnalyses(orgId, {
                limit: 2,
                cursor: '2024-01-02T00:00:00Z',
            });

            expect(result.items).toHaveLength(1);
            expect(result.items[0].id).toBe('analysis-1');
            expect(result.nextCursor).toBeUndefined();
        });

        it('should handle scan errors gracefully', async () => {
            jest.spyOn(service as any, 'scanKeys').mockRejectedValue(new Error('Scan failed'));
            await expect(service.listAnalyses(orgId, { limit: 10 })).rejects.toThrow(InternalError);
        });
    });

    describe('error handling', () => {
        const analysis = createDummyAnalysis();

        beforeEach(() => {
            mockKvStore.get.mockResolvedValue(analysis);
            mockKvStore.set.mockResolvedValue(undefined);
        });

        it('should handle storage errors during get', async () => {
            const error = new Error('Storage error');
            mockKvStore.get.mockRejectedValue(error);

            await expect(service.getAnalysis('org-123', 'analysis-123')).rejects.toThrow(InternalError);

            expect(logger.error).toHaveBeenCalledWith('Failed to get analysis', expect.objectContaining({ error }));
        });

        it('should handle storage errors during set', async () => {
            const error = new Error('Storage error');
            mockKvStore.set.mockRejectedValue(error);

            await expect(service.createAnalysis('org-123', dummyRequest)).rejects.toThrow(InternalError);

            expect(logger.error).toHaveBeenCalledWith('Failed to create analysis', expect.objectContaining({ error }));
        });

        it('should handle not found errors during updates', async () => {
            mockKvStore.get.mockResolvedValue(null);

            await expect(service.getAnalysis('org-123', 'analysis-123')).rejects.toThrow(NotFoundError);

            expect(logger.error).not.toHaveBeenCalled();
        });

        it('should handle scan errors in listAnalyses', async () => {
            jest.spyOn(service as any, 'scanKeys').mockRejectedValue(new Error('Scan failed'));

            await expect(service.listAnalyses('org-123', { limit: 10 })).rejects.toThrow(InternalError);

            expect(logger.error).toHaveBeenCalledWith('Failed to list analyses', expect.any(Object));
        });

        it('should handle empty results in listAnalyses', async () => {
            jest.spyOn(service as any, 'scanKeys').mockResolvedValue([]);
            mockKvStore.get.mockResolvedValue(null);

            const result = await service.listAnalyses('org-123', { limit: 10 });
            expect(result.items).toEqual([]);
            expect(result.nextCursor).toBeUndefined();
        });

        it('should handle invalid status filter in listAnalyses', async () => {
            jest.spyOn(service as any, 'scanKeys').mockResolvedValue(['analysis-1']);
            mockKvStore.get.mockResolvedValue({
                ...analysis,
                status: 'completed',
            });

            const result = await service.listAnalyses('org-123', {
                status: 'pending',
                limit: 10,
            });
            expect(result.items).toHaveLength(0);
        });
    });
});
