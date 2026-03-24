import { describe, it, expect } from 'vitest';
import { detectSpikes, removeSpikes } from './spikeDetection';
import { GPSPoint } from '../models/GPSPoint';
import { GPSTrack } from '../models/GPSTrack';

// Helper: create a smooth track where each point is ~89m apart (0.0008 deg lat)
// with 60-second intervals → speed ≈ 1.48 m/s, well below 22 m/s and 100m thresholds
function makeNormalTrack(count: number, intervalSeconds = 60): GPSPoint[] {
  const base = new Date('2024-01-01T10:00:00Z');
  return Array.from({ length: count }, (_, i) =>
    new GPSPoint(
      40.0 + i * 0.0008,
      -105.0,
      1000,
      new Date(base.getTime() + i * intervalSeconds * 1000),
      0
    )
  );
}

describe('detectSpikes', () => {
  it('returns empty for tracks with fewer than 3 points', () => {
    const points = makeNormalTrack(2);
    expect(detectSpikes(points).indices).toEqual([]);
    expect(detectSpikes([]).indices).toEqual([]);
  });

  it('returns no spikes for a clean track', () => {
    const points = makeNormalTrack(10);
    expect(detectSpikes(points).indices).toEqual([]);
  });

  it('detects a point that exceeds the speed threshold', () => {
    const points = makeNormalTrack(5);
    // Replace point 2 with a location very far away (causes high speed)
    points[2] = new GPSPoint(
      40.0 + 0.1, // ~11 km north in 60s = ~183 m/s >> 22 m/s
      -105.0,
      1000,
      new Date(points[2].time),
      0
    );
    const { indices } = detectSpikes(points);
    expect(indices).toContain(2);
  });

  it('detects a point that exceeds the distance threshold', () => {
    const points = makeNormalTrack(5, 1); // 1-second intervals → low speed but could still be far
    // Place point 2 far away: 0.05 deg ≈ 5.5 km > 100m threshold
    points[2] = new GPSPoint(40.05, -105.0, 1000, new Date(points[2].time), 0);
    const { indices } = detectSpikes(points);
    expect(indices).toContain(2);
  });

  it('does not flag first or last point', () => {
    const points = makeNormalTrack(5);
    // Make first and last points look like spikes by shifting their neighbors
    const { indices } = detectSpikes(points);
    expect(indices).not.toContain(0);
    expect(indices).not.toContain(points.length - 1);
  });

  it('respects custom speed threshold', () => {
    const points = makeNormalTrack(5, 60); // ~1.85 m/s between points
    // Default threshold 22 m/s → no spikes
    expect(detectSpikes(points, { speedThreshold: 22 }).indices).toEqual([]);
    // Very low threshold 1 m/s → all interior points flagged
    const { indices } = detectSpikes(points, { speedThreshold: 1 });
    expect(indices.length).toBeGreaterThan(0);
  });

  it('respects custom distance threshold', () => {
    const points = makeNormalTrack(5, 60); // ~111m between points
    // Threshold 200m → no spikes
    expect(detectSpikes(points, { distanceThreshold: 200 }).indices).toEqual([]);
    // Threshold 50m → all interior points flagged
    const { indices } = detectSpikes(points, { distanceThreshold: 50 });
    expect(indices.length).toBeGreaterThan(0);
  });

  it('detects multiple spikes', () => {
    const points = makeNormalTrack(10);
    // Spike at indices 2 and 6
    const spike = new GPSPoint(41.0, -104.0, 1000, new Date(points[2].time), 0);
    points[2] = spike;
    const spike2 = new GPSPoint(41.0, -104.0, 1000, new Date(points[6].time), 0);
    points[6] = spike2;
    const { indices } = detectSpikes(points);
    expect(indices).toContain(2);
    expect(indices).toContain(6);
  });
});

describe('removeSpikes', () => {
  it('returns a clone when no spikes detected', () => {
    const points = makeNormalTrack(5);
    const track = new GPSTrack(points);
    const result = removeSpikes(track);
    expect(result.points.length).toBe(5);
  });

  it('removes detected spike points from track', () => {
    const points = makeNormalTrack(7);
    points[3] = new GPSPoint(41.5, -104.0, 1000, new Date(points[3].time), 0);
    const track = new GPSTrack(points);
    const result = removeSpikes(track);
    expect(result.points.length).toBeLessThan(7);
  });

  it('preserves track metadata after spike removal', () => {
    const points = makeNormalTrack(6);
    points[2] = new GPSPoint(41.0, -104.0, 1000, new Date(points[2].time), 0);
    const track = new GPSTrack(points, { name: 'Test Run', type: 'Run' });
    const result = removeSpikes(track);
    expect(result.metadata.name).toBe('Test Run');
    expect(result.metadata.type).toBe('Run');
  });
});

describe('detectSpikes performance', () => {
  it('handles 50,000 point track within 500ms', () => {
    const points = makeNormalTrack(50000);
    const start = performance.now();
    detectSpikes(points);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});
