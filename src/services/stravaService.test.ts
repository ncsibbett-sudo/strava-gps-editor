import { describe, it, expect, beforeEach, vi } from 'vitest';
import { stravaService } from './stravaService';
import { useAuthStore } from '../stores/authStore';

// Mock the auth store
vi.mock('../stores/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      tokens: {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      },
      refreshAccessToken: vi.fn(),
    })),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe('StravaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchActivities', () => {
    it('should fetch activities with default pagination', async () => {
      const mockActivities = [
        {
          id: 1,
          name: 'Morning Run',
          type: 'Run',
          start_date: '2024-01-01T08:00:00Z',
          distance: 5000,
          moving_time: 1800,
        },
        {
          id: 2,
          name: 'Evening Ride',
          type: 'Ride',
          start_date: '2024-01-02T18:00:00Z',
          distance: 20000,
          moving_time: 3600,
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'X-RateLimit-Limit': '200',
          'X-RateLimit-Usage': '10,200',
        }),
        json: async () => mockActivities,
      });

      const activities = await stravaService.fetchActivities();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.strava.com/api/v3/athlete/activities?page=1&per_page=30',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
          }),
        })
      );

      expect(activities).toEqual(mockActivities);
    });

    it('should handle pagination parameters', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => [],
      });

      await stravaService.fetchActivities(3, 50);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.strava.com/api/v3/athlete/activities?page=3&per_page=50',
        expect.any(Object)
      );
    });

    it('should enforce maximum per_page of 200', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => [],
      });

      await stravaService.fetchActivities(1, 300);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.strava.com/api/v3/athlete/activities?page=1&per_page=200',
        expect.any(Object)
      );
    });
  });

  describe('fetchActivityMetadata', () => {
    it('should fetch detailed activity data', async () => {
      const mockActivity = {
        id: 123,
        name: 'Test Activity',
        type: 'Run',
        distance: 5000,
        moving_time: 1800,
        description: 'Great run!',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => mockActivity,
      });

      const activity = await stravaService.fetchActivityMetadata(123);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.strava.com/api/v3/activities/123',
        expect.any(Object)
      );

      expect(activity).toEqual(mockActivity);
    });
  });

  describe('fetchActivityStreams', () => {
    it('should fetch GPS streams with default stream types', async () => {
      const mockStreams = {
        latlng: {
          type: 'latlng',
          data: [
            [40.0, -74.0],
            [40.001, -74.001],
          ],
          series_type: 'distance',
          original_size: 2,
          resolution: 'high',
        },
        altitude: {
          type: 'altitude',
          data: [10, 15],
          series_type: 'distance',
          original_size: 2,
          resolution: 'high',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => mockStreams,
      });

      const streams = await stravaService.fetchActivityStreams(123);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.strava.com/api/v3/activities/123/streams?keys=latlng%2Caltitude%2Ctime%2Cdistance&key_by_type=true',
        expect.any(Object)
      );

      expect(streams).toEqual(mockStreams);
    });

    it('should support custom stream types', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({}),
      });

      await stravaService.fetchActivityStreams(123, ['latlng', 'heartrate', 'cadence']);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('keys=latlng%2Cheartrate%2Ccadence'),
        expect.any(Object)
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should track rate limit info from headers', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'X-RateLimit-Limit': '200',
          'X-RateLimit-Usage': '150,200',
          'X-ReadRateLimit-Limit': '2000',
          'X-ReadRateLimit-Usage': '1500,2000',
        }),
        json: async () => [],
      });

      await stravaService.fetchActivities();

      const rateLimitInfo = stravaService.getRateLimitInfo();

      expect(rateLimitInfo.shortTerm.limit).toBe(200);
      expect(rateLimitInfo.shortTerm.usage).toBe(150);
      expect(rateLimitInfo.longTerm.limit).toBe(2000);
      expect(rateLimitInfo.longTerm.usage).toBe(1500);
    });

    it('should detect approaching rate limit (>80%)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'X-RateLimit-Limit': '200',
          'X-RateLimit-Usage': '170,200', // 85% usage
        }),
        json: async () => [],
      });

      await stravaService.fetchActivities();

      expect(stravaService.isRateLimitApproaching()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when not authenticated', async () => {
      vi.mocked(useAuthStore.getState).mockReturnValueOnce({
        tokens: null,
        refreshAccessToken: vi.fn(),
      } as any);

      await expect(stravaService.fetchActivities()).rejects.toThrow('Not authenticated');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: async () => ({
          message: 'Activity not found',
        }),
      });

      await expect(stravaService.fetchActivityMetadata(999)).rejects.toThrow(
        'Activity not found'
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(stravaService.fetchActivities()).rejects.toThrow('Network error');
    });
  });
});
