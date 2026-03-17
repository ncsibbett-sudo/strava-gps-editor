import { create } from 'zustand';
import type { StravaActivity, StravaActivityDetailed } from '../types/strava';
import { stravaService } from '../services/stravaService';
import { GPSTrack } from '../models/GPSTrack';
import { streamsToTrack } from '../utils/strava';

export interface ActivityFilters {
  searchQuery: string;
  startDate?: Date;
  endDate?: Date;
  sportType?: string;
}

interface ActivityState {
  // Activity list
  activities: StravaActivity[];
  filteredActivities: StravaActivity[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;

  // Selected activity
  selectedActivity: StravaActivityDetailed | null;
  selectedActivityTrack: GPSTrack | null;
  isLoadingTrack: boolean;
  trackError: string | null;

  // Filters
  filters: ActivityFilters;

  // Computed
  getSportTypesByFrequency: () => Array<{ type: string; count: number }>;

  // Actions
  loadActivities: (page?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  selectActivity: (activityId: number) => Promise<void>;
  clearSelection: () => void;
  setFilters: (filters: Partial<ActivityFilters>) => void;
  applyFilters: () => void;
  reset: () => void;
}

const initialFilters: ActivityFilters = {
  searchQuery: '',
  startDate: undefined,
  endDate: undefined,
  sportType: undefined,
};

export const useActivityStore = create<ActivityState>((set, get) => ({
  // Initial state
  activities: [],
  filteredActivities: [],
  isLoading: false,
  error: null,
  hasMore: true,
  currentPage: 0,

  selectedActivity: null,
  selectedActivityTrack: null,
  isLoadingTrack: false,
  trackError: null,

  filters: initialFilters,

  /**
   * Get sport types sorted by frequency (most common first)
   */
  getSportTypesByFrequency: () => {
    const { activities } = get();

    // Count occurrences of each sport type
    const typeCounts = new Map<string, number>();

    activities.forEach((activity) => {
      const type = activity.type;
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });

    // Convert to array and sort by count (descending)
    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * Load activities from Strava API
   */
  loadActivities: async (page: number = 1) => {
    set({ isLoading: true, error: null });

    try {
      const activities = await stravaService.fetchActivities(page, 30);

      set((state) => ({
        activities: page === 1 ? activities : [...state.activities, ...activities],
        filteredActivities: page === 1 ? activities : [...state.activities, ...activities],
        currentPage: page,
        hasMore: activities.length === 30,
        isLoading: false,
      }));

      // Apply filters if any are set
      const { filters } = get();
      if (
        filters.searchQuery ||
        filters.startDate ||
        filters.endDate ||
        filters.sportType
      ) {
        get().applyFilters();
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load activities',
        isLoading: false,
      });
    }
  },

  /**
   * Load next page of activities
   */
  loadMore: async () => {
    const { currentPage, hasMore, isLoading } = get();

    if (!hasMore || isLoading) return;

    await get().loadActivities(currentPage + 1);
  },

  /**
   * Select an activity and load its GPS data
   */
  selectActivity: async (activityId: number) => {
    set({
      isLoadingTrack: true,
      trackError: null,
      selectedActivity: null,
      selectedActivityTrack: null,
    });

    try {
      // Fetch detailed activity metadata
      const activity = await stravaService.fetchActivityMetadata(activityId);

      // Fetch GPS streams
      const streams = await stravaService.fetchActivityStreams(activityId);

      // Check if activity has GPS data
      if (!streams.latlng || !streams.latlng.data || streams.latlng.data.length === 0) {
        throw new Error('Activity does not contain GPS data');
      }

      // Convert StravaStreamsResponse to StravaStreams format
      const track = streamsToTrack(
        {
          latlng: {
            data: streams.latlng.data as [number, number][],
          },
          altitude: streams.altitude
            ? {
                data: streams.altitude.data as number[],
              }
            : undefined,
          time: streams.time
            ? {
                data: streams.time.data as number[],
              }
            : undefined,
          distance: streams.distance
            ? {
                data: streams.distance.data as number[],
              }
            : undefined,
        },
        {
          name: activity.name,
          type: activity.type,
          startTime: new Date(activity.start_date),
        }
      );

      set({
        selectedActivity: activity,
        selectedActivityTrack: track,
        isLoadingTrack: false,
      });
    } catch (error) {
      set({
        trackError: error instanceof Error ? error.message : 'Failed to load activity GPS data',
        isLoadingTrack: false,
      });
    }
  },

  /**
   * Clear selected activity
   */
  clearSelection: () => {
    set({
      selectedActivity: null,
      selectedActivityTrack: null,
      trackError: null,
    });
  },

  /**
   * Update filters
   */
  setFilters: (newFilters: Partial<ActivityFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  /**
   * Apply filters to activities list
   */
  applyFilters: () => {
    const { activities, filters } = get();

    let filtered = [...activities];

    // Search query filter (name)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((activity) =>
        activity.name.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (filters.startDate) {
      filtered = filtered.filter(
        (activity) => new Date(activity.start_date) >= filters.startDate!
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(
        (activity) => new Date(activity.start_date) <= filters.endDate!
      );
    }

    // Sport type filter
    if (filters.sportType) {
      filtered = filtered.filter((activity) => activity.type === filters.sportType);
    }

    set({ filteredActivities: filtered });
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set({
      activities: [],
      filteredActivities: [],
      isLoading: false,
      error: null,
      hasMore: true,
      currentPage: 0,
      selectedActivity: null,
      selectedActivityTrack: null,
      isLoadingTrack: false,
      trackError: null,
      filters: initialFilters,
    });
  },
}));
