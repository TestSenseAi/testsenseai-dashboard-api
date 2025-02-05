// notification.service.ts
import { websocket } from '@nitric/sdk';
import { logger } from '../common/logger';
import { InternalError } from '../common/errors';

interface NotificationPayload {
    type: 'ANALYSIS_COMPLETE' | 'ANALYSIS_FAILED';
    orgId: string;
    data: {
        analysisId: string;
        status: string;
        result?: unknown;
        error?: string;
    };
}

export class NotificationService {
    // Remove early instantiation:
    // private socket = websocket('realtime');

    // Lazy getter: instantiates the websocket client when needed.
    private getSocket() {
        return websocket('realtime');
    }

    public async notifyAnalysisComplete(orgId: string, analysisId: string, result: unknown): Promise<void> {
        try {
            const payload: NotificationPayload = {
                type: 'ANALYSIS_COMPLETE',
                orgId,
                data: {
                    analysisId,
                    status: 'completed',
                    result,
                },
            };

            await this.notifyOrganization(orgId, payload);
            logger.info('Analysis completion notification sent', { analysisId, organizationId: orgId });
        } catch (error) {
            logger.error('Failed to send analysis completion notification', { analysisId, error });
            throw new InternalError('Failed to send notification');
        }
    }

    public async notifyAnalysisFailed(orgId: string, analysisId: string, error: string): Promise<void> {
        try {
            const payload: NotificationPayload = {
                type: 'ANALYSIS_FAILED',
                orgId,
                data: {
                    analysisId,
                    status: 'failed',
                    error,
                },
            };

            await this.notifyOrganization(orgId, payload);
            logger.info('Analysis failure notification sent', { analysisId, organizationId: orgId });
        } catch (error) {
            logger.error('Failed to send analysis failure notification', { analysisId, error });
            throw new InternalError('Failed to send notification');
        }
    }

    private async notifyOrganization(orgId: string, payload: NotificationPayload): Promise<void> {
        try {
            const connections = await this.getOrganizationConnections();

            // Use the lazy getter here:
            const socket = this.getSocket();
            await Promise.all(connections.map(connectionId => socket.send(connectionId, JSON.stringify(payload))));
        } catch (error) {
            logger.error('Failed to notify organization', { orgId, error });
            throw new InternalError('Failed to send notification');
        }
    }

    private async getOrganizationConnections(): Promise<string[]> {
        // TODO: Implement organization connection tracking
        return [];
    }
}
