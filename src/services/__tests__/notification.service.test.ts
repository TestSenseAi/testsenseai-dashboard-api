/// <reference types="jest" />

import { NotificationService } from '../notification.service';
import { InternalError } from '../../common/errors';

// Mock dependencies
const mockSend = jest.fn();
jest.mock('@nitric/sdk', () => ({
    websocket: jest.fn(() => ({
        send: mockSend,
    })),
}));

describe('NotificationService', () => {
    let service: NotificationService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new NotificationService();
        // Mock getOrganizationConnections to return test connections
        jest.spyOn(service as any, 'getOrganizationConnections').mockResolvedValue(['conn-1', 'conn-2']);
    });

    describe('notifyAnalysisComplete', () => {
        const mockResult = {
            summary: 'Analysis completed successfully',
            recommendations: [
                {
                    title: 'Improve performance',
                    description: 'Add caching',
                    priority: 'high',
                },
            ],
        };

        it('should send completion notification to all connections', async () => {
            await service.notifyAnalysisComplete('org-123', 'analysis-123', mockResult);

            expect(mockSend).toHaveBeenCalledTimes(2);
            expect(mockSend).toHaveBeenCalledWith('conn-1', expect.any(String));
            expect(mockSend).toHaveBeenCalledWith('conn-2', expect.any(String));

            const sentPayload = JSON.parse(mockSend.mock.calls[0][1]);
            expect(sentPayload).toEqual({
                type: 'ANALYSIS_COMPLETE',
                orgId: 'org-123',
                data: {
                    analysisId: 'analysis-123',
                    status: 'completed',
                    result: mockResult,
                },
            });
        });

        it('should handle notification errors', async () => {
            mockSend.mockRejectedValueOnce(new Error('Failed to send'));

            await expect(service.notifyAnalysisComplete('org-123', 'analysis-123', mockResult)).rejects.toThrow(
                InternalError
            );
        });

        it('should handle connection retrieval errors', async () => {
            jest.spyOn(service as any, 'getOrganizationConnections').mockRejectedValueOnce(
                new Error('Failed to get connections')
            );

            await expect(service.notifyAnalysisComplete('org-123', 'analysis-123', mockResult)).rejects.toThrow(
                InternalError
            );
        });
    });

    describe('notifyAnalysisFailed', () => {
        it('should send failure notification to all connections', async () => {
            await service.notifyAnalysisFailed('org-123', 'analysis-123', 'Analysis failed');

            expect(mockSend).toHaveBeenCalledTimes(2);
            expect(mockSend).toHaveBeenCalledWith('conn-1', expect.any(String));
            expect(mockSend).toHaveBeenCalledWith('conn-2', expect.any(String));

            const sentPayload = JSON.parse(mockSend.mock.calls[0][1]);
            expect(sentPayload).toEqual({
                type: 'ANALYSIS_FAILED',
                orgId: 'org-123',
                data: {
                    analysisId: 'analysis-123',
                    status: 'failed',
                    error: 'Analysis failed',
                },
            });
        });

        it('should handle notification errors', async () => {
            mockSend.mockRejectedValueOnce(new Error('Failed to send'));

            await expect(service.notifyAnalysisFailed('org-123', 'analysis-123', 'Analysis failed')).rejects.toThrow(
                InternalError
            );
        });

        it('should handle connection retrieval errors', async () => {
            jest.spyOn(service as any, 'getOrganizationConnections').mockRejectedValueOnce(
                new Error('Failed to get connections')
            );

            await expect(service.notifyAnalysisFailed('org-123', 'analysis-123', 'Analysis failed')).rejects.toThrow(
                InternalError
            );
        });
    });

    describe('getOrganizationConnections', () => {
        it('should return an empty array by default', async () => {
            // Remove the mock to test actual implementation
            jest.spyOn(service as any, 'getOrganizationConnections').mockRestore();

            const connections = await (service as any).getOrganizationConnections();
            expect(connections).toEqual([]);
        });
    });
});
