import { jest } from '@jest/globals';
import { CoreAnalysisService } from '@/services/core-analysis.service';
import { InternalError } from '@/common/errors';
import axios, { AxiosInstance } from 'axios';
import { Logger } from '@/common/logger';

jest.mock('@/config', () => ({
    config: {
        coreService: {
            url: 'http://localhost:3000',
            timeout: 5000,
            apiKey: 'test-api-key',
        },
    },
}));

jest.mock('axios', () => ({
    create: {
        post: jest.fn().mockResolvedValue({
            data: { summary: '', confidence: 0, recommendations: [], metrics: {}, insights: [] },
        } as never),
        get: jest.fn().mockResolvedValue({ data: { status: 200 } } as never),
    } as unknown as jest.Mocked<AxiosInstance>,
}));

const logger = new Logger();

// Ensure the logger methods are properly mocked
jest.spyOn(logger, 'error').mockImplementation(jest.fn());
jest.spyOn(logger, 'info').mockImplementation(jest.fn());

describe('CoreAnalysisService', () => {
    let service: CoreAnalysisService;
    let mockAxiosInstance: jest.Mocked<AxiosInstance>;

    beforeEach(() => {
        jest.clearAllMocks();
        // Get the mocked instance returned by axios.create
        mockAxiosInstance = (axios.create as jest.Mock)() as jest.Mocked<AxiosInstance>;
        // Specify the type of data for post and get

        service = new CoreAnalysisService();
    });

    describe('analyzeTest', () => {
        const mockTest = {
            projectId: 'project-123',
            testId: 'test-123',
            parameters: {
                testName: 'Test case 1',
                testCode: 'test content',
                testOutput: 'test output',
            },
            metadata: {
                environment: 'test',
                version: '1.0.0',
            },
        };

        it('should successfully analyze a test', async () => {
            const mockResponse = {
                data: {
                    summary: 'Test analysis complete',
                    confidence: 0.85,
                    recommendations: [],
                    metrics: {},
                    insights: [],
                },
            };

            mockAxiosInstance.post.mockResolvedValue(mockResponse);

            const result = await service.analyzeTest(mockTest);

            expect(mockAxiosInstance.post).toHaveBeenCalledWith('/v1/analyze', mockTest);
            expect(result).toEqual(mockResponse.data);
            expect(axios.create).toHaveBeenCalledWith({
                baseURL: 'http://localhost:3000',
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'test-api-key',
                },
            });
        });

        it('should handle analysis failure', async () => {
            const error = new Error('Analysis failed');
            mockAxiosInstance.post.mockRejectedValue(error);

            await expect(service.analyzeTest(mockTest)).rejects.toThrow(InternalError);
            expect(logger.error).toHaveBeenCalledWith('Core analysis service call failed', { error });
        });

        it('should handle timeout errors', async () => {
            const timeoutError = new Error('timeout of 5000ms exceeded');
            timeoutError.name = 'TimeoutError';
            mockAxiosInstance.post.mockRejectedValue(timeoutError);

            await expect(service.analyzeTest(mockTest)).rejects.toThrow(InternalError);
            expect(logger.error).toHaveBeenCalledWith('Core analysis service call failed', { error: timeoutError });
        });

        it('should handle network errors', async () => {
            const networkError = new Error('Network Error');
            mockAxiosInstance.post.mockRejectedValue(networkError);

            await expect(service.analyzeTest(mockTest)).rejects.toThrow(InternalError);
            expect(logger.error).toHaveBeenCalledWith('Core analysis service call failed', { error: networkError });
        });
    });

    describe('getHealth', () => {
        it('should return true when service is healthy', async () => {
            mockAxiosInstance.get.mockResolvedValue({ status: 200 });

            const result = await service.getHealth();

            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
            expect(result).toBe(true);
            expect(axios.create).toHaveBeenCalledWith({
                baseURL: 'http://localhost:3000',
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'test-api-key',
                },
            });
        });

        it('should return false when service is unhealthy', async () => {
            const error = new Error('Service unavailable');
            mockAxiosInstance.get.mockRejectedValue(error);

            const result = await service.getHealth();

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith('Core service health check failed', { error });
        });

        it('should handle timeout errors', async () => {
            const timeoutError = new Error('timeout of 5000ms exceeded');
            timeoutError.name = 'TimeoutError';
            mockAxiosInstance.get.mockRejectedValue(timeoutError);

            const result = await service.getHealth();

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith('Core service health check failed', { error: timeoutError });
        });
    });
});

// Ensure the mock implementation is correctly typed
