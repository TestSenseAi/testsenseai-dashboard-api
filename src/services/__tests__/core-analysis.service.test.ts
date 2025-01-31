/// <reference types="jest" />

import axios from 'axios';
import { CoreAnalysisService } from '../core-analysis.service';
import { InternalError } from '../../common/errors';
import { config } from '../../config';

// Mock axios
jest.mock('axios');
const mockAxios = jest.mocked(axios);

describe('CoreAnalysisService', () => {
  let service: CoreAnalysisService;
  let mockPost: jest.Mock;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPost = jest.fn();
    mockGet = jest.fn();
    mockAxios.create.mockReturnValue({
      post: mockPost,
      get: mockGet,
    } as any);
    service = new CoreAnalysisService();
  });

  describe('analyzeTest', () => {
    const mockRequest = {
      projectId: 'project-123',
      testId: 'test-123',
      parameters: { key: 'value' },
      metadata: {
        environment: 'test',
        version: '1.0.0',
        tags: ['tag1', 'tag2'],
      },
    };

    const mockResponse = {
      summary: 'Test analysis summary',
      confidence: 0.85,
      recommendations: [
        {
          title: 'Improve performance',
          description: 'Add caching layer',
          priority: 'high' as const,
          category: 'performance' as const,
          actionable: true,
        },
      ],
      metrics: {
        responseTime: 150,
        errorRate: 0.02,
      },
      insights: [
        {
          type: 'improvement' as const,
          message: 'Consider adding retry logic',
          context: { area: 'reliability' },
        },
      ],
    };

    it('should analyze test successfully', async () => {
      mockPost.mockResolvedValueOnce({ data: mockResponse });

      const result = await service.analyzeTest(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: config.coreService.url,
        timeout: config.coreService.timeout,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.coreService.apiKey,
        },
      });
      expect(mockPost).toHaveBeenCalledWith('/v1/analyze', mockRequest);
    });

    it('should handle analysis errors', async () => {
      mockPost.mockRejectedValueOnce(new Error('API Error'));

      await expect(service.analyzeTest(mockRequest)).rejects.toThrow(InternalError);
      await expect(service.analyzeTest(mockRequest)).rejects.toThrow('Failed to analyze test');
    });
  });

  describe('getHealth', () => {
    it('should return true when service is healthy', async () => {
      mockGet.mockResolvedValueOnce({ status: 200 });

      const result = await service.getHealth();
      expect(result).toBe(true);
      expect(mockGet).toHaveBeenCalledWith('/health');
    });

    it('should return false when service is unhealthy', async () => {
      mockGet.mockRejectedValueOnce(new Error('Health check failed'));

      const result = await service.getHealth();
      expect(result).toBe(false);
    });

    it('should return false when service returns non-200 status', async () => {
      mockGet.mockResolvedValueOnce({ status: 500 });

      const result = await service.getHealth();
      expect(result).toBe(false);
    });
  });
});
