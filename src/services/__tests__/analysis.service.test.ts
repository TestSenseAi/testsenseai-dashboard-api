import { jest } from '@jest/globals';

import { AnalysisService } from '@/services/analysis.service';
import { CoreAnalysisService } from '@/services/core-analysis.service';
import { NotificationService } from '@/services/notification.service';
import { AnalysisRequest } from '@/api/analysis/analysis.types';

jest.mock('@/config', () => ({
    config: {
        coreService: {
            url: 'http://localhost:3000',
            timeout: 5000,
            apiKey: 'test-api-key',
        },
    },
}));

type Analysis = {
    id: string;
    orgId: string;
    status: string;
    result?: { summary: string };
    createdAt: string;
    updatedAt: string;
    context: {
        projectId: string;
        testId: string;
        parameters?: Record<string, any>;
        metadata?: Record<string, any>;
    };
    options?: {
        priority: string;
        notifyOnCompletion: boolean;
        analysisDepth: string;
    };
};

const mockKvStore = {
    allow: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
    register: jest.fn(),
    permsToActions: jest.fn(),
    resourceType: 'kv',
    for: jest.fn(),
    name: 'test-kv',
    parent: undefined,
    ref: jest.fn(),
};

const mockWebsocketInstance = {
    send: jest.fn(() => Promise.resolve()),
    allow: jest.fn(() => mockWebsocketInstance),
    wsClient: {},
    register: jest.fn(),
    close: jest.fn(),
    url: '',
    resourceType: 'websocket' as const,
    for: jest.fn(),
    name: 'test-websocket',
    parent: undefined,
    ref: jest.fn(),
    permsToActions: jest.fn(),
    on: jest.fn(),
    _registerPromise: Promise.resolve(),
    registerPromise: Promise.resolve(),
};

// Mock the Nitric SDK
jest.mock('@nitric/sdk', () => ({
    kv: jest.fn(() => mockKvStore),
    websocket: jest.fn(() => mockWebsocketInstance),
}));

// Create mock instances with proper type casting
const mockCoreAnalysisService = {
    analyzeTest: jest.fn(),
    getHealth: jest.fn(),
} as unknown as jest.Mocked<CoreAnalysisService>;

const mockNotificationService = {
    notifyAnalysisComplete: jest.fn(),
    notifyAnalysisFailed: jest.fn(),
    notifyOrganization: jest.fn(),
    getOrganizationConnections: jest.fn(),
} as unknown as jest.Mocked<NotificationService>;

// Mock the service classes
jest.mock('@/services/core-analysis.service', () => ({
    CoreAnalysisService: jest.fn(() => mockCoreAnalysisService),
}));

jest.mock('@/services/notification.service', () => ({
    NotificationService: jest.fn(() => mockNotificationService),
}));

describe('AnalysisService', () => {
    let analysisService: AnalysisService;
    const orgId = 'test-org';

    beforeEach(() => {
        jest.clearAllMocks();
        mockKvStore.set.mockImplementation(() => Promise.resolve());
        mockKvStore.get.mockImplementation(() => Promise.resolve(null));
        mockKvStore.list.mockImplementation(() => Promise.resolve([]));
        analysisService = new AnalysisService(mockCoreAnalysisService, mockNotificationService);
    });

    test('createAnalysis should store analysis and return pending status', async () => {
        const request: AnalysisRequest = {
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
            },
        };

        mockKvStore.set.mockImplementation(() => Promise.resolve());

        const result = await analysisService.createAnalysis(orgId, request);

        expect(result.status).toBe('pending');
        expect(result.id).toBeDefined();
        expect(mockKvStore.set).toHaveBeenCalled();
    });

    test('getAnalysis should return analysis by id', async () => {
        const analysisId = 'test-id';
        const mockAnalysis: Analysis = {
            id: analysisId,
            orgId,
            status: 'completed',
            result: { summary: 'test result' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            context: {
                projectId: 'project-123',
                testId: 'test-123',
            },
        };

        mockKvStore.get.mockImplementation(() => Promise.resolve(mockAnalysis));

        const result = await analysisService.getAnalysis(orgId, analysisId);

        expect(result).toEqual(mockAnalysis);
        expect(mockKvStore.get).toHaveBeenCalledWith(expect.stringContaining(analysisId));
    });

    test('listAnalyses should return list of analyses', async () => {
        const mockAnalyses: Analysis[] = [
            {
                id: '1',
                orgId,
                status: 'completed',
                result: { summary: 'test result 1' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                context: {
                    projectId: 'project-123',
                    testId: 'test-123',
                },
            },
            {
                id: '2',
                orgId,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                context: {
                    projectId: 'project-123',
                    testId: 'test-456',
                },
            },
        ];

        mockKvStore.list.mockImplementation(() => Promise.resolve(mockAnalyses));

        const result = await analysisService.listAnalyses(orgId, { limit: 10 });

        expect(result).toEqual(mockAnalyses);
        expect(mockKvStore.list).toHaveBeenCalled();
    });

    test('should handle analysis processing', async () => {
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
            },
        };

        const mockAnalysisResult = {
            confidence: 0.85,
            summary: 'Test completed',
            recommendations: [],
        };

        mockCoreAnalysisService.analyzeTest.mockResolvedValue(mockAnalysisResult);
        mockKvStore.get.mockImplementation(() =>
            Promise.resolve({
                id: 'test-id',
                orgId,
                status: 'processing',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                context: mockRequest.context,
                options: mockRequest.options,
            } as Analysis)
        );

        const result = await analysisService.createAnalysis(orgId, mockRequest);
        expect(result.status).toBe('pending');
        expect(result.id).toBeDefined();
    });
});
