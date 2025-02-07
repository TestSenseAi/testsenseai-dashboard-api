import { jest } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { CoreAnalysisService } from '../core-analysis.service';
import { InternalError } from '@/common/errors';
import { logger } from '@/common/logger';

// Define typed interceptor managers
const mockRequestInterceptor = {
    use: jest.fn().mockReturnValue(0),
    eject: jest.fn(),
};

const mockResponseInterceptor = {
    use: jest.fn().mockReturnValue(0),
    eject: jest.fn(),
};

const mockAxiosInstance = {
    post: jest.fn(),
    get: jest.fn(),
    defaults: { headers: {} },
    interceptors: {
        request: mockRequestInterceptor,
        response: mockResponseInterceptor,
    },
} as unknown as AxiosInstance;

// Mock Axios
jest.mock('axios', () => ({
    create: jest.fn().mockReturnValue(mockAxiosInstance),
    __esModule: true,
    default: {
        create: jest.fn().mockReturnValue(mockAxiosInstance),
    },
}));

jest.mock('@/common/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

describe('CoreAnalysisService', () => {
    let service: CoreAnalysisService;
    let mockPost: jest.Mock;
    let mockGet: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CoreAnalysisService();
        mockPost = mockAxiosInstance.post as jest.Mock;
        mockGet = mockAxiosInstance.get as jest.Mock;
    });

    describe('analyzeTest', () => {
        const coreRequest = {
            projectId: 'proj-1',
            testId: 'test-1',
            parameters: { foo: 'bar' },
            metadata: { env: 'test' },
        };

        it('should call the core analysis service and return the mapped result', async () => {
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

            mockPost.mockImplementation(() => Promise.resolve({ data: fakeResponseData }));

            const result = await service.analyzeTest(coreRequest);

            expect(mockPost).toHaveBeenCalledWith('/v1/analyze', coreRequest);
            expect(logger.info).toHaveBeenCalledWith('Calling core analysis service', {
                projectId: coreRequest.projectId,
                testId: coreRequest.testId,
            });

            expect(result).toEqual(fakeResponseData);
        });

        it('should throw an InternalError when axios.post fails', async () => {
            const error = new Error('Network error');
            mockPost.mockImplementation(() => Promise.reject(error));

            await expect(service.analyzeTest(coreRequest)).rejects.toThrow(InternalError);
            expect(logger.error).toHaveBeenCalledWith('Core analysis service call failed', { error });
        });
    });

    describe('getHealth', () => {
        it('should return true when the health endpoint returns status 200', async () => {
            mockGet.mockImplementation(() => Promise.resolve({ status: 200 }));

            const health = await service.getHealth();

            expect(mockGet).toHaveBeenCalledWith('/health');
            expect(health).toBe(true);
        });

        it('should return false when the health endpoint returns a non-200 status', async () => {
            mockGet.mockImplementation(() => Promise.resolve({ status: 500 }));

            const health = await service.getHealth();

            expect(health).toBe(false);
        });

        it('should return false and log an error if axios.get fails', async () => {
            const error = new Error('Health check failed');
            mockGet.mockImplementation(() => Promise.reject(error));

            const health = await service.getHealth();

            expect(health).toBe(false);
            expect(logger.error).toHaveBeenCalledWith('Core service health check failed', { error });
        });
    });
});
