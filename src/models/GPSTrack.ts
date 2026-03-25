import { GPSPoint } from './GPSPoint';
import type { StravaStreams } from '../utils/strava';

export interface TrackMetadata {
  name: string;
  type: string;
  startTime: Date;
  endTime: Date;
}

export interface Gap {
  startIndex: number;
  endIndex: number;
  distance: number;
  timeDelta: number; // seconds
}

export interface LatLngBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Represents a complete GPS track with analysis capabilities
 */
export class GPSTrack {
  points: GPSPoint[];
  metadata: TrackMetadata;

  constructor(points: GPSPoint[], metadata: Partial<TrackMetadata> = {}) {
    this.points = points;
    this.metadata = {
      name: metadata.name || 'Unnamed Activity',
      type: metadata.type || 'Run',
      startTime: metadata.startTime || (points[0]?.time ?? new Date()),
      endTime: metadata.endTime || (points[points.length - 1]?.time ?? new Date()),
    };

    // Ensure cumulative distances are calculated
    this.recalculateDistances();
  }

  /**
   * Recalculate cumulative distances for all points
   */
  private recalculateDistances(): void {
    if (this.points.length === 0) return;

    this.points[0].distance = 0;

    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];
      curr.distance = prev.distance + prev.distanceTo(curr);
    }
  }

  /**
   * Get total distance in meters
   */
  get totalDistance(): number {
    if (this.points.length === 0) return 0;
    return this.points[this.points.length - 1].distance;
  }

  /**
   * Get total elapsed time in seconds
   */
  get totalTime(): number {
    if (this.points.length < 2) return 0;
    const start = this.points[0].time.getTime();
    const end = this.points[this.points.length - 1].time.getTime();
    return (end - start) / 1000;
  }

  /**
   * Get moving time in seconds (excludes stationary periods)
   * A point is considered stationary if speed < 0.5 m/s
   */
  get movingTime(): number {
    if (this.points.length < 2) return 0;

    let movingSeconds = 0;
    const stationaryThreshold = 0.5; // m/s

    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];
      const speed = curr.speedTo(prev);

      if (speed >= stationaryThreshold) {
        const timeDelta = (curr.time.getTime() - prev.time.getTime()) / 1000;
        movingSeconds += timeDelta;
      }
    }

    return movingSeconds;
  }

  /**
   * Get average speed in meters per second
   */
  get averageSpeed(): number {
    const movingTime = this.movingTime;
    if (movingTime === 0) return 0;
    return this.totalDistance / movingTime;
  }

  /**
   * Get maximum speed in meters per second
   */
  get maxSpeed(): number {
    if (this.points.length < 2) return 0;

    let max = 0;

    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];
      const speed = curr.speedTo(prev);
      max = Math.max(max, speed);
    }

    return max;
  }

  /**
   * Get total elevation gain in meters
   */
  get elevationGain(): number {
    if (this.points.length < 2) return 0;

    let gain = 0;

    for (let i = 1; i < this.points.length; i++) {
      const elevChange = this.points[i].elevation - this.points[i - 1].elevation;
      if (elevChange > 0) {
        gain += elevChange;
      }
    }

    return gain;
  }

  /**
   * Alias for elevationGain — total elevation gain in meters
   */
  get totalElevationGain(): number {
    return this.elevationGain;
  }

  /**
   * Get minimum elevation in meters
   */
  get minElevation(): number {
    if (this.points.length === 0) return 0;
    let min = this.points[0].elevation;
    for (let i = 1; i < this.points.length; i++) {
      if (this.points[i].elevation < min) min = this.points[i].elevation;
    }
    return min;
  }

  /**
   * Get maximum elevation in meters
   */
  get maxElevation(): number {
    if (this.points.length === 0) return 0;
    let max = this.points[0].elevation;
    for (let i = 1; i < this.points.length; i++) {
      if (this.points[i].elevation > max) max = this.points[i].elevation;
    }
    return max;
  }

  /**
   * Get total elevation loss in meters
   */
  get elevationLoss(): number {
    if (this.points.length < 2) return 0;

    let loss = 0;

    for (let i = 1; i < this.points.length; i++) {
      const elevChange = this.points[i].elevation - this.points[i - 1].elevation;
      if (elevChange < 0) {
        loss += Math.abs(elevChange);
      }
    }

    return loss;
  }

  /**
   * Get bounding box for the track
   */
  get bounds(): LatLngBounds {
    if (this.points.length === 0) {
      return { north: 0, south: 0, east: 0, west: 0 };
    }

    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;

    for (const point of this.points) {
      north = Math.max(north, point.lat);
      south = Math.min(south, point.lat);
      east = Math.max(east, point.lng);
      west = Math.min(west, point.lng);
    }

    return { north, south, east, west };
  }

  /**
   * Detect gaps in the track (paused recordings)
   * @param minTimeDelta - Minimum time gap in seconds to consider a pause (default: 60)
   * @returns Array of detected gaps
   */
  detectGaps(minTimeDelta: number = 60): Gap[] {
    if (this.points.length < 2) return [];

    const gaps: Gap[] = [];

    for (let i = 0; i < this.points.length - 1; i++) {
      const curr = this.points[i];
      const next = this.points[i + 1];

      const timeDelta = (next.time.getTime() - curr.time.getTime()) / 1000;

      if (timeDelta >= minTimeDelta) {
        gaps.push({
          startIndex: i,
          endIndex: i + 1,
          distance: curr.distanceTo(next),
          timeDelta,
        });
      }
    }

    return gaps;
  }

  /**
   * Detect GPS spikes using speed and distance thresholds
   * @param speedThreshold - Maximum realistic speed in m/s (default: 22 for ~50 mph)
   * @param distanceThreshold - Maximum realistic point-to-point distance in meters (default: 100)
   * @returns Array of spike indices
   */
  detectSpikes(speedThreshold: number = 22, distanceThreshold: number = 100): number[] {
    if (this.points.length < 3) return [];

    const spikeIndices: number[] = [];

    for (let i = 1; i < this.points.length - 1; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];
      const next = this.points[i + 1];

      // Calculate instantaneous speed
      const speed = curr.speedTo(prev);

      // Check for sudden distance jumps
      const distanceFromPrev = prev.distanceTo(curr);
      const distanceFromNext = curr.distanceTo(next);

      // Detect spike if:
      // 1. Speed exceeds threshold
      // 2. Distance jump exceeds threshold
      if (
        speed > speedThreshold ||
        distanceFromPrev > distanceThreshold ||
        distanceFromNext > distanceThreshold
      ) {
        spikeIndices.push(i);
      }
    }

    return spikeIndices;
  }

  /**
   * Trim the track to a specified range
   * @param startIndex - Index of first point to keep
   * @param endIndex - Index of last point to keep
   * @returns New GPSTrack with trimmed points
   */
  trim(startIndex: number, endIndex: number): GPSTrack {
    const trimmedPoints = this.points.slice(startIndex, endIndex + 1);
    return new GPSTrack(trimmedPoints, this.metadata);
  }

  /**
   * Remove specific points from the track
   * @param indices - Array of indices to remove
   * @returns New GPSTrack with points removed
   */
  removePoints(indices: number[]): GPSTrack {
    const indexSet = new Set(indices);
    const filteredPoints = this.points.filter((_, i) => !indexSet.has(i));
    return new GPSTrack(filteredPoints, this.metadata);
  }

  /**
   * Replace a section of the track with new points
   * @param startIndex - Index of first point to replace
   * @param endIndex - Index of last point to replace
   * @param newPoints - Array of new GPS points to insert
   * @returns New GPSTrack with section replaced
   */
  replaceSection(
    startIndex: number,
    endIndex: number,
    newPoints: GPSPoint[]
  ): GPSTrack {
    const before = this.points.slice(0, startIndex);
    const after = this.points.slice(endIndex + 1);
    const combined = [...before, ...newPoints, ...after];
    return new GPSTrack(combined, this.metadata);
  }

  /**
   * Create a deep copy of the track
   * @returns New GPSTrack instance
   */
  clone(): GPSTrack {
    const clonedPoints = this.points.map(
      (p) => new GPSPoint(p.lat, p.lng, p.elevation, new Date(p.time), p.distance)
    );
    return new GPSTrack(clonedPoints, { ...this.metadata });
  }

  /**
   * Convert track to GPX format
   * Note: Use trackToGPX from utils/gpx instead for better tree-shaking
   * @returns GPX file content as string
   */
  toGPX(): string {
    // Will be implemented via utility function to avoid circular dependency
    throw new Error('Use trackToGPX from utils/gpx instead');
  }

  /**
   * Parse GPX string and create GPSTrack
   * Note: Use parseGPXToTrack from utils/gpx instead for better tree-shaking
   * @param _gpxString - GPX file content
   * @returns GPSTrack instance
   */
  static fromGPX(_gpxString: string): GPSTrack {
    // Will be implemented via utility function to avoid circular dependency
    throw new Error('Use parseGPXToTrack from utils/gpx instead');
  }

  /**
   * Create GPSTrack from Strava API streams
   * Note: Use streamsToTrack from utils/strava instead for better tree-shaking
   * @param _streams - Strava streams data
   * @param _metadata - Optional track metadata
   * @returns GPSTrack instance
   */
  static fromStravaStreams(_streams: StravaStreams, _metadata?: Partial<TrackMetadata>): GPSTrack {
    // Will be implemented via utility function to avoid circular dependency
    throw new Error('Use streamsToTrack from utils/strava instead');
  }
}
