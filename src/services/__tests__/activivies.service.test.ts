import { ActivitiesService } from '../activities.service';
import { logger } from '../../common/logger';

// Mock the logger so we can inspect its calls
jest.mock('../common/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}));

describe('ActivitiesService', () => {
    let service: ActivitiesService;

    beforeEach(() => {
        service = new ActivitiesService();
        jest.clearAllMocks();
    });

    describe('getActivities', () => {
        it('should log the debug message and return a list of activities', async () => {
            const orgId = 'org-123';
            const query = { type: 'test' };

            // Call the method
            const activities = await service.getActivities(orgId, query);

            // Verify the debug log was called with the correct arguments
            expect(logger.debug).toHaveBeenCalledWith('Getting activities', {
                organizationId: orgId,
                query,
            });

            // Verify the return value is an array with two activities
            expect(Array.isArray(activities)).toBe(true);
            expect(activities).toHaveLength(2);

            // Check that each activity has the expected properties
            activities.forEach(activity => {
                expect(activity).toHaveProperty('id');
                expect(activity).toHaveProperty('type');
                expect(activity).toHaveProperty('description');
                expect(activity).toHaveProperty('timestamp');
            });
        });
    });
});
