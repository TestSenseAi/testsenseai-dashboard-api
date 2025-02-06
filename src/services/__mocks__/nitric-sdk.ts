import { jest } from '@jest/globals';
import { KeyValueStoreResource, WebsocketResource } from '@nitric/sdk';
import { AnalysisResult } from '@/api/analysis/analysis.types';
import { CoreAnalysisService } from '../core-analysis.service';
import { NotificationService } from '../notification.service';

// Mock KV Store
export const createMockKvStore = () =>
    ({
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        list: jest.fn(),
        allow: jest.fn().mockReturnThis(),
        for: jest.fn().mockReturnThis(),
        name: 'analyses',
        register: jest.fn(),
        permsToActions: jest.fn(),
        resourceType: jest.fn().mockReturnValue('kv'),
        registerPolicy: jest.fn(),
        policy: jest.fn(),
    }) as any as jest.Mocked<KeyValueStoreResource<AnalysisResult>>;

// Mock WebSocket
export const createMockWebSocket = () =>
    ({
        send: jest.fn(),
        close: jest.fn(),
        url: jest.fn(),
        on: jest.fn(),
        name: 'realtime',
        register: jest.fn(),
        permsToActions: jest.fn(),
        resourceType: jest.fn().mockReturnValue('websocket'),
        registerPolicy: jest.fn(),
        policy: jest.fn(),
        wsClient: jest.fn(),
    }) as any as jest.Mocked<WebsocketResource>;

// Mock Core Analysis Service
export const createMockCoreAnalysisService = () =>
    ({
        analyzeTest: jest.fn(),
        getHealth: jest.fn(),
        axiosInstance: jest.fn(),
    }) as any as jest.Mocked<CoreAnalysisService>;

// Mock Notification Service
export const createMockNotificationService = () =>
    ({
        notifyAnalysisComplete: jest.fn(),
        notifyAnalysisFailed: jest.fn(),
        getInstance: jest.fn().mockReturnThis(),
        socket: jest.fn(),
        notifyOrganization: jest.fn(),
        getOrganizationConnections: jest.fn(),
    }) as any as jest.Mocked<NotificationService>;
