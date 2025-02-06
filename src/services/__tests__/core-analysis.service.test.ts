import axios, { AxiosInstance } from 'axios';
import { CoreAnalysisService } from '../core-analysis.service';
import { InternalError } from '@/common/errors';
import { logger } from '@/common/logger';

// Mock Axios and the logger
jest.mock('axios');
jest.mock('@/common/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

describe('CoreAnalysisService', () => {
    let service: CoreAnalysisService;
    let fakeAxiosInstance: jest.Mocked<AxiosInstance>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create a fake Axios instance with the necessary methods.
        fakeAxiosInstance = {
            post: jest.fn(),
            get: jest.fn(),
            // These are added to satisfy the AxiosInstance type.
            defaults: {},
            interceptors: {
                request: { use: jest.fn(), eject: jest.fn() },
                response: { use: jest.fn(), eject: jest.fn() },
            },
        } as unknown as jest.Mocked<AxiosInstance>;

        // Ensure that axios.create returns our fake instance.
        (axios.create as jest.Mock).mockReturnValue(fakeAxiosInstance);

        // Create an instance of the service.
        service = new CoreAnalysisService();
    });

    describe('analyzeTest', () => {
        const coreRequest = {
            projectId: 'proj-1',
            testId: 'test-1',
            parameters: { foo: 'bar' },
            metadata: { env: 'test' },
        };

        it('should call the core analysis service and return the mapped result', async () => {
            // Arrange: Simulate a response from the core analysis service.
            const fakeResponseData = {
                summary: 'Test summary',
                confidence: 0.85,
                recommendations: [
                    {
                        title: 'Improve tests',
                        description: 'Increase coverage',
                        priority: 'high',
                        category: 'quality',
                        actionable: true,
                    },
                ],
                metrics: { metric1: 123 },
                insights: [{ message: 'Insight message', type: 'warning', context: { detail: 'info' } }],
            };

            fakeAxiosInstance.post.mockResolvedValueOnce({ data: fakeResponseData });

            // Act: call analyzeTest.
            const result = await service.analyzeTest(coreRequest);

            // Assert: Verify that the request was made correctly.
            expect(fakeAxiosInstance.post).toHaveBeenCalledWith('/v1/analyze', coreRequest);
            expect(logger.info).toHaveBeenCalledWith('Calling core analysis service', {
                projectId: coreRequest.projectId,
                testId: coreRequest.testId,
            });
            expect(logger.info).toHaveBeenCalledWith('Core analysis service response received', {
                projectId: coreRequest.projectId,
                testId: coreRequest.testId,
                confidence: fakeResponseData.confidence,
            });

            // Assert: Verify that the result is correctly mapped.
            expect(result).toEqual({
                summary: fakeResponseData.summary,
                confidence: fakeResponseData.confidence,
                recommendations: fakeResponseData.recommendations,
                metrics: fakeResponseData.metrics,
                insights: fakeResponseData.insights.map((insight: any) => ({
                    message: insight.message,
                    type: insight.type,
                    context: insight.context,
                })),
            });
        });

        it('should throw an InternalError when axios.post fails', async () => {
            // Arrange: simulate a failure from axios.
            const error = new Error('Network error');
            fakeAxiosInstance.post.mockRejectedValueOnce(error);

            // Act & Assert: verify that analyzeTest throws an InternalError.
            await expect(service.analyzeTest(coreRequest)).rejects.toThrow(InternalError);
            expect(logger.error).toHaveBeenCalledWith('Core analysis service call failed', { error });
        });
    });

    describe('getHealth', () => {
        it('should return true when the health endpoint returns status 200', async () => {
            // Arrange: simulate a 200 response.
            fakeAxiosInstance.get.mockResolvedValueOnce({ status: 200 });

            // Act
            const health = await service.getHealth();

            // Assert
            expect(fakeAxiosInstance.get).toHaveBeenCalledWith('/health');
            expect(health).toBe(true);
        });

        it('should return false when the health endpoint returns a non-200 status', async () => {
            // Arrange: simulate a non-200 response.
            fakeAxiosInstance.get.mockResolvedValueOnce({ status: 500 });

            // Act
            const health = await service.getHealth();

            // Assert
            expect(health).toBe(false);
        });

        it('should return false and log an error if axios.get fails', async () => {
            // Arrange: simulate an error.
            const error = new Error('Health check failed');
            fakeAxiosInstance.get.mockRejectedValueOnce(error);

            // Act
            const health = await service.getHealth();

            // Assert
            expect(health).toBe(false);
            expect(logger.error).toHaveBeenCalledWith('Core service health check failed', { error });
        });
    });
});
