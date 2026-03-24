import { GPSTrack, type Gap } from '../models/GPSTrack';

export type { Gap };

export interface GapDetectionOptions {
  minTimeDelta?: number; // seconds, default 60
}

/**
 * Detect gaps (paused recordings) in a GPS track.
 * A gap is a segment where the time between consecutive points exceeds the threshold.
 *
 * @param track - GPS track to analyze
 * @param options - Detection options
 * @returns Array of Gap objects with start/end indices, distance, and time delta
 */
export function detectGaps(track: GPSTrack, options: GapDetectionOptions = {}): Gap[] {
  const { minTimeDelta = 60 } = options;
  return track.detectGaps(minTimeDelta);
}

/**
 * Check whether a track contains any gaps.
 *
 * @param track - GPS track to analyze
 * @param options - Detection options
 * @returns true if at least one gap is detected
 */
export function hasGaps(track: GPSTrack, options: GapDetectionOptions = {}): boolean {
  return detectGaps(track, options).length > 0;
}
