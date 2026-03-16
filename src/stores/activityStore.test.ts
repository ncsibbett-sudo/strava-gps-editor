import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useActivityStore } from './activityStore';
import { stravaService } from '../services/stravaService';
import type { StravaActivity, StravaActivityDetailed } from '../types/strava';

// Mock the stravaService
vi.mock('../services/stravaService', () => ({
  stravaService: {
    fetchActivities: vi.fn(),
    fetchActivityMetadata: vi.fn(),
    fetchActivityStreams: vi.fn(),
  },
}));

// Mock the utils
vi.mock('../utils/strava', () => ({
  streamsToTrack: vi.fn(() => ({
    points: [],
    metadata: { name: 'Test', type: 'Run' },
  })),
}));

describe('ActivityStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useActivityStore.getState().reset();
  });

  describe('loadActivities', () => {
    it('should load activities on first page', async () => {
      const mockActivities: StravaActivity[] = [
        {
          id: 1,
          name: 'Morning Run',
          type: 'Run',
          start_date: '2024-01-01T08:00:00Z',
          start_date_local: '2024-01-01T08:00:00Z',
          distance: 5000,
          moving_time: 1800,
          elapsed_time: 1800,
          total_elevation_gain: 50,
          sport_type: 'Run',
          map: { id: '1', summary_polyline: '', resource_state: 2 },
        },
      ];

      vi.mocked(stravaService.fetchActivities).mockResolvedValueOnce(mockActivities);

      await useActivityStore.getState().loadActivities(1);

      const state = useActivityStore.getState();
      expect(state.activities).toEqual(mockActivities);
      expect(state.filteredActivities).toEqual(mockActivities);
      expect(state.currentPage).toBe(1);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should append activities on subsequent pages', async () => {
      const page1Activities: StravaActivity[] = [
        {
          id: 1,
          name: 'Activity 1',
          type: 'Run',
          start_date: '2024-01-01T08:00:00Z',
          start_date_local: '2024-01-01T08:00:00Z',
          distance: 5000,
          moving_time: 1800,
          elapsed_time: 1800,
          total_elevation_gain: 50,
          sport_type: 'Run',
          map: { id: '1', summary_polyline: '', resource_state: 2 },
        },
      ];

      const page2Activities: StravaActivity[] = [
        {
          id: 2,
          name: 'Activity 2',
          type: 'Ride',
          start_date: '2024-01-02T08:00:00Z',
          start_date_local: '2024-01-02T08:00:00Z',
          distance: 20000,
          moving_time: 3600,
          elapsed_time: 3600,
          total_elevation_gain: 200,
          sport_type: 'Ride',
          map: { id: '2', summary_polyline: '', resource_state: 2 },
        },
      ];

      vi.mocked(stravaService.fetchActivities).mockResolvedValueOnce(page1Activities);
      await useActivityStore.getState().loadActivities(1);

      vi.mocked(stravaService.fetchActivities).mockResolvedValueOnce(page2Activities);
      await useActivityStore.getState().loadActivities(2);

      const state = useActivityStore.getState();
      expect(state.activities).toHaveLength(2);
      expect(state.activities[0].id).toBe(1);
      expect(state.activities[1].id).toBe(2);
      expect(state.currentPage).toBe(2);
    });

    it('should set hasMore to false when fewer than 30 activities returned', async () => {
      const mockActivities: StravaActivity[] = Array(15)
        .fill(null)
        .map((_, i) => ({
          id: i,
          name: `Activity ${i}`,
          type: 'Run',
          start_date: '2024-01-01T08:00:00Z',
          start_date_local: '2024-01-01T08:00:00Z',
          distance: 5000,
          moving_time: 1800,
          elapsed_time: 1800,
          total_elevation_gain: 50,
          sport_type: 'Run',
          map: { id: String(i), summary_polyline: '', resource_state: 2 },
        }));

      vi.mocked(stravaService.fetchActivities).mockResolvedValueOnce(mockActivities);

      await useActivityStore.getState().loadActivities(1);

      const state = useActivityStore.getState();
      expect(state.hasMore).toBe(false);
    });

    it('should handle errors', async () => {
      vi.mocked(stravaService.fetchActivities).mockRejectedValueOnce(
        new Error('Network error')
      );

      await useActivityStore.getState().loadActivities(1);

      const state = useActivityStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('selectActivity', () => {
    it('should load activity metadata and GPS data', async () => {
      const mockActivity: StravaActivityDetailed = {
        id: 123,
        name: 'Test Run',
        type: 'Run',
        start_date: '2024-01-01T08:00:00Z',
        start_date_local: '2024-01-01T08:00:00Z',
        distance: 5000,
        moving_time: 1800,
        elapsed_time: 1800,
        total_elevation_gain: 50,
        sport_type: 'Run',
        map: { id: '1', summary_polyline: '', resource_state: 2 },
        description: 'Great run!',
      };

      const mockStreams = {
        latlng: {
          type: 'latlng',
          data: [
            [40.0, -74.0],
            [40.001, -74.001],
          ] as [number, number][],
          series_type: 'distance',
          original_size: 2,
          resolution: 'high',
        },
      };

      vi.mocked(stravaService.fetchActivityMetadata).mockResolvedValueOnce(mockActivity);
      vi.mocked(stravaService.fetchActivityStreams).mockResolvedValueOnce(mockStreams);

      await useActivityStore.getState().selectActivity(123);

      const state = useActivityStore.getState();
      expect(state.selectedActivity).toEqual(mockActivity);
      expect(state.selectedActivityTrack).toBeTruthy();
      expect(state.isLoadingTrack).toBe(false);
      expect(state.trackError).toBeNull();
    });

    it('should handle activities without GPS data', async () => {
      const mockActivity: StravaActivityDetailed = {
        id: 123,
        name: 'Treadmill Run',
        type: 'Run',
        start_date: '2024-01-01T08:00:00Z',
        start_date_local: '2024-01-01T08:00:00Z',
        distance: 5000,
        moving_time: 1800,
        elapsed_time: 1800,
        total_elevation_gain: 0,
        sport_type: 'Run',
        map: { id: '1', summary_polyline: '', resource_state: 2 },
      };

      const mockStreams = {
        latlng: {
          type: 'latlng',
          data: [] as [number, number][],
          series_type: 'distance',
          original_size: 0,
          resolution: 'high',
        },
      };

      vi.mocked(stravaService.fetchActivityMetadata).mockResolvedValueOnce(mockActivity);
      vi.mocked(stravaService.fetchActivityStreams).mockResolvedValueOnce(mockStreams);

      await useActivityStore.getState().selectActivity(123);

      const state = useActivityStore.getState();
      expect(state.trackError).toBe('Activity does not contain GPS data');
      expect(state.selectedActivityTrack).toBeNull();
    });
  });

  describe('Filtering', () => {
    beforeEach(async () => {
      const mockActivities: StravaActivity[] = [
        {
          id: 1,
          name: 'Morning Run',
          type: 'Run',
          start_date: '2024-01-01T08:00:00Z',
          start_date_local: '2024-01-01T08:00:00Z',
          distance: 5000,
          moving_time: 1800,
          elapsed_time: 1800,
          total_elevation_gain: 50,
          sport_type: 'Run',
          map: { id: '1', summary_polyline: '', resource_state: 2 },
        },
        {
          id: 2,
          name: 'Evening Ride',
          type: 'Ride',
          start_date: '2024-01-15T18:00:00Z',
          start_date_local: '2024-01-15T18:00:00Z',
          distance: 20000,
          moving_time: 3600,
          elapsed_time: 3600,
          total_elevation_gain: 200,
          sport_type: 'Ride',
          map: { id: '2', summary_polyline: '', resource_state: 2 },
        },
      ];

      vi.mocked(stravaService.fetchActivities).mockResolvedValueOnce(mockActivities);
      await useActivityStore.getState().loadActivities(1);
    });

    it('should filter by search query', () => {
      useActivityStore.getState().setFilters({ searchQuery: 'morning' });
      useActivityStore.getState().applyFilters();

      const state = useActivityStore.getState();
      expect(state.filteredActivities).toHaveLength(1);
      expect(state.filteredActivities[0].name).toBe('Morning Run');
    });

    it('should filter by sport type', () => {
      useActivityStore.getState().setFilters({ sportType: 'Ride' });
      useActivityStore.getState().applyFilters();

      const state = useActivityStore.getState();
      expect(state.filteredActivities).toHaveLength(1);
      expect(state.filteredActivities[0].type).toBe('Ride');
    });

    it('should filter by date range', () => {
      useActivityStore.getState().setFilters({
        startDate: new Date('2024-01-10'),
        endDate: new Date('2024-01-20'),
      });
      useActivityStore.getState().applyFilters();

      const state = useActivityStore.getState();
      expect(state.filteredActivities).toHaveLength(1);
      expect(state.filteredActivities[0].name).toBe('Evening Ride');
    });

    it('should apply multiple filters together', () => {
      useActivityStore.getState().setFilters({
        searchQuery: 'ride',
        sportType: 'Ride',
      });
      useActivityStore.getState().applyFilters();

      const state = useActivityStore.getState();
      expect(state.filteredActivities).toHaveLength(1);
      expect(state.filteredActivities[0].name).toBe('Evening Ride');
    });
  });

  describe('clearSelection', () => {
    it('should clear selected activity and track', () => {
      useActivityStore.setState({
        selectedActivity: { id: 123 } as any,
        selectedActivityTrack: {} as any,
        trackError: 'Some error',
      });

      useActivityStore.getState().clearSelection();

      const state = useActivityStore.getState();
      expect(state.selectedActivity).toBeNull();
      expect(state.selectedActivityTrack).toBeNull();
      expect(state.trackError).toBeNull();
    });
  });
});
