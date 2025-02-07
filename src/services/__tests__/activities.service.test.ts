import { jest } from '@jest/globals';
import { ActivitiesService } from '../activities.service';
import { logger } from '../../common/logger';

// Mock the logger
jest.mock('../../common/logger');

describe('ActivitiesService', () => {
    let activitiesService: ActivitiesService;

    beforeEach(() => {
        activitiesService = new ActivitiesService();
        jest.clearAllMocks();
    });

    describe('getActivities', () => {
        it('should return activities for an organization', async () => {
            const orgId = 'test-org-id';
            const query = { limit: 10 };

            const activities = await activitiesService.getActivities(orgId, query);

            expect(activities).toHaveLength(2);
            expect(activities[0]).toEqual(
                expect.objectContaining({
                    id: 'activity-1',
                    type: 'test',
                    description: 'Test activity 1',
                })
            );
            expect(activities[1]).toEqual(
                expect.objectContaining({
                    id: 'activity-2',
                    type: 'analysis',
                    description: 'Analysis activity 2',
                })
            );

            expect(logger.debug).toHaveBeenCalledWith('Getting activities', {
                organizationId: orgId,
                query,
            });
        });

        it('should return activities with ISO timestamp format', async () => {
            const orgId = 'test-org-id';
            const query = {};

            const activities = await activitiesService.getActivities(orgId, query);

            activities.forEach(activity => {
                expect(activity.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
            });
        });

        it('should handle empty query parameters', async () => {
            const orgId = 'test-org-id';
            const query = {};

            const activities = await activitiesService.getActivities(orgId, query);

            expect(activities).toHaveLength(2);
            expect(logger.debug).toHaveBeenCalledWith('Getting activities', {
                organizationId: orgId,
                query,
            });
        });
    });
});
