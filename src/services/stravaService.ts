import type {
  StravaActivity,
  StravaActivityDetailed,
  StravaStreamsResponse,
  StravaRateLimitInfo,
  StravaAPIError,
} from '../types/strava';
import { useAuthStore } from '../stores/authStore';

/**
 * Strava API client service with rate limiting
 */
class StravaService {
  private readonly BASE_URL = 'https://www.strava.com/api/v3';
  private rateLimitInfo: StravaRateLimitInfo = {
    shortTerm: { limit: 200, usage: 0 }, // 200 requests per 15 minutes
    longTerm: { limit: 2000, usage: 0 }, // 2000 requests per day
  };

  /**
   * Make authenticated request to Strava API
   * Automatically refreshes token if expired
   */
  private async authenticatedFetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const { tokens, refreshAccessToken } = useAuthStore.getState();

    if (!tokens) {
      throw new Error('Not authenticated');
    }

    // Check if token is expired and refresh if needed
    const now = Date.now();
    if (now >= tokens.expiresAt) {
      await refreshAccessToken();
    }

    const response = await fetch(`${this.BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${useAuthStore.getState().tokens?.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Update rate limit info from response headers
    this.updateRateLimitInfo(response.headers);

    if (!response.ok) {
      const errorData: StravaAPIError = await response.json().catch(() => ({
        message: 'Unknown error',
      }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update rate limit tracking from response headers
   */
  private updateRateLimitInfo(headers: Headers): void {
    const shortTermLimit = headers.get('X-RateLimit-Limit');
    const shortTermUsage = headers.get('X-RateLimit-Usage');
    const longTermLimit = headers.get('X-ReadRateLimit-Limit');
    const longTermUsage = headers.get('X-ReadRateLimit-Usage');

    if (shortTermLimit && shortTermUsage) {
      const [usage] = shortTermUsage.split(',').map(Number);
      this.rateLimitInfo.shortTerm = { limit: Number(shortTermLimit), usage };
    }

    if (longTermLimit && longTermUsage) {
      const [usage] = longTermUsage.split(',').map(Number);
      this.rateLimitInfo.longTerm = { limit: Number(longTermLimit), usage };
    }
  }

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): StravaRateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  /**
   * Check if rate limit is approaching (>80% usage)
   */
  isRateLimitApproaching(): boolean {
    const shortTermPercent = this.rateLimitInfo.shortTerm.usage / this.rateLimitInfo.shortTerm.limit;
    const longTermPercent = this.rateLimitInfo.longTerm.usage / this.rateLimitInfo.longTerm.limit;
    return shortTermPercent > 0.8 || longTermPercent > 0.8;
  }

  /**
   * Fetch paginated list of activities
   * @param page - Page number (1-indexed)
   * @param perPage - Activities per page (max 200, default 30)
   * @returns Array of activities
   */
  async fetchActivities(page: number = 1, perPage: number = 30): Promise<StravaActivity[]> {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(Math.min(perPage, 200)),
    });

    return this.authenticatedFetch<StravaActivity[]>(`/athlete/activities?${params}`);
  }

  /**
   * Fetch detailed metadata for a single activity
   * @param activityId - Strava activity ID
   * @returns Detailed activity data
   */
  async fetchActivityMetadata(activityId: number): Promise<StravaActivityDetailed> {
    return this.authenticatedFetch<StravaActivityDetailed>(`/activities/${activityId}`);
  }

  /**
   * Fetch GPS streams for an activity
   * @param activityId - Strava activity ID
   * @param streamTypes - Types of streams to fetch (default: latlng, altitude, time, distance)
   * @returns Streams data
   */
  async fetchActivityStreams(
    activityId: number,
    streamTypes: string[] = ['latlng', 'altitude', 'time', 'distance']
  ): Promise<StravaStreamsResponse> {
    const keys = streamTypes.join(',');
    const params = new URLSearchParams({
      keys,
      key_by_type: 'true',
    });

    return this.authenticatedFetch<StravaStreamsResponse>(
      `/activities/${activityId}/streams?${params}`
    );
  }

  /**
   * Upload a new activity to Strava
   * @param gpxData - GPX file content
   * @param name - Activity name
   * @param description - Activity description
   * @param activityType - Activity type (e.g., 'run', 'ride')
   * @returns Upload response with activity ID
   */
  async uploadActivity(
    gpxData: string,
    name: string,
    description?: string,
    activityType: string = 'run'
  ): Promise<{ id: number; id_str: string; activity_id: number }> {
    const formData = new FormData();
    const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
    formData.append('file', blob, 'activity.gpx');
    formData.append('name', name);
    formData.append('data_type', 'gpx');
    formData.append('activity_type', activityType);
    if (description) {
      formData.append('description', description);
    }

    const { tokens, refreshAccessToken } = useAuthStore.getState();

    if (!tokens) {
      throw new Error('Not authenticated');
    }

    // Check if token is expired and refresh if needed
    const now = Date.now();
    if (now >= tokens.expiresAt) {
      await refreshAccessToken();
    }

    const response = await fetch(`${this.BASE_URL}/uploads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().tokens?.accessToken}`,
      },
      body: formData,
    });

    this.updateRateLimitInfo(response.headers);

    if (!response.ok) {
      const errorData: StravaAPIError = await response.json().catch(() => ({
        message: 'Upload failed',
      }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update an existing activity
   * @param activityId - Strava activity ID
   * @param updates - Fields to update
   * @returns Updated activity data
   */
  async updateActivity(
    activityId: number,
    updates: {
      name?: string;
      description?: string;
      type?: string;
      gear_id?: string;
    }
  ): Promise<StravaActivityDetailed> {
    return this.authenticatedFetch<StravaActivityDetailed>(`/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }
}

// Export singleton instance
export const stravaService = new StravaService();
