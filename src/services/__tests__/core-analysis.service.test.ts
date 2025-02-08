// Mock dependencies first
jest.mock('@/common/logger');
jest.mock('axios');

import { jest } from '@jest/globals';
import axios from 'axios';
import { logger } from '@/common/logger';
import { CoreAnalysisService } from '../core-analysis.service';
import { InternalError } from '@/common/errors';
import { CoreAnalysisResponse } from '@/services/types';

// Mock logger
jest.spyOn(logger, 'info').mockImplementation(jest.fn());
jest.spyOn(logger, 'error').mockImplementation(jest.fn());
jest.spyOn(logger, 'debug').mockImplementation(jest.fn());

const mockResponse: CoreAnalysisResponse = {
    summary: 'Test analysis',
    confidence: 0.9,
    recommendations: [],
    metrics: {},
    insights: [],
};

// Mock axios instance
const mockAxiosInstance = {
    post: jest.fn(),
    get: jest.fn(),
    defaults: { headers: { common: {} } },
};

jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);

describe('CoreAnalysisService', () => {
    let service: CoreAnalysisService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CoreAnalysisService();
    });

    describe('analyzeTest', () => {
        const testRequest = {
            projectId: 'proj-test-1',
            testId: 'test-123',
            parameters: { depth: 'full', mode: 'comprehensive' },
            metadata: { environment: 'staging', version: '1.2.3' },
        };

        it('should successfully analyze test and return mapped results', async () => {
            // @ts-expect-error - mock implementation
            mockAxiosInstance.post.mockResolvedValueOnce({
                data: mockResponse,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: {} },
            });

            const result = await service.analyzeTest(testRequest);

            expect(mockAxiosInstance.post).toHaveBeenCalledWith('/v1/analyze', testRequest);
            expect(logger.info).toHaveBeenCalledWith('Calling core analysis service', {
                projectId: testRequest.projectId,
                testId: testRequest.testId,
            });

            expect(result).toEqual(mockResponse);
            expect(logger.info).toHaveBeenCalledWith('Core analysis service response received', {
                projectId: testRequest.projectId,
                testId: testRequest.testId,
                confidence: mockResponse.confidence,
            });
        });

        it('should handle API errors gracefully', async () => {
            const apiError = new Error('Service unavailable');
            // @ts-expect-error - mock implementation
            mockAxiosInstance.post.mockRejectedValueOnce(apiError);

            await expect(service.analyzeTest(testRequest)).rejects.toThrow(InternalError);
            expect(logger.error).toHaveBeenCalledWith('Core analysis service call failed', { error: apiError });
        });

        it('should handle malformed API responses', async () => {
            // @ts-expect-error - mock implementation
            mockAxiosInstance.post.mockResolvedValueOnce({
                data: {} as CoreAnalysisResponse,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: {} },
            });

            await expect(service.analyzeTest(testRequest)).rejects.toThrow(InternalError);
        });

        it('should handle network timeouts', async () => {
            const timeoutError = new Error('Request timed out');
            timeoutError.name = 'TimeoutError';
            // @ts-expect-error - mock implementation
            mockAxiosInstance.post.mockRejectedValueOnce(timeoutError);

            await expect(service.analyzeTest(testRequest)).rejects.toThrow(InternalError);
            expect(logger.error).toHaveBeenCalledWith('Core analysis service call failed', { error: timeoutError });
        });
    });

    describe('getHealth', () => {
        it('should return true for healthy service', async () => {
            // @ts-expect-error - mock implementation
            mockAxiosInstance.get.mockResolvedValueOnce({
                data: {},
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { headers: {} },
            });
            const health = await service.getHealth();
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
            expect(health).toBe(true);
        });

        it('should return false for unhealthy service', async () => {
            // @ts-expect-error - mock implementation
            mockAxiosInstance.get.mockResolvedValueOnce({
                data: {},
                status: 500,
                statusText: 'Internal Server Error',
                headers: {},
                config: { headers: {} },
            });
            const health = await service.getHealth();
            expect(health).toBe(false);
        });

        it('should handle connection errors in health check', async () => {
            const networkError = new Error('Connection refused');
            // @ts-expect-error - mock implementation
            mockAxiosInstance.get.mockRejectedValueOnce(networkError);

            const health = await service.getHealth();
            expect(health).toBe(false);
            expect(logger.error).toHaveBeenCalledWith('Core service health check failed', { error: networkError });
        });
    });
});
