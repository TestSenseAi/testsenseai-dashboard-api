/// <reference types="jest" />

import { AnalysisService } from '../analysis.service';
import { NotificationService } from '../notification.service';
import { CoreAnalysisService } from '../core-analysis.service';
import { NotFoundError } from '../../common/errors';
import { AnalysisRequest } from '../../api/analysis/analysis.types';

// Mock dependencies
const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock('@nitric/sdk', () => ({
  kv: jest.fn(() => ({
    allow: jest.fn().mockReturnThis(),
    get: mockGet,
    set: mockSet,
  })),
}));

jest.mock('../notification.service');
jest.mock('../core-analysis.service');

describe('AnalysisService', () => {
  let service: AnalysisService;
  let _notificationService: jest.Mocked<NotificationService>;
  let _coreService: jest.Mocked<CoreAnalysisService>;

  beforeEach(() => {
    jest.clearAllMocks();
    _notificationService = new NotificationService() as jest.Mocked<NotificationService>;
    _coreService = new CoreAnalysisService() as jest.Mocked<CoreAnalysisService>;
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
        }),
      );
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

      await expect(service.getAnalysis('different-org', mockAnalysis.id)).rejects.toThrow(
        NotFoundError,
      );
      expect(mockGet).toHaveBeenCalledWith(mockAnalysis.id);
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
      mockGet.mockImplementation((key: string) =>
        Promise.resolve(mockAnalyses.find(a => a.id === key)),
      );
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
      expect(result.nextCursor).toBe('2024-02-20T09:00:00Z');
    });
  });
});
