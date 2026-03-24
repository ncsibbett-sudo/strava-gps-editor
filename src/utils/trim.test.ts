import { describe, it, expect } from 'vitest';
import { trimTrack } from './trim';
import { GPSPoint } from '../models/GPSPoint';
import { GPSTrack } from '../models/GPSTrack';

function makeTrack(count: number): GPSTrack {
  const base = new Date('2024-01-01T10:00:00Z');
  const points = Array.from({ length: count }, (_, i) =>
    new GPSPoint(
      40.0 + i * 0.001,
      -105.0,
      1000 + i * 10,
      new Date(base.getTime() + i * 60000),
      0
    )
  );
  return new GPSTrack(points);
}

describe('trimTrack', () => {
  it('returns correct number of points after trim', () => {
    const track = makeTrack(10);
    const trimmed = trimTrack(track, 2, 7);
    expect(trimmed.points.length).toBe(6); // indices 2–7 inclusive
  });

  it('preserves first point of range as new start', () => {
    const track = makeTrack(10);
    const trimmed = trimTrack(track, 3, 8);
    expect(trimmed.points[0].lat).toBeCloseTo(track.points[3].lat, 6);
    expect(trimmed.points[0].lng).toBeCloseTo(track.points[3].lng, 6);
  });

  it('preserves last point of range as new end', () => {
    const track = makeTrack(10);
    const trimmed = trimTrack(track, 1, 6);
    const last = trimmed.points[trimmed.points.length - 1];
    expect(last.lat).toBeCloseTo(track.points[6].lat, 6);
  });

  it('recalculates cumulative distance after trim', () => {
    const track = makeTrack(10);
    const trimmed = trimTrack(track, 2, 7);
    // First point should always have distance 0
    expect(trimmed.points[0].distance).toBe(0);
    // Total distance should be positive
    expect(trimmed.totalDistance).toBeGreaterThan(0);
    // Total distance should be less than original
    expect(trimmed.totalDistance).toBeLessThan(track.totalDistance);
  });

  it('preserves track metadata', () => {
    const track = makeTrack(10);
    const trimmed = trimTrack(track, 0, 9);
    expect(trimmed.metadata.name).toBe(track.metadata.name);
    expect(trimmed.metadata.type).toBe(track.metadata.type);
  });

  it('accepts full range without modification', () => {
    const track = makeTrack(5);
    const trimmed = trimTrack(track, 0, 4);
    expect(trimmed.points.length).toBe(5);
  });

  it('accepts single point range', () => {
    const track = makeTrack(5);
    const trimmed = trimTrack(track, 2, 2);
    expect(trimmed.points.length).toBe(1);
  });

  it('throws RangeError for invalid start index', () => {
    const track = makeTrack(5);
    expect(() => trimTrack(track, -1, 3)).toThrow(RangeError);
  });

  it('throws RangeError for invalid end index', () => {
    const track = makeTrack(5);
    expect(() => trimTrack(track, 0, 10)).toThrow(RangeError);
  });

  it('throws RangeError when start > end', () => {
    const track = makeTrack(5);
    expect(() => trimTrack(track, 3, 1)).toThrow(RangeError);
  });
});
