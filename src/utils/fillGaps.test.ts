import { describe, it, expect } from 'vitest';
import { fillGapsInTrack } from './fillGaps';
import { GPSPoint } from '../models/GPSPoint';
import { GPSTrack, type Gap } from '../models/GPSTrack';

function makeTrack(count: number, intervalSeconds = 60): GPSTrack {
  const base = new Date('2024-06-01T08:00:00Z');
  const points = Array.from({ length: count }, (_, i) =>
    new GPSPoint(
      40.0 + i * 0.001,
      -105.0,
      100 + i * 2,
      new Date(base.getTime() + i * intervalSeconds * 1000),
      i * 100
    )
  );
  return new GPSTrack(points, { name: 'Test', type: 'Run' });
}

describe('fillGapsInTrack', () => {
  it('returns a clone when no gaps provided', () => {
    const track = makeTrack(5);
    const result = fillGapsInTrack(track, []);
    expect(result.points).toHaveLength(5);
    expect(result).not.toBe(track); // is a clone
  });

  it('inserts interpolated points between gap endpoints', () => {
    const track = makeTrack(4);
    // Gap between index 1 and index 2, with a 60-second time delta
    const gaps: Gap[] = [{ startIndex: 1, endIndex: 2, timeDelta: 60, distance: 100 }];
    const result = fillGapsInTrack(track, gaps);
    // Should have original 4 points + at least some interpolated points
    expect(result.points.length).toBeGreaterThan(4);
  });

  it('interpolated points lie between start and end lat/lng', () => {
    const track = makeTrack(3, 600); // 10-minute intervals → larger gap
    const gaps: Gap[] = [{ startIndex: 0, endIndex: 1, timeDelta: 600, distance: 200 }];
    const result = fillGapsInTrack(track, gaps);

    const startLat = track.points[0].lat;
    const endLat = track.points[1].lat;

    // All interpolated points should have lat between start and end
    for (let i = 1; i < result.points.length - 2; i++) {
      expect(result.points[i].lat).toBeGreaterThanOrEqual(Math.min(startLat, endLat));
      expect(result.points[i].lat).toBeLessThanOrEqual(Math.max(startLat, endLat));
    }
  });

  it('interpolated timestamps are ordered between gap boundaries', () => {
    const track = makeTrack(4, 600); // 10-minute intervals
    const gaps: Gap[] = [{ startIndex: 1, endIndex: 2, timeDelta: 600, distance: 200 }];
    const result = fillGapsInTrack(track, gaps);

    const gapStartTime = track.points[1].time.getTime();
    const gapEndTime = track.points[2].time.getTime();

    // Points inserted between index 1 and the old index 2
    for (let i = 2; i < result.points.length - 1; i++) {
      const t = result.points[i].time.getTime();
      if (t > gapStartTime && t < gapEndTime) {
        expect(t).toBeGreaterThan(gapStartTime);
        expect(t).toBeLessThan(gapEndTime);
      }
    }
  });

  it('handles multiple gaps with correct offset tracking', () => {
    const track = makeTrack(6, 600);
    const gaps: Gap[] = [
      { startIndex: 0, endIndex: 1, timeDelta: 600, distance: 200 },
      { startIndex: 3, endIndex: 4, timeDelta: 600, distance: 200 },
    ];
    const result = fillGapsInTrack(track, gaps);
    // Both gaps should have been filled — result should have more than original 6 points
    expect(result.points.length).toBeGreaterThan(6);
  });

  it('skips a gap if startIndex is out of bounds', () => {
    const track = makeTrack(3);
    const gaps: Gap[] = [{ startIndex: 10, endIndex: 11, timeDelta: 60, distance: 100 }];
    const result = fillGapsInTrack(track, gaps);
    expect(result.points).toHaveLength(3); // unchanged
  });

  it('uses at least 2 interpolated segments for small time deltas', () => {
    const track = makeTrack(3, 5); // 5-second intervals → timeDelta = 5
    const gaps: Gap[] = [{ startIndex: 0, endIndex: 1, timeDelta: 5, distance: 10 }];
    const result = fillGapsInTrack(track, gaps);
    // With numPoints = max(2, floor(5/5)) = 2, one interpolated point is inserted
    expect(result.points.length).toBeGreaterThan(3);
  });

  it('interpolates elevation linearly', () => {
    const base = new Date('2024-06-01T08:00:00Z');
    const points = [
      new GPSPoint(40.0, -105.0, 100, new Date(base.getTime()), 0),
      new GPSPoint(40.001, -105.0, 200, new Date(base.getTime() + 600_000), 100),
      new GPSPoint(40.002, -105.0, 200, new Date(base.getTime() + 660_000), 200),
    ];
    const track = new GPSTrack(points, { name: 'Test', type: 'Run' });
    const gaps: Gap[] = [{ startIndex: 0, endIndex: 1, timeDelta: 600, distance: 100 }];
    const result = fillGapsInTrack(track, gaps);

    // The midpoint interpolated between elevation 100 and 200 should be ~150
    const firstInterpolated = result.points[1];
    expect(firstInterpolated.elevation).toBeGreaterThan(100);
    expect(firstInterpolated.elevation).toBeLessThan(200);
  });
});
