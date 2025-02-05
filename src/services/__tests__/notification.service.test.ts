import { jest } from '@jest/globals';

import { NotificationService } from '@/services/notification.service';
import { InternalError } from '@/common/errors';
import { websocket } from '@nitric/sdk';
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

const logger = new Logger();

jest.spyOn(logger, 'error').mockImplementation(jest.fn());
jest.spyOn(logger, 'info').mockImplementation(jest.fn());

// Define a type for your mocked websocket resource
interface MockedWebsocketResource {
    send: jest.Mock;
    allow: jest.Mock;
    wsClient: Record<string, unknown>;
    register: jest.Mock;
    close: jest.Mock;
    url: string;
    resourceType: 'websocket';
    for: jest.Mock;
    name: string;
    parent: undefined;
    ref: jest.Mock;
    permsToActions: jest.Mock;
    on: jest.Mock;
    _registerPromise: Promise<void>;
    registerPromise: Promise<void>;
}

let mockWebsocketInstance: MockedWebsocketResource = {
    send: jest.fn(() => Promise.resolve()),
    allow: jest.fn(() => mockWebsocketInstance),
    wsClient: {},
    register: jest.fn(),
    close: jest.fn(),
    url: '',
    resourceType: 'websocket',
    for: jest.fn(),
    name: 'test-websocket',
    parent: undefined,
    ref: jest.fn(),
    permsToActions: jest.fn(),
    on: jest.fn(),
    _registerPromise: Promise.resolve(),
    registerPromise: Promise.resolve(),
};

jest.mock('@nitric/sdk', () => ({
    websocket: jest.fn(() => mockWebsocketInstance),
}));

const mockConnections = ['conn-1', 'conn-2'];

describe('NotificationService', () => {
    let service: NotificationService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new NotificationService();
        jest.spyOn(service as any, 'getOrganizationConnections').mockResolvedValue(mockConnections);
    });

    test('should notify analysis complete', async () => {
        const result = { status: 'success' };
        await service.notifyAnalysisComplete('org-123', 'test-123', result);

        expect(websocket).toHaveBeenCalledWith('realtime');
        expect(mockWebsocketInstance.send).toHaveBeenCalledWith('conn-1', expect.stringContaining('ANALYSIS_COMPLETE'));
        expect(mockWebsocketInstance.send).toHaveBeenCalledWith('conn-2', expect.stringContaining('ANALYSIS_COMPLETE'));
    });

    test('should notify analysis failed', async () => {
        const error = 'Test error';
        await service.notifyAnalysisFailed('org-123', 'test-123', error);

        expect(websocket).toHaveBeenCalledWith('realtime');
        expect(mockWebsocketInstance.send).toHaveBeenCalledWith('conn-1', expect.stringContaining('ANALYSIS_FAILED'));
        expect(mockWebsocketInstance.send).toHaveBeenCalledWith('conn-2', expect.stringContaining('ANALYSIS_FAILED'));
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

            expect(mockWebsocketInstance.send).toHaveBeenCalledTimes(2);
            expect(mockWebsocketInstance.send).toHaveBeenCalledWith('conn-1', expect.any(String));
            expect(mockWebsocketInstance.send).toHaveBeenCalledWith('conn-2', expect.any(String));

            const sentPayload = JSON.parse(mockWebsocketInstance.send.mock.calls[0][1] as string);
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
            const error = new Error('Failed to send');
            mockWebsocketInstance.send.mockImplementation(() => Promise.reject(error));

            await expect(service.notifyAnalysisComplete('org-123', 'analysis-123', mockResult)).rejects.toThrow(
                InternalError
            );
            expect(logger.error).toHaveBeenCalledWith('Failed to send analysis completion notification', {
                analysisId: 'analysis-123',
                error,
            });
        });

        it('should handle connection retrieval errors', async () => {
            const error = new Error('Failed to get connections');
            jest.spyOn(service as any, 'getOrganizationConnections').mockRejectedValue(error);

            await expect(service.notifyAnalysisComplete('org-123', 'analysis-123', mockResult)).rejects.toThrow(
                InternalError
            );
            expect(logger.error).toHaveBeenCalledWith('Failed to notify organization', { orgId: 'org-123', error });
        });
    });

    describe('notifyAnalysisFailed', () => {
        it('should send failure notification to all connections', async () => {
            await service.notifyAnalysisFailed('org-123', 'analysis-123', 'Analysis failed');

            expect(mockWebsocketInstance.send).toHaveBeenCalledTimes(2);
            expect(mockWebsocketInstance.send).toHaveBeenCalledWith('conn-1', expect.any(String));
            expect(mockWebsocketInstance.send).toHaveBeenCalledWith('conn-2', expect.any(String));

            const sentPayload = JSON.parse(mockWebsocketInstance.send.mock.calls[0][1] as string);
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
            const error = new Error('Failed to send');
            mockWebsocketInstance.send.mockImplementation(() => Promise.reject(error));

            await expect(service.notifyAnalysisFailed('org-123', 'analysis-123', 'Analysis failed')).rejects.toThrow(
                InternalError
            );
            expect(logger.error).toHaveBeenCalledWith('Failed to send analysis failure notification', {
                analysisId: 'analysis-123',
                error,
            });
        });

        it('should handle connection retrieval errors', async () => {
            const error = new Error('Failed to get connections');
            jest.spyOn(service as any, 'getOrganizationConnections').mockRejectedValue(error);

            await expect(service.notifyAnalysisFailed('org-123', 'analysis-123', 'Analysis failed')).rejects.toThrow(
                InternalError
            );
            expect(logger.error).toHaveBeenCalledWith('Failed to notify organization', { orgId: 'org-123', error });
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
