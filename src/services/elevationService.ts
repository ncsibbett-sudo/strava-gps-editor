/**
 * Service for fetching real elevation data from terrain APIs
 */

export interface ElevationPoint {
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface ElevationResult {
  results: ElevationPoint[];
}

/**
 * Service to fetch elevation data from Open-Elevation API
 * API: https://open-elevation.com/ (free, no API key required)
 * Rate limit: Be reasonable, batch requests
 */
class ElevationService {
  private readonly API_URL = 'https://api.open-elevation.com/api/v1/lookup';
  private readonly MAX_POINTS_PER_REQUEST = 500;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly cache = new Map<string, number>(); // Cache by "lat,lng" -> elevation

  /**
   * Get cache key for a coordinate
   */
  private getCacheKey(lat: number, lng: number): string {
    // Round to 5 decimal places (~1 meter precision) for cache key
    return `${lat.toFixed(5)},${lng.toFixed(5)}`;
  }

  /**
   * Fetch elevation for a single point
   * Uses cache if available
   */
  async getElevation(lat: number, lng: number): Promise<number> {
    const cacheKey = this.getCacheKey(lat, lng);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Fetch from API
    const result = await this.getElevations([{ lat, lng }]);
    return result[0];
  }

  /**
   * Fetch elevation for multiple points in batch
   * Automatically splits into multiple requests if > 500 points
   * Uses cache for already-fetched coordinates
   */
  async getElevations(
    points: Array<{ lat: number; lng: number }>
  ): Promise<number[]> {
    if (points.length === 0) return [];

    const results: number[] = new Array(points.length);
    const pointsToFetch: Array<{ lat: number; lng: number; originalIndex: number }> = [];

    // Check cache first
    points.forEach((point, index) => {
      const cacheKey = this.getCacheKey(point.lat, point.lng);
      const cached = this.cache.get(cacheKey);

      if (cached !== undefined) {
        results[index] = cached;
      } else {
        pointsToFetch.push({ ...point, originalIndex: index });
      }
    });

    // If all points were cached, return early
    if (pointsToFetch.length === 0) {
      return results;
    }

    // Split into batches of MAX_POINTS_PER_REQUEST
    const batches: Array<Array<{ lat: number; lng: number; originalIndex: number }>> = [];
    for (let i = 0; i < pointsToFetch.length; i += this.MAX_POINTS_PER_REQUEST) {
      batches.push(pointsToFetch.slice(i, i + this.MAX_POINTS_PER_REQUEST));
    }

    // Fetch all batches
    for (const batch of batches) {
      const elevations = await this.fetchBatch(
        batch.map(p => ({ latitude: p.lat, longitude: p.lng }))
      );

      // Store results in correct positions and update cache
      elevations.forEach((elevation, i) => {
        const point = batch[i];
        results[point.originalIndex] = elevation;

        // Update cache
        const cacheKey = this.getCacheKey(point.lat, point.lng);
        this.cache.set(cacheKey, elevation);
      });

      // Small delay between batches to be nice to the API
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Fetch a single batch from the API
   * Maximum 500 points per request
   */
  private async fetchBatch(
    locations: Array<{ latitude: number; longitude: number }>
  ): Promise<number[]> {
    if (locations.length > this.MAX_POINTS_PER_REQUEST) {
      throw new Error(
        `Too many points in batch (${locations.length}). Maximum is ${this.MAX_POINTS_PER_REQUEST}`
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locations }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Open-Elevation API error: ${response.status} ${response.statusText}`
        );
      }

      const data: ElevationResult = await response.json();

      if (!data.results || data.results.length !== locations.length) {
        throw new Error('Open-Elevation API returned incomplete results');
      }

      return data.results.map(r => r.elevation);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Elevation API request timed out. Please try again.');
      }

      throw error;
    }
  }

  /**
   * Clear the elevation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (number of cached coordinates)
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const elevationService = new ElevationService();
