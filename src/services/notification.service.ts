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
  private socket = websocket('realtime');

  public async notifyAnalysisComplete(orgId: string, analysisId: string, result: unknown): Promise<void> {
    try {
      const payload: NotificationPayload = {
        type: 'ANALYSIS_COMPLETE',
        orgId,
        data: {
          analysisId,
          status: 'completed',
          result
        }
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
          error
        }
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
      // Get all connections for the organization
      const connections = await this.getOrganizationConnections(orgId);

      // Send notification to all connected clients
      await Promise.all(
        connections.map(connectionId =>
          this.socket.send(connectionId, JSON.stringify(payload))
        )
      );
    } catch (error) {
      logger.error('Failed to notify organization', { orgId, error });
      throw new InternalError('Failed to send notification');
    }
  }

  private async getOrganizationConnections(orgId: string): Promise<string[]> {
    // This should be implemented to fetch active WebSocket connections for the organization
    // For now, return an empty array as it will be handled by the WebSocket controller
    return [];
  }
}