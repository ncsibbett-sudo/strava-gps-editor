import { describe, it, expect } from 'vitest';
import { detectGaps, hasGaps } from './gapDetection';
import { GPSPoint } from '../models/GPSPoint';
import { GPSTrack } from '../models/GPSTrack';

/**
 * Create a track where deltas[i] is the time in seconds from point i to point i+1.
 * Resulting track has deltas.length + 1 points.
 */
function makeTrack(deltas: number[]): GPSTrack {
  const base = new Date('2024-01-01T10:00:00Z');
  let elapsed = 0;
  const points = [new GPSPoint(40.0, -105.0, 1000, new Date(base), 0)];
  deltas.forEach((dt, i) => {
    elapsed += dt;
    points.push(
      new GPSPoint(40.0 + (i + 1) * 0.001, -105.0, 1000, new Date(base.getTime() + elapsed * 1000), 0)
    );
  });
  return new GPSTrack(points);
}

describe('detectGaps', () => {
  it('returns empty for tracks with fewer than 2 points', () => {
    const track = new GPSTrack([
      new GPSPoint(40.0, -105.0, 1000, new Date(), 0),
    ]);
    expect(detectGaps(track)).toEqual([]);
  });

  it('returns no gaps for a continuous track', () => {
    // All deltas are 10 seconds — well below 60s default threshold
    const track = makeTrack([10, 10, 10, 10]);
    expect(detectGaps(track)).toEqual([]);
  });

  it('detects a single gap exceeding the default threshold', () => {
    // Deltas: 10, 120, 10, 10 → gap between points 1 and 2
    const track = makeTrack([10, 120, 10, 10]);
    const gaps = detectGaps(track);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].startIndex).toBe(1);
    expect(gaps[0].endIndex).toBe(2);
    expect(gaps[0].timeDelta).toBe(120);
  });

  it('detects multiple gaps', () => {
    // Deltas: 10, 90, 10, 10, 180, 10
    // Gap 1: between points 1–2 (90s), Gap 2: between points 4–5 (180s)
    const track = makeTrack([10, 90, 10, 10, 180, 10]);
    const gaps = detectGaps(track);
    expect(gaps).toHaveLength(2);
    expect(gaps[0].startIndex).toBe(1);
    expect(gaps[1].startIndex).toBe(4);
  });

  it('includes distance in the gap object', () => {
    const base = new Date('2024-01-01T10:00:00Z');
    const points = [
      new GPSPoint(40.0, -105.0, 1000, new Date(base.getTime()), 0),
      new GPSPoint(40.001, -105.0, 1000, new Date(base.getTime() + 120000), 0),
    ];
    const track = new GPSTrack(points);
    const gaps = detectGaps(track);
    expect(gaps[0].distance).toBeGreaterThan(0);
  });

  it('respects custom time threshold', () => {
    // 30-second gap — below default 60s but above custom 20s
    const track = makeTrack([10, 30, 10]);
    expect(detectGaps(track, { minTimeDelta: 60 })).toHaveLength(0);
    expect(detectGaps(track, { minTimeDelta: 20 })).toHaveLength(1);
  });

  it('gap exactly at threshold is included', () => {
    const track = makeTrack([10, 60, 10]);
    const gaps = detectGaps(track, { minTimeDelta: 60 });
    expect(gaps).toHaveLength(1);
  });
});

describe('hasGaps', () => {
  it('returns false when no gaps', () => {
    const track = makeTrack([10, 10, 10]);
    expect(hasGaps(track)).toBe(false);
  });

  it('returns true when a gap exists', () => {
    const track = makeTrack([10, 120, 10]);
    expect(hasGaps(track)).toBe(true);
  });
});
