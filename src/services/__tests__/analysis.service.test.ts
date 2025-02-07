import { jest } from '@jest/globals';
import { InternalError, NotFoundError } from '../../common/errors';
import { AnalysisService } from '../analysis.service';
import { AnalysisRequest, AnalysisResult } from '../../api/analysis/analysis.types';
import { logger } from '@/common/logger';
import { NotificationService } from '../notification.service';
import { CoreAnalysisService } from '../core-analysis.service';

// -- Mocks for Nitric KV Store --
type KvSetFn = (key: string, value: any) => Promise<void>;
type KvGetFn = (key: string) => Promise<any>;
type KvAllowFn = () => { set: KvSetFn; get: KvGetFn };
type KvStoreFn = () => { allow: KvAllowFn };

const mockKvSet = jest.fn<KvSetFn>() as jest.MockedFunction<KvSetFn>;
const mockKvGet = jest.fn<KvGetFn>() as jest.MockedFunction<KvGetFn>;
const mockAllow = jest.fn<KvAllowFn>().mockReturnValue({
    set: mockKvSet,
    get: mockKvGet,
});
const mockKv = jest.fn<KvStoreFn>().mockReturnValue({
    allow: mockAllow,
});

// Override the Nitric SDK module
jest.mock('@nitric/sdk', () => ({
    kv: mockKv,
}));

const mockInfo = jest.fn();
const mockError = jest.fn();
const mockDebug = jest.fn();

jest.mock('@/common/logger', () => ({
    logger: {
        info: mockInfo,
        error: mockError,
        debug: mockDebug,
    },
}));

// Create dummy analysis result to be used in tests.
const dummyAnalysisResult: NonNullable<AnalysisResult['result']> = {
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
};

// Create dummy analysis request.
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

// Create a dummy analysis object (as returned by the store).
function createDummyAnalysis(overrides: Partial<any> = {}) {
    return {
        ...dummyRequest,
        id: 'analysis-123',
        orgId: 'org-123',
        status: 'pending',
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
        // Reset all mocks before each test.
        jest.clearAllMocks();

        // Create mocks for dependent services.
        coreAnalysisService = {
            analyzeTest: jest.fn().mockResolvedValue(dummyAnalysisResult as any as never),
            // Add any other methods if needed.
        } as unknown as jest.Mocked<CoreAnalysisService>;

        notificationService = {
            notifyAnalysisComplete: jest.fn().mockResolvedValue(undefined as any as never),
            notifyAnalysisFailed: jest.fn().mockResolvedValue(undefined as any as never),
        } as unknown as jest.Mocked<NotificationService>;

        // Create the service instance.
        service = new AnalysisService(coreAnalysisService, notificationService);
    });

    describe('createAnalysis', () => {
        const orgId = 'org-123';

        it('should create an analysis and log info', async () => {
            // Arrange: simulate a successful kv.set call.
            mockKvSet.mockResolvedValue(undefined as any as never);

            // Act: call createAnalysis.
            const analysis = await service.createAnalysis(orgId, dummyRequest);

            // Assert: returned analysis contains expected properties.
            expect(analysis).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    orgId,
                    status: 'pending',
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String),
                })
            );
            expect(mockKvSet).toHaveBeenCalledWith(analysis.id, analysis);
            expect(logger.info).toHaveBeenCalledWith('Analysis created', {
                analysisId: analysis.id,
                orgId,
            });
        });

        it('should throw an InternalError if kv.set fails', async () => {
            // Arrange: simulate a failure in storing the analysis.
            const error = new Error('Storage error');
            mockKvSet.mockRejectedValueOnce(error as any as never);

            // Act & Assert: expect createAnalysis to throw InternalError.
            await expect(service.createAnalysis(orgId, dummyRequest)).rejects.toThrow(InternalError);
            expect(logger.error).toHaveBeenCalledWith('Failed to create analysis', { error });
        });
    });

    describe('getAnalysis', () => {
        const orgId = 'org-123';
        const analysisId = 'analysis-123';

        it('should return the analysis if found and org matches', async () => {
            const analysis = createDummyAnalysis();
            mockKvGet.mockResolvedValueOnce(analysis as any as never);

            const result = await service.getAnalysis(orgId, analysisId);
            expect(result).toEqual(analysis);
        });

        it('should throw NotFoundError if analysis not found', async () => {
            mockKvGet.mockResolvedValueOnce(null as any as never);
            await expect(service.getAnalysis(orgId, analysisId)).rejects.toThrow(NotFoundError);
        });

        it('should throw NotFoundError if analysis orgId does not match', async () => {
            const analysis = createDummyAnalysis({ orgId: 'other-org' });
            mockKvGet.mockResolvedValueOnce(analysis);
            await expect(service.getAnalysis(orgId, analysisId)).rejects.toThrow(NotFoundError);
        });
    });

    describe('listAnalyses', () => {
        const orgId = 'org-123';
        const analysisA = createDummyAnalysis({
            id: 'analysis-A',
            createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
            status: 'completed',
        });
        const analysisB = createDummyAnalysis({
            id: 'analysis-B',
            createdAt: new Date('2025-01-02T00:00:00Z').toISOString(),
            status: 'pending',
        });
        const analysisC = createDummyAnalysis({
            id: 'analysis-C',
            createdAt: new Date('2025-01-03T00:00:00Z').toISOString(),
            status: 'failed',
        });

        beforeEach(() => {
            // Override the scanKeys method to simulate returning keys.
            jest.spyOn(service as any, 'scanKeys').mockResolvedValue(['analysis-A', 'analysis-B', 'analysis-C']);
        });

        it('should list analyses for the organization, filter by status and paginate', async () => {
            // Arrange: simulate kv.get returning the corresponding analysis objects.
            mockKvGet.mockImplementation((key: string) => {
                const mapping: Record<string, any> = {
                    'analysis-A': analysisA,
                    'analysis-B': analysisB,
                    'analysis-C': analysisC,
                };
                return Promise.resolve(mapping[key] || null);
            });

            // Act: list analyses with a limit of 2.
            const result = await service.listAnalyses(orgId, { limit: 2 });

            // Since the service sorts by createdAt descending, expect analysisC and analysisB.
            expect(result.items).toHaveLength(2);
            expect(result.items[0].id).toBe('analysis-C');
            expect(result.items[1].id).toBe('analysis-B');
            // nextCursor should be defined if there are more items.
            expect(result.nextCursor).toBeDefined();
            expect(logger.info).toHaveBeenCalledWith('Listed analyses', {
                orgId,
                status: undefined,
                limit: 2,
                count: 2,
                hasMore: true,
            });
        });

        it('should throw an InternalError if scanKeys fails', async () => {
            // Arrange: simulate scanKeys throwing an error.
            jest.spyOn(service as any, 'scanKeys').mockRejectedValue(new Error('scan failed'));
            await expect(service.listAnalyses(orgId, { limit: 2 })).rejects.toThrow(InternalError);
            expect(logger.error).toHaveBeenCalledWith('Failed to list analyses', expect.objectContaining({ orgId }));
        });
    });

    describe('processAnalysis', () => {
        // Because processAnalysis is a private method, we call it via (service as any)
        const analysis = createDummyAnalysis();

        beforeEach(() => {
            // Ensure that for update operations, kv.get returns the current analysis.
            mockKvGet.mockResolvedValue(analysis);
            mockKvSet.mockResolvedValue(undefined);
        });

        it('should process analysis successfully and notify complete', async () => {
            // Arrange: coreAnalysisService.analyzeTest resolves with dummyAnalysisResult.
            coreAnalysisService.analyzeTest.mockResolvedValueOnce(dummyAnalysisResult as any);

            // Act: call processAnalysis (via casting to any).
            await (service as any).processAnalysis(analysis);

            // Assert: The analysis should be updated to completed and have the result.
            // We check that updateAnalysisResult eventually called kv.set with status "completed" and the result.
            expect(mockKvSet).toHaveBeenCalledWith(
                analysis.id,
                expect.objectContaining({
                    status: 'completed',
                    result: dummyAnalysisResult,
                })
            );

            // Also, if notifyOnCompletion was true in the analysis options,
            // notificationService.notifyAnalysisComplete should be called.
            expect(notificationService.notifyAnalysisComplete).toHaveBeenCalled();
        });

        it('should handle errors during processing, update error state, and notify failure', async () => {
            // Arrange: simulate an error in coreAnalysisService.analyzeTest.
            const processingError = new Error('Processing failed');
            coreAnalysisService.analyzeTest.mockRejectedValueOnce(processingError);

            // Act & Assert: calling processAnalysis should eventually reject.
            await expect((service as any).processAnalysis(analysis)).rejects.toThrow(processingError);

            // Expect that the analysis was updated with a failed status and an error message.
            expect(mockKvSet).toHaveBeenCalledWith(
                analysis.id,
                expect.objectContaining({
                    status: 'failed',
                    error: expect.objectContaining({
                        message: processingError.message,
                    }),
                })
            );

            // Expect that the notification for failure was sent.
            expect(notificationService.notifyAnalysisFailed).toHaveBeenCalled();
            // Also, the error should be logged.
            expect(logger.error).toHaveBeenCalledWith('Analysis processing failed', {
                analysisId: analysis.id,
                error: processingError,
            });
        });
    });
});
