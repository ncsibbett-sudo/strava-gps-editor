import { describe, it, expect } from 'vitest';
import polyline from '@mapbox/polyline';
import { analyzeTrack, analyzeActivityHints, getIssuesSummary, getTotalIssueCount } from './issueDetectionService';
import { GPSPoint } from '../models/GPSPoint';
import { GPSTrack } from '../models/GPSTrack';

// Helper: build a straight track with ~89m between points and 10s intervals
// (Using 10s so consecutive points do NOT trigger the >=60s gap detection threshold)
function makeCleanTrack(count: number, elevation = 100): GPSTrack {
  const base = new Date('2024-06-01T08:00:00Z');
  const points = Array.from({ length: count }, (_, i) =>
    new GPSPoint(
      40.0 + i * 0.0008,
      -105.0,
      elevation,
      new Date(base.getTime() + i * 10_000), // 10-second intervals
      i * 89
    )
  );
  return new GPSTrack(points, { name: 'Test', type: 'Run' });
}

// Helper: build a track where all elevations are 0
function makeNoElevationTrack(count: number): GPSTrack {
  const base = new Date('2024-06-01T08:00:00Z');
  const points = Array.from({ length: count }, (_, i) =>
    new GPSPoint(40.0 + i * 0.0008, -105.0, 0, new Date(base.getTime() + i * 10_000), i * 89)
  );
  return new GPSTrack(points, { name: 'Test', type: 'Run' });
}

// Helper: build a track with a clear GPS spike at index 3
function makeTrackWithSpike(count: number): GPSTrack {
  const base = new Date('2024-06-01T08:00:00Z');
  const points = Array.from({ length: count }, (_, i) =>
    new GPSPoint(
      40.0 + i * 0.0008,
      -105.0,
      100,
      new Date(base.getTime() + i * 10_000), // 10-second intervals
      i * 89
    )
  );
  // Replace point 3 with a faraway spike (~11 km north, same time interval = unrealistic speed)
  points[3] = new GPSPoint(40.1, -105.0, 100, new Date(base.getTime() + 3 * 10_000), 0);
  return new GPSTrack(points, { name: 'Test', type: 'Run' });
}

// Helper: build a track with an elevation anomaly
function makeTrackWithElevationAnomaly(): GPSTrack {
  const base = new Date('2024-06-01T08:00:00Z');
  const points = [
    new GPSPoint(40.0, -105.0, 100, new Date(base.getTime()), 0),
    new GPSPoint(40.0008, -105.0, 110, new Date(base.getTime() + 10_000), 89),
    new GPSPoint(40.0016, -105.0, 350, new Date(base.getTime() + 20_000), 178), // +240m jump
    new GPSPoint(40.0024, -105.0, 120, new Date(base.getTime() + 30_000), 267),
  ];
  return new GPSTrack(points, { name: 'Test', type: 'Run' });
}

describe('analyzeTrack', () => {
  it('returns no issues for a clean track', () => {
    const track = makeCleanTrack(10);
    const result = analyzeTrack(track);
    expect(result.spikeIndices).toHaveLength(0);
    expect(result.gapCount).toBe(0);
    expect(result.elevationAnomalyCount).toBe(0);
    expect(result.missingElevation).toBe(false);
  });

  it('detects a spike', () => {
    const track = makeTrackWithSpike(8);
    const result = analyzeTrack(track);
    expect(result.spikeIndices.length).toBeGreaterThan(0);
    expect(result.spikeIndices).toContain(3);
  });

  it('detects missing elevation when all points are 0', () => {
    const track = makeNoElevationTrack(5);
    const result = analyzeTrack(track);
    expect(result.missingElevation).toBe(true);
  });

  it('does not flag missing elevation when elevations are non-zero', () => {
    const track = makeCleanTrack(5, 200);
    const result = analyzeTrack(track);
    expect(result.missingElevation).toBe(false);
  });

  it('detects elevation anomaly > 100m jump', () => {
    const track = makeTrackWithElevationAnomaly();
    const result = analyzeTrack(track);
    expect(result.elevationAnomalyCount).toBeGreaterThan(0);
  });

  it('detects a gap (long time between points)', () => {
    const base = new Date('2024-06-01T08:00:00Z');
    const points = [
      new GPSPoint(40.0, -105.0, 100, new Date(base.getTime()), 0),
      new GPSPoint(40.0008, -105.0, 100, new Date(base.getTime() + 10_000), 89),
      // 10-minute gap — should be detected (>= 60s threshold)
      new GPSPoint(40.0016, -105.0, 100, new Date(base.getTime() + 610_000), 178),
      new GPSPoint(40.0024, -105.0, 100, new Date(base.getTime() + 620_000), 267),
    ];
    const track = new GPSTrack(points, { name: 'Test', type: 'Run' });
    const result = analyzeTrack(track);
    expect(result.gapCount).toBeGreaterThan(0);
  });
});

describe('analyzeActivityHints', () => {
  it('returns noGPS=true when summaryPolyline is undefined', () => {
    const hints = analyzeActivityHints(undefined, 0);
    expect(hints.noGPS).toBe(true);
    expect(hints.likelyHasSpikes).toBe(false);
  });

  it('returns noGPS=true when summaryPolyline is empty string (falsy)', () => {
    // Empty string is falsy — treated the same as undefined
    const hints = analyzeActivityHints('', 100);
    expect(hints.noGPS).toBe(true);
    expect(hints.likelyHasSpikes).toBe(false);
  });

  it('detects missingElevation when totalElevationGain is 0', () => {
    const hints = analyzeActivityHints(undefined, 0);
    expect(hints.missingElevation).toBe(true);
  });

  it('does not flag missingElevation when gain > 0', () => {
    const hints = analyzeActivityHints(undefined, 250);
    expect(hints.missingElevation).toBe(false);
  });

  it('counts issues correctly', () => {
    const hints = analyzeActivityHints(undefined, 0); // noGPS + missingElevation
    expect(hints.issueCount).toBe(1); // only missingElevation counted (noGPS is separate)
  });

  it('handles a corrupt/invalid polyline gracefully', () => {
    const hints = analyzeActivityHints('%%%INVALID%%%', 100);
    expect(hints.likelyHasSpikes).toBe(false);
    expect(hints.noGPS).toBe(false);
  });

  it('detects likely spike when polyline has >1km jump', () => {
    // Encode two points 2 degrees apart (~222 km)
    const encoded = polyline.encode([
      [40.0, -105.0],
      [42.0, -105.0], // 2 degrees lat = ~222 km jump
    ]);
    const hints = analyzeActivityHints(encoded, 100);
    expect(hints.likelyHasSpikes).toBe(true);
  });
});

describe('getIssuesSummary', () => {
  it('returns "No issues found" when no issues', () => {
    const summary = getIssuesSummary({ spikeIndices: [], gapCount: 0, elevationAnomalyCount: 0, missingElevation: false });
    expect(summary).toBe('No issues found');
  });

  it('includes spike count in singular form', () => {
    const summary = getIssuesSummary({ spikeIndices: [2], gapCount: 0, elevationAnomalyCount: 0, missingElevation: false });
    expect(summary).toContain('1 spike');
  });

  it('includes spike count in plural form', () => {
    const summary = getIssuesSummary({ spikeIndices: [2, 5, 8], gapCount: 0, elevationAnomalyCount: 0, missingElevation: false });
    expect(summary).toContain('3 spikes');
  });

  it('includes gap count', () => {
    const summary = getIssuesSummary({ spikeIndices: [], gapCount: 2, elevationAnomalyCount: 0, missingElevation: false });
    expect(summary).toContain('2 gaps');
  });

  it('includes elevation anomaly count', () => {
    const summary = getIssuesSummary({ spikeIndices: [], gapCount: 0, elevationAnomalyCount: 1, missingElevation: false });
    expect(summary).toContain('1 elevation anomaly');
  });

  it('includes missing elevation', () => {
    const summary = getIssuesSummary({ spikeIndices: [], gapCount: 0, elevationAnomalyCount: 0, missingElevation: true });
    expect(summary).toContain('missing elevation');
  });

  it('combines multiple issues with commas', () => {
    const summary = getIssuesSummary({ spikeIndices: [1], gapCount: 1, elevationAnomalyCount: 0, missingElevation: false });
    expect(summary).toContain(',');
  });
});

describe('getTotalIssueCount', () => {
  it('returns 0 for clean track', () => {
    expect(getTotalIssueCount({ spikeIndices: [], gapCount: 0, elevationAnomalyCount: 0, missingElevation: false })).toBe(0);
  });

  it('sums all issue types', () => {
    expect(getTotalIssueCount({ spikeIndices: [1, 2], gapCount: 3, elevationAnomalyCount: 1, missingElevation: true })).toBe(7);
  });

  it('counts missingElevation as 1', () => {
    expect(getTotalIssueCount({ spikeIndices: [], gapCount: 0, elevationAnomalyCount: 0, missingElevation: true })).toBe(1);
  });
});
