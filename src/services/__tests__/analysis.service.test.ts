/// <reference types="jest" />

import { CoreAnalysisService } from '../core-analysis.service';
import { NotificationService } from '../notification.service';
import { AnalysisService } from '../analysis.service';
import { NotFoundError } from '../../common/errors';
import { AnalysisRequest } from '../../api/analysis/analysis.types';
import { InternalError } from '../../common/errors';

// Mock functions
const mockAnalyzeTest = jest.fn();
const mockGetHealth = jest.fn();
const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock('@nitric/sdk', () => ({
    kv: jest.fn().mockReturnValue({
        allow: jest.fn().mockReturnThis(),
        get: mockGet,
        set: mockSet,
    }),
}));

jest.mock('../notification.service', () => ({
    NotificationService: jest.fn(),
}));

jest.mock('../core-analysis.service', () => ({
    CoreAnalysisService: jest.fn().mockImplementation(() => ({
        client: { post: jest.fn(), get: jest.fn() },
        analyzeTest: mockAnalyzeTest,
        getHealth: mockGetHealth,
    })),
}));

// Mock notification service
const mockNotificationService = {
    socket: { send: jest.fn() },
    notifyAnalysisComplete: jest.fn(),
    notifyAnalysisFailed: jest.fn(),
    notifyOrganization: jest.fn(),
    getOrganizationConnections: jest.fn().mockResolvedValue([]),
} as unknown as NotificationService;

jest.mocked(NotificationService).mockImplementation(() => mockNotificationService);

describe('AnalysisService', () => {
    let service: AnalysisService;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset mock implementations
        mockAnalyzeTest.mockReset();
        mockAnalyzeTest.mockResolvedValue({
            confidence: 0.85,
            summary: 'Test completed',
            recommendations: [],
        });

        mockGetHealth.mockReset();
        mockGetHealth.mockResolvedValue({ status: 'healthy' });

        mockGet.mockReset();
        mockGet.mockImplementation((id: string) =>
            Promise.resolve({
                id,
                orgId: 'org-123',
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                context: {
                    projectId: 'project-123',
                    testId: 'test-123',
                    parameters: { key: 'value' },
                    metadata: { environment: 'test', version: '1.0.0' },
                },
                options: {
                    priority: 'medium',
                    analysisDepth: 'detailed',
                    includeMetrics: ['performance', 'quality'],
                    notifyOnCompletion: true,
                },
            })
        );

        mockSet.mockReset();
        mockSet.mockImplementation((id: string, data: any) => Promise.resolve());

        service = new AnalysisService();
    });

    describe('createAnalysis', () => {
        const mockRequest: AnalysisRequest = {
            context: {
                projectId: 'project-123',
                testId: 'test-123',
                parameters: { key: 'value' },
                metadata: {
                    environment: 'test',
                    version: '1.0.0',
                },
            },
            options: {
                priority: 'medium',
                notifyOnCompletion: true,
                analysisDepth: 'detailed',
                includeMetrics: ['performance', 'quality'],
            },
        };

        it('should create a new analysis', async () => {
            const orgId = 'org-123';
            const result = await service.createAnalysis(orgId, mockRequest);

            expect(result).toMatchObject({
                ...mockRequest,
                orgId,
                status: 'pending',
            });
            expect(result.id).toBeDefined();
            expect(result.createdAt).toBeDefined();
            expect(result.updatedAt).toBeDefined();
            expect(mockSet).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    id: result.id,
                    orgId,
                    status: 'pending',
                })
            );
        });

        it('should handle errors during creation', async () => {
            mockSet.mockRejectedValueOnce(new Error('Storage error'));
            const orgId = 'org-123';

            await expect(service.createAnalysis(orgId, mockRequest)).rejects.toThrow('Failed to create analysis');
        });

        it('should process analysis successfully', async () => {
            const mockRequest = {
                context: {
                    projectId: 'project-123',
                    testId: 'test-123',
                    parameters: { key: 'value' },
                    metadata: { environment: 'test', version: '1.0.0' },
                },
                options: {
                    priority: 'medium' as const,
                    analysisDepth: 'detailed' as const,
                    includeMetrics: ['performance', 'quality'] as Array<'performance' | 'quality'>,
                    notifyOnCompletion: true,
                },
            };

            // Set up mock responses
            mockGet.mockImplementation((id: string) =>
                Promise.resolve({
                    id,
                    orgId: 'org-123',
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    context: mockRequest.context,
                    options: mockRequest.options,
                })
            );

            mockAnalyzeTest.mockResolvedValueOnce({
                confidence: 0.85,
                summary: 'Test completed',
                recommendations: [],
            });

            const result = await service.createAnalysis('org-123', mockRequest);
            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.status).toBe('pending');

            // Wait for async processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify the analysis was processed
            expect(mockAnalyzeTest).toHaveBeenCalledWith({
                projectId: mockRequest.context.projectId,
                testId: mockRequest.context.testId,
                parameters: mockRequest.context.parameters,
                metadata: mockRequest.context.metadata,
            });

            // Verify the analysis was updated
            expect(mockSet).toHaveBeenCalledWith(
                result.id,
                expect.objectContaining({
                    status: 'completed',
                    result: {
                        confidence: 0.85,
                        summary: 'Test completed',
                        recommendations: [],
                    },
                })
            );

            // Verify notification was sent
            expect(mockNotificationService.notifyAnalysisComplete).toHaveBeenCalledWith('org-123', result.id, {
                summary: 'Test completed',
                recommendations: [],
            });
        });

        it('should handle processing errors', async () => {
            const error = new Error('Processing failed');
            mockAnalyzeTest.mockRejectedValueOnce(error);

            const mockRequest = {
                context: {
                    projectId: 'project-123',
                    testId: 'test-123',
                    parameters: { key: 'value' },
                    metadata: { environment: 'test', version: '1.0.0' },
                },
                options: {
                    priority: 'medium' as const,
                    analysisDepth: 'detailed' as const,
                    includeMetrics: ['performance', 'quality'] as Array<'performance' | 'quality'>,
                    notifyOnCompletion: true,
                },
            };

            // Set up mock responses
            mockGet.mockImplementation((id: string) =>
                Promise.resolve({
                    id,
                    orgId: 'org-123',
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    context: mockRequest.context,
                    options: mockRequest.options,
                })
            );

            const result = await service.createAnalysis('org-123', mockRequest);
            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.status).toBe('pending');

            // Wait for async processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify the analysis was updated with error
            expect(mockSet).toHaveBeenCalledWith(
                result.id,
                expect.objectContaining({
                    status: 'failed',
                    error: expect.objectContaining({
                        message: 'Processing failed',
                        code: 'Error',
                    }),
                })
            );

            // Verify error notification was sent
            expect(mockNotificationService.notifyAnalysisFailed).toHaveBeenCalledWith(
                'org-123',
                result.id,
                'Processing failed'
            );
        });

        it('should create and process analysis successfully', async () => {
            const mockRequest = {
                context: {
                    projectId: 'project-123',
                    testId: 'test-123',
                    parameters: {
                        testContent: 'test content',
                    },
                    metadata: {
                        environment: 'test',
                        version: '1.0.0',
                    },
                },
            };

            const mockResponse = {
                confidence: 0.85,
                summary: 'Test completed',
                recommendations: [],
            };

            mockAnalyzeTest.mockResolvedValueOnce(mockResponse);
            mockGet.mockResolvedValueOnce(null);
            mockSet.mockResolvedValueOnce(undefined);

            const result = await service.createAnalysis('org-123', mockRequest);

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.status).toBe('processing');
            expect(mockAnalyzeTest).toHaveBeenCalledWith(mockRequest);
            expect(mockSet).toHaveBeenCalled();
        });

        it('should handle processing error', async () => {
            const mockRequest = {
                context: {
                    projectId: 'project-123',
                    testId: 'test-123',
                    parameters: {
                        testContent: 'test content',
                    },
                    metadata: {
                        environment: 'test',
                        version: '1.0.0',
                    },
                },
            };

            mockAnalyzeTest.mockRejectedValueOnce(new Error('Processing failed'));
            mockGet.mockResolvedValueOnce(null);
            mockSet.mockResolvedValueOnce(undefined);

            const result = await service.createAnalysis('org-123', mockRequest);

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.status).toBe('failed');
            expect(mockAnalyzeTest).toHaveBeenCalledWith(mockRequest);
            expect(mockSet).toHaveBeenCalled();
        });
    });

    describe('getAnalysis', () => {
        const mockAnalysis = {
            id: 'analysis-123',
            orgId: 'org-123',
            status: 'completed' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            context: {
                projectId: 'project-123',
                testId: 'test-123',
            },
            options: {
                priority: 'medium' as const,
                notifyOnCompletion: true,
                analysisDepth: 'detailed' as const,
            },
        };

        it('should return analysis when found', async () => {
            mockGet.mockResolvedValueOnce(mockAnalysis);

            const result = await service.getAnalysis(mockAnalysis.orgId, mockAnalysis.id);
            expect(result).toEqual(mockAnalysis);
            expect(mockGet).toHaveBeenCalledWith(mockAnalysis.id);
        });

        it('should throw NotFoundError when analysis does not exist', async () => {
            mockGet.mockResolvedValueOnce(null);

            await expect(service.getAnalysis('org-123', 'non-existent')).rejects.toThrow(NotFoundError);
            expect(mockGet).toHaveBeenCalledWith('non-existent');
        });

        it('should throw NotFoundError when analysis belongs to different org', async () => {
            mockGet.mockResolvedValueOnce(mockAnalysis);

            await expect(service.getAnalysis('different-org', mockAnalysis.id)).rejects.toThrow(NotFoundError);
            expect(mockGet).toHaveBeenCalledWith(mockAnalysis.id);
        });

        it('should handle storage errors', async () => {
            mockGet.mockRejectedValueOnce(new Error('Storage error'));

            await expect(service.getAnalysis('org-123', 'analysis-123')).rejects.toThrow('Failed to get analysis');
        });
    });

    describe('listAnalyses', () => {
        const mockAnalyses = [
            {
                id: 'analysis-1',
                orgId: 'org-123',
                status: 'completed' as const,
                createdAt: '2024-02-20T10:00:00Z',
                updatedAt: '2024-02-20T10:01:00Z',
                context: {
                    projectId: 'p1',
                    testId: 't1',
                },
                options: {
                    priority: 'medium' as const,
                    notifyOnCompletion: true,
                    analysisDepth: 'detailed' as const,
                },
            },
            {
                id: 'analysis-2',
                orgId: 'org-123',
                status: 'pending' as const,
                createdAt: '2024-02-20T09:00:00Z',
                updatedAt: '2024-02-20T09:00:00Z',
                context: {
                    projectId: 'p1',
                    testId: 't2',
                },
                options: {
                    priority: 'medium' as const,
                    notifyOnCompletion: true,
                    analysisDepth: 'detailed' as const,
                },
            },
        ];

        beforeEach(() => {
            // Mock scanKeys implementation for testing
            jest.spyOn(service as any, 'scanKeys').mockResolvedValue(['analysis-1', 'analysis-2']);
            mockGet.mockImplementation((key: string) => Promise.resolve(mockAnalyses.find(a => a.id === key)));
        });

        it('should list analyses for organization', async () => {
            const result = await service.listAnalyses('org-123', { limit: 10 });

            expect(result.items).toHaveLength(2);
            expect(result.items[0].id).toBe('analysis-1'); // Most recent first
            expect(result.nextCursor).toBeUndefined();
        });

        it('should filter by status', async () => {
            const result = await service.listAnalyses('org-123', {
                status: 'completed',
                limit: 10,
            });

            expect(result.items).toHaveLength(1);
            expect(result.items[0].status).toBe('completed');
        });

        it('should handle pagination', async () => {
            const result = await service.listAnalyses('org-123', {
                limit: 1,
            });

            expect(result.items).toHaveLength(1);
            expect(result.nextCursor).toBe('2024-02-20T10:00:00Z');
        });

        it('should handle cursor-based pagination', async () => {
            const result = await service.listAnalyses('org-123', {
                limit: 1,
                cursor: '2024-02-20T10:00:00Z',
            });

            expect(result.items).toHaveLength(1);
            expect(result.items[0].id).toBe('analysis-2');
        });

        it('should handle storage errors', async () => {
            jest.spyOn(service as any, 'scanKeys').mockRejectedValueOnce(new Error('Storage error'));

            await expect(service.listAnalyses('org-123', { limit: 10 })).rejects.toThrow('Failed to list analyses');
        });
    });
});
