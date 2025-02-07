import { jest } from '@jest/globals';
import { ActivitiesService } from '../activities.service';

const mockDebug = jest.fn();
const mockInfo = jest.fn();
const mockError = jest.fn();

jest.mock('@/common/logger', () => ({
    logger: {
        debug: mockDebug,
        info: mockInfo,
        error: mockError,
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
            expect(mockDebug).toHaveBeenCalledWith('Getting activities', {
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
