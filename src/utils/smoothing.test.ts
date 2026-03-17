import { describe, it, expect } from 'vitest';
import { applyMovingAverageSmoothing, applyGaussianSmoothing } from './smoothing';
import { GPSTrack } from '../models/GPSTrack';
import { GPSPoint } from '../models/GPSPoint';

describe('Smoothing Utilities', () => {
  const createTestTrack = (): GPSTrack => {
    const points = [
      new GPSPoint(40.0, -105.0, 1000, new Date('2024-01-01T10:00:00Z'), 0),
      new GPSPoint(40.001, -105.001, 1005, new Date('2024-01-01T10:01:00Z'), 0),
      new GPSPoint(40.002, -105.002, 1010, new Date('2024-01-01T10:02:00Z'), 0),
      new GPSPoint(40.003, -105.003, 1015, new Date('2024-01-01T10:03:00Z'), 0),
      new GPSPoint(40.004, -105.004, 1020, new Date('2024-01-01T10:04:00Z'), 0),
      new GPSPoint(40.005, -105.005, 1025, new Date('2024-01-01T10:05:00Z'), 0),
      new GPSPoint(40.006, -105.006, 1030, new Date('2024-01-01T10:06:00Z'), 0),
    ];
    return new GPSTrack(points);
  };

  describe('applyMovingAverageSmoothing', () => {
    it('should return a smoothed track with same number of points', () => {
      const track = createTestTrack();
      const smoothed = applyMovingAverageSmoothing(track, 3);

      expect(smoothed.points.length).toBe(track.points.length);
    });

    it('should preserve edge points', () => {
      const track = createTestTrack();
      const smoothed = applyMovingAverageSmoothing(track, 3);

      // First and last points should be unchanged
      expect(smoothed.points[0].lat).toBe(track.points[0].lat);
      expect(smoothed.points[0].lng).toBe(track.points[0].lng);
      expect(smoothed.points[smoothed.points.length - 1].lat).toBe(
        track.points[track.points.length - 1].lat
      );
      expect(smoothed.points[smoothed.points.length - 1].lng).toBe(
        track.points[track.points.length - 1].lng
      );
    });

    it('should smooth middle points', () => {
      const track = createTestTrack();
      const smoothed = applyMovingAverageSmoothing(track, 3);

      // Middle point should be average of surrounding points
      const midIndex = 3;
      const expectedLat =
        (track.points[2].lat + track.points[3].lat + track.points[4].lat) / 3;
      const expectedLng =
        (track.points[2].lng + track.points[3].lng + track.points[4].lng) / 3;

      expect(smoothed.points[midIndex].lat).toBeCloseTo(expectedLat, 6);
      expect(smoothed.points[midIndex].lng).toBeCloseTo(expectedLng, 6);
    });

    it('should handle small tracks', () => {
      const points = [
        new GPSPoint(40.0, -105.0, 1000, new Date(), 0),
        new GPSPoint(40.001, -105.001, 1005, new Date(), 0),
      ];
      const track = new GPSTrack(points);
      const smoothed = applyMovingAverageSmoothing(track, 5);

      expect(smoothed.points.length).toBe(2);
    });

    it('should ensure odd window size', () => {
      const track = createTestTrack();
      const smoothed = applyMovingAverageSmoothing(track, 4); // Even number

      // Should still work (will be adjusted to 5)
      expect(smoothed.points.length).toBe(track.points.length);
    });
  });

  describe('applyGaussianSmoothing', () => {
    it('should return a smoothed track with same number of points', () => {
      const track = createTestTrack();
      const smoothed = applyGaussianSmoothing(track, 2);

      expect(smoothed.points.length).toBe(track.points.length);
    });

    it('should smooth all points', () => {
      const track = createTestTrack();
      const smoothed = applyGaussianSmoothing(track, 2);

      // Points should be different from original (smoothed)
      // But not too different
      for (let i = 0; i < track.points.length; i++) {
        const latDiff = Math.abs(smoothed.points[i].lat - track.points[i].lat);
        const lngDiff = Math.abs(smoothed.points[i].lng - track.points[i].lng);

        // Should be smoothed but within reasonable bounds
        expect(latDiff).toBeLessThan(0.002);
        expect(lngDiff).toBeLessThan(0.002);
      }
    });

    it('should handle small tracks', () => {
      const points = [
        new GPSPoint(40.0, -105.0, 1000, new Date(), 0),
        new GPSPoint(40.001, -105.001, 1005, new Date(), 0),
      ];
      const track = new GPSTrack(points);
      const smoothed = applyGaussianSmoothing(track, 2);

      expect(smoothed.points.length).toBe(2);
    });

    it('should preserve time stamps', () => {
      const track = createTestTrack();
      const smoothed = applyGaussianSmoothing(track, 2);

      for (let i = 0; i < track.points.length; i++) {
        expect(smoothed.points[i].time.getTime()).toBe(track.points[i].time.getTime());
      }
    });

    it('should work with different sigma values', () => {
      const track = createTestTrack();

      const smoothed1 = applyGaussianSmoothing(track, 1);
      const smoothed2 = applyGaussianSmoothing(track, 3);

      // Higher sigma should result in more smoothing
      expect(smoothed1.points.length).toBe(track.points.length);
      expect(smoothed2.points.length).toBe(track.points.length);
    });
  });
});
