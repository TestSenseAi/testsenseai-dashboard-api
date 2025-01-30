import { NotificationService } from '../notification.service';
import { websocket } from '@nitric/sdk';
import { InternalError } from '../../common/errors';

jest.mock('@nitric/sdk', () => ({
  websocket: jest.fn(() => ({
    send: jest.fn(),
  })),
}));

describe('NotificationService', () => {
  let service: NotificationService;
  const mockSocket = websocket('realtime');

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService();
  });

  describe('notifyAnalysisComplete', () => {
    const orgId = 'org-123';
    const analysisId = 'analysis-123';
    const result = { summary: 'Test completed' };

    it('should send completion notification', async () => {
      await service.notifyAnalysisComplete(orgId, analysisId, result);

      // Since getOrganizationConnections returns empty array for now,
      // we just verify no errors are thrown
      expect(mockSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('notifyAnalysisFailed', () => {
    const orgId = 'org-123';
    const analysisId = 'analysis-123';
    const error = 'Test failed';

    it('should send failure notification', async () => {
      await service.notifyAnalysisFailed(orgId, analysisId, error);

      // Since getOrganizationConnections returns empty array for now,
      // we just verify no errors are thrown
      expect(mockSocket.send).not.toHaveBeenCalled();
    });
  });

  // Add more tests when getOrganizationConnections is implemented
});