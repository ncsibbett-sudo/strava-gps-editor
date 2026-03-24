import { describe, it, expect } from 'vitest';
import { applyOperation } from './EditOperation';
import type {
  TrimOperation,
  SmoothOperation,
  SpikeRemovalOperation,
  RedrawOperation,
  FillGapOperation,
} from './EditOperation';
import { GPSPoint } from './GPSPoint';
import { GPSTrack } from './GPSTrack';

function makeTrack(count: number): GPSTrack {
  const base = new Date('2024-01-01T10:00:00Z');
  const points = Array.from({ length: count }, (_, i) =>
    new GPSPoint(40.0 + i * 0.0008, -105.0, 1000, new Date(base.getTime() + i * 60000), 0)
  );
  return new GPSTrack(points);
}

describe('applyOperation', () => {
  const track = makeTrack(10);

  it('TrimOperation slices the track', () => {
    const op: TrimOperation = { type: 'trim', startIndex: 2, endIndex: 7 };
    const result = applyOperation(track, op);
    expect(result.points.length).toBe(6);
    expect(result.points[0].lat).toBeCloseTo(track.points[2].lat, 6);
  });

  it('SmoothOperation (moving-average) returns same-length track', () => {
    const op: SmoothOperation = {
      type: 'smooth',
      algorithm: 'moving-average',
      intensity: 50,
      windowSize: 3,
    };
    const result = applyOperation(track, op);
    expect(result.points.length).toBe(track.points.length);
  });

  it('SmoothOperation (gaussian) returns same-length track', () => {
    const op: SmoothOperation = {
      type: 'smooth',
      algorithm: 'gaussian',
      intensity: 50,
      windowSize: 2,
    };
    const result = applyOperation(track, op);
    expect(result.points.length).toBe(track.points.length);
  });

  it('SpikeRemovalOperation (remove-all) removes flagged indices', () => {
    const op: SpikeRemovalOperation = {
      type: 'spike-removal',
      speedThreshold: 22,
      distanceThreshold: 100,
      spikesDetected: [2, 5],
      action: 'remove-all',
    };
    const result = applyOperation(track, op);
    expect(result.points.length).toBe(8);
  });

  it('SpikeRemovalOperation (remove-selected) only removes selectedIndices', () => {
    const op: SpikeRemovalOperation = {
      type: 'spike-removal',
      speedThreshold: 22,
      distanceThreshold: 100,
      spikesDetected: [2, 5, 7],
      action: 'remove-selected',
      selectedIndices: [5],
    };
    const result = applyOperation(track, op);
    expect(result.points.length).toBe(9);
  });

  it('RedrawOperation replaces section with new points', () => {
    const newPoints = [
      new GPSPoint(40.1, -105.1, 1000, new Date(), 0),
      new GPSPoint(40.2, -105.2, 1000, new Date(), 0),
    ];
    const op: RedrawOperation = {
      type: 'redraw',
      startIndex: 3,
      endIndex: 6,
      mode: 'freehand',
      newPoints,
    };
    const result = applyOperation(track, op);
    // Original 10 points minus 4 replaced (3-6) plus 2 new = 8
    expect(result.points.length).toBe(8);
    expect(result.points[3].lat).toBeCloseTo(40.1, 6);
  });

  it('FillGapOperation replaces gap indices with filled points', () => {
    const filledPoints = [
      new GPSPoint(40.05, -105.0, 1000, new Date(), 0),
    ];
    const op: FillGapOperation = {
      type: 'fill-gap',
      gapStart: 4,
      gapEnd: 5,
      filledPoints,
    };
    const result = applyOperation(track, op);
    // 10 - 2 replaced + 1 filled = 9
    expect(result.points.length).toBe(9);
  });

  it('preserves timestamps through smooth operation', () => {
    const op: SmoothOperation = {
      type: 'smooth',
      algorithm: 'moving-average',
      intensity: 50,
      windowSize: 3,
    };
    const result = applyOperation(track, op);
    for (let i = 0; i < track.points.length; i++) {
      expect(result.points[i].time.getTime()).toBe(track.points[i].time.getTime());
    }
  });
});
