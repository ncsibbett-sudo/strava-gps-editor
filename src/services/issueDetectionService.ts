import polyline from '@mapbox/polyline';
import type { GPSTrack } from '../models/GPSTrack';
import { detectSpikes } from '../utils/spikeDetection';
import { detectGaps } from '../utils/gapDetection';

export interface TrackIssues {
  spikeIndices: number[];
  gapCount: number;
  elevationAnomalyCount: number;
  missingElevation: boolean;
}

/** Lightweight issue hints derived from StravaActivity metadata — no GPS stream needed. */
export interface ActivityHints {
  likelyHasSpikes: boolean;
  missingElevation: boolean;
  noGPS: boolean;
  issueCount: number;
}

/**
 * Full analysis of a loaded GPSTrack.
 * Runs spike detection, gap detection, and elevation anomaly checks.
 */
export function analyzeTrack(track: GPSTrack): TrackIssues {
  const { indices: spikeIndices } = detectSpikes(track.points);
  const gaps = detectGaps(track);

  // Elevation anomalies: consecutive points with > 100m jump
  let elevationAnomalyCount = 0;
  for (let i = 1; i < track.points.length; i++) {
    if (Math.abs(track.points[i].elevation - track.points[i - 1].elevation) > 100) {
      elevationAnomalyCount++;
    }
  }

  const missingElevation = track.points.every((p) => p.elevation === 0);

  return { spikeIndices, gapCount: gaps.length, elevationAnomalyCount, missingElevation };
}

/**
 * Quick heuristic check using Strava summary_polyline + metadata.
 * Detects likely spikes (>1 km jump in simplified polyline) and missing elevation.
 * No API calls needed — runs on every activity card load.
 */
export function analyzeActivityHints(
  summaryPolyline: string | undefined,
  totalElevationGain: number
): ActivityHints {
  const missingElevation = totalElevationGain === 0;

  if (!summaryPolyline) {
    return { likelyHasSpikes: false, missingElevation, noGPS: true, issueCount: missingElevation ? 1 : 0 };
  }

  try {
    const coords = polyline.decode(summaryPolyline); // [[lat, lng], ...]
    let spikeCount = 0;

    for (let i = 1; i < coords.length; i++) {
      const [lat1, lng1] = coords[i - 1];
      const [lat2, lng2] = coords[i];
      const dx = (lat2 - lat1) * 111320;
      const dy = (lng2 - lng1) * 111320 * Math.cos((lat1 * Math.PI) / 180);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1000) spikeCount++; // 1 km jump in simplified polyline = likely spike
    }

    const likelyHasSpikes = spikeCount > 0;
    const issueCount = (likelyHasSpikes ? 1 : 0) + (missingElevation ? 1 : 0);

    return { likelyHasSpikes, missingElevation, noGPS: false, issueCount };
  } catch {
    return { likelyHasSpikes: false, missingElevation, noGPS: false, issueCount: missingElevation ? 1 : 0 };
  }
}

/** Human-readable summary of detected issues. */
export function getIssuesSummary(issues: TrackIssues): string {
  const parts: string[] = [];
  if (issues.spikeIndices.length > 0)
    parts.push(`${issues.spikeIndices.length} spike${issues.spikeIndices.length !== 1 ? 's' : ''}`);
  if (issues.gapCount > 0)
    parts.push(`${issues.gapCount} gap${issues.gapCount !== 1 ? 's' : ''}`);
  if (issues.elevationAnomalyCount > 0)
    parts.push(`${issues.elevationAnomalyCount} elevation anomal${issues.elevationAnomalyCount !== 1 ? 'ies' : 'y'}`);
  if (issues.missingElevation)
    parts.push('missing elevation');
  return parts.length > 0 ? parts.join(', ') : 'No issues found';
}

export function getTotalIssueCount(issues: TrackIssues): number {
  return (
    issues.spikeIndices.length +
    issues.gapCount +
    issues.elevationAnomalyCount +
    (issues.missingElevation ? 1 : 0)
  );
}
