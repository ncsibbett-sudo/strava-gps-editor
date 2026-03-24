import { GPSPoint } from '../models/GPSPoint';
import { GPSTrack } from '../models/GPSTrack';

export interface SpikeDetectionOptions {
  speedThreshold?: number;    // m/s, default 22 (~50 mph)
  distanceThreshold?: number; // meters, default 100
}

export interface SpikeDetectionResult {
  indices: number[];
}

/**
 * Detect GPS spikes in a track using speed and distance thresholds.
 * A point is considered a spike if its speed from the previous point exceeds
 * the speed threshold, or if the distance to the previous or next point
 * exceeds the distance threshold.
 *
 * Optimized for O(n) performance on large tracks (50,000+ points).
 *
 * @param points - Array of GPS points
 * @param options - Detection thresholds
 * @returns Object containing array of spike indices
 */
export function detectSpikes(
  points: GPSPoint[],
  options: SpikeDetectionOptions = {}
): SpikeDetectionResult {
  const { speedThreshold = 22, distanceThreshold = 100 } = options;

  if (points.length < 3) {
    return { indices: [] };
  }

  const indices: number[] = [];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const speed = curr.speedTo(prev);
    const distFromPrev = prev.distanceTo(curr);
    const distFromNext = curr.distanceTo(next);

    if (
      speed > speedThreshold ||
      distFromPrev > distanceThreshold ||
      distFromNext > distanceThreshold
    ) {
      indices.push(i);
    }
  }

  return { indices };
}

/**
 * Remove detected spikes from a track, returning a new track.
 *
 * @param track - GPS track to clean
 * @param options - Detection thresholds
 * @returns New GPSTrack with spikes removed
 */
export function removeSpikes(
  track: GPSTrack,
  options: SpikeDetectionOptions = {}
): GPSTrack {
  const { indices } = detectSpikes(track.points, options);
  if (indices.length === 0) return track.clone();
  return track.removePoints(indices);
}
