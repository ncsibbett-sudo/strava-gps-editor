import { describe, it, expect } from 'vitest';
import {
  interpolateElevation,
  interpolateTimestamps,
  calculateAverageSpacing,
  convertToGPSPoints,
} from './interpolation';
import { GPSTrack } from '../models/GPSTrack';
import { GPSPoint } from '../models/GPSPoint';

describe('Interpolation Utilities', () => {
  const createTestTrack = (): GPSTrack => {
    const points = [
      new GPSPoint(40.0, -105.0, 1000, new Date('2024-01-01T10:00:00Z'), 0),
      new GPSPoint(40.001, -105.001, 1100, new Date('2024-01-01T10:01:00Z'), 100),
      new GPSPoint(40.002, -105.002, 1200, new Date('2024-01-01T10:02:00Z'), 200),
      new GPSPoint(40.003, -105.003, 1300, new Date('2024-01-01T10:03:00Z'), 300),
      new GPSPoint(40.004, -105.004, 1400, new Date('2024-01-01T10:04:00Z'), 400),
    ];
    return new GPSTrack(points);
  };

  describe('interpolateElevation', () => {
    it('should interpolate elevation using inverse distance weighting', () => {
      const track = createTestTrack();
      const point = { lat: 40.0015, lng: -105.0015 };

      const elevation = interpolateElevation(point, track, 2);

      // Should be between 1100 and 1200 (nearest points)
      expect(elevation).toBeGreaterThan(1100);
      expect(elevation).toBeLessThan(1200);
    });

    it('should return exact elevation when point matches original track point', () => {
      const track = createTestTrack();
      const point = { lat: 40.002, lng: -105.002 };

      const elevation = interpolateElevation(point, track, 2);

      expect(elevation).toBeCloseTo(1200, 0);
    });

    it('should handle edge points correctly', () => {
      const track = createTestTrack();
      const point = { lat: 40.0, lng: -105.0 };

      const elevation = interpolateElevation(point, track, 2);

      expect(elevation).toBeCloseTo(1000, 0);
    });

    it('should return 0 for empty track', () => {
      const track = new GPSTrack([]);
      const point = { lat: 40.0, lng: -105.0 };

      const elevation = interpolateElevation(point, track, 2);

      expect(elevation).toBe(0);
    });

    it('should respect maxNeighbors parameter', () => {
      const track = createTestTrack();
      const point = { lat: 40.0015, lng: -105.0015 };

      const elevation2 = interpolateElevation(point, track, 2);
      const elevation3 = interpolateElevation(point, track, 3);

      // Different number of neighbors should give different results
      expect(elevation2).not.toBe(elevation3);
    });

    it('should handle points far from track', () => {
      const track = createTestTrack();
      const point = { lat: 50.0, lng: -100.0 }; // Far away

      const elevation = interpolateElevation(point, track, 2);

      // Should still return a weighted value
      expect(elevation).toBeGreaterThan(0);
    });
  });

  describe('interpolateTimestamps', () => {
    it('should distribute timestamps proportionally to distance', () => {
      const startPoint = new GPSPoint(
        40.0,
        -105.0,
        1000,
        new Date('2024-01-01T10:00:00Z'),
        0
      );
      const endPoint = new GPSPoint(
        40.002,
        -105.002,
        1200,
        new Date('2024-01-01T10:10:00Z'),
        200
      );

      const routedPoints = [
        { lat: 40.0, lng: -105.0 },
        { lat: 40.001, lng: -105.001 },
        { lat: 40.002, lng: -105.002 },
      ];

      const timestamps = interpolateTimestamps(routedPoints, startPoint, endPoint);

      expect(timestamps.length).toBe(3);
      expect(timestamps[0].getTime()).toBe(startPoint.time.getTime());
      expect(timestamps[timestamps.length - 1].getTime()).toBeLessThanOrEqual(
        endPoint.time.getTime()
      );

      // Timestamps should be in order
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i].getTime()).toBeGreaterThanOrEqual(timestamps[i - 1].getTime());
      }
    });

    it('should handle empty points array', () => {
      const startPoint = new GPSPoint(40.0, -105.0, 1000, new Date(), 0);
      const endPoint = new GPSPoint(40.002, -105.002, 1200, new Date(), 200);

      const timestamps = interpolateTimestamps([], startPoint, endPoint);

      expect(timestamps).toEqual([]);
    });

    it('should handle single point', () => {
      const startPoint = new GPSPoint(
        40.0,
        -105.0,
        1000,
        new Date('2024-01-01T10:00:00Z'),
        0
      );
      const endPoint = new GPSPoint(
        40.002,
        -105.002,
        1200,
        new Date('2024-01-01T10:10:00Z'),
        200
      );

      const routedPoints = [{ lat: 40.0, lng: -105.0 }];

      const timestamps = interpolateTimestamps(routedPoints, startPoint, endPoint);

      expect(timestamps.length).toBe(1);
      expect(timestamps[0].getTime()).toBe(startPoint.time.getTime());
    });

    it('should handle zero distance gracefully', () => {
      const startPoint = new GPSPoint(40.0, -105.0, 1000, new Date(), 0);
      const endPoint = new GPSPoint(40.0, -105.0, 1000, new Date(), 0);

      const routedPoints = [
        { lat: 40.0, lng: -105.0 },
        { lat: 40.0, lng: -105.0 },
      ];

      const timestamps = interpolateTimestamps(routedPoints, startPoint, endPoint);

      expect(timestamps.length).toBe(2);
      // Should not crash with division by zero
    });
  });

  describe('calculateAverageSpacing', () => {
    it('should calculate average point spacing', () => {
      const track = createTestTrack();
      const spacing = calculateAverageSpacing(track);

      // Total distance is 400m, 5 points = 80m average, but clamped to 5-20m range
      expect(spacing).toBeGreaterThanOrEqual(5);
      expect(spacing).toBeLessThanOrEqual(20);
    });

    it('should return default for tracks with < 2 points', () => {
      const points = [new GPSPoint(40.0, -105.0, 1000, new Date(), 0)];
      const track = new GPSTrack(points);

      const spacing = calculateAverageSpacing(track);

      expect(spacing).toBe(10);
    });

    it('should clamp to minimum 5m', () => {
      // Create track with very dense points
      const points = [];
      for (let i = 0; i < 1000; i++) {
        points.push(
          new GPSPoint(40.0 + i * 0.00001, -105.0 + i * 0.00001, 1000, new Date(), i * 1)
        );
      }
      const track = new GPSTrack(points);

      const spacing = calculateAverageSpacing(track);

      expect(spacing).toBeGreaterThanOrEqual(5);
    });

    it('should clamp to maximum 20m', () => {
      // Create track with very sparse points
      const points = [
        new GPSPoint(40.0, -105.0, 1000, new Date(), 0),
        new GPSPoint(40.1, -105.1, 1000, new Date(), 10000),
      ];
      const track = new GPSTrack(points);

      const spacing = calculateAverageSpacing(track);

      expect(spacing).toBeLessThanOrEqual(20);
    });
  });

  describe('convertToGPSPoints', () => {
    it('should convert routed points to GPS points with interpolated data', () => {
      const originalTrack = createTestTrack();
      const startPoint = originalTrack.points[0];
      const endPoint = originalTrack.points[2];

      const routedPoints = [
        { lat: 40.0, lng: -105.0 },
        { lat: 40.001, lng: -105.001 },
        { lat: 40.002, lng: -105.002 },
      ];

      const gpsPoints = convertToGPSPoints(
        routedPoints,
        startPoint,
        endPoint,
        originalTrack
      );

      expect(gpsPoints.length).toBe(3);

      // First point should have start time
      expect(gpsPoints[0].time.getTime()).toBe(startPoint.time.getTime());

      // All points should have elevation
      gpsPoints.forEach((point) => {
        expect(point.elevation).toBeGreaterThan(0);
      });

      // Distance should be cumulative
      for (let i = 1; i < gpsPoints.length; i++) {
        expect(gpsPoints[i].distance).toBeGreaterThanOrEqual(gpsPoints[i - 1].distance);
      }
    });

    it('should handle empty routed points', () => {
      const originalTrack = createTestTrack();
      const startPoint = originalTrack.points[0];
      const endPoint = originalTrack.points[2];

      const gpsPoints = convertToGPSPoints([], startPoint, endPoint, originalTrack);

      expect(gpsPoints).toEqual([]);
    });

    it('should maintain cumulative distance from start point', () => {
      const originalTrack = createTestTrack();
      const startPoint = originalTrack.points[1]; // Start at second point (distance = 100)
      const endPoint = originalTrack.points[3];

      const routedPoints = [
        { lat: 40.001, lng: -105.001 },
        { lat: 40.002, lng: -105.002 },
      ];

      const gpsPoints = convertToGPSPoints(
        routedPoints,
        startPoint,
        endPoint,
        originalTrack
      );

      // First point should have same distance as start point
      expect(gpsPoints[0].distance).toBe(startPoint.distance);
      // Second point should have greater distance
      expect(gpsPoints[1].distance).toBeGreaterThan(startPoint.distance);
    });

    it('should interpolate elevation from original track', () => {
      const originalTrack = createTestTrack();
      const startPoint = originalTrack.points[0];
      const endPoint = originalTrack.points[4];

      const routedPoints = [
        { lat: 40.0, lng: -105.0 },
        { lat: 40.002, lng: -105.002 }, // Should get elevation ~1200
        { lat: 40.004, lng: -105.004 },
      ];

      const gpsPoints = convertToGPSPoints(
        routedPoints,
        startPoint,
        endPoint,
        originalTrack
      );

      // Middle point should have interpolated elevation near 1200
      expect(gpsPoints[1].elevation).toBeGreaterThan(1100);
      expect(gpsPoints[1].elevation).toBeLessThan(1300);
    });

    it('should create valid GPSPoint objects', () => {
      const originalTrack = createTestTrack();
      const startPoint = originalTrack.points[0];
      const endPoint = originalTrack.points[2];

      const routedPoints = [
        { lat: 40.0, lng: -105.0 },
        { lat: 40.001, lng: -105.001 },
      ];

      const gpsPoints = convertToGPSPoints(
        routedPoints,
        startPoint,
        endPoint,
        originalTrack
      );

      gpsPoints.forEach((point) => {
        expect(point).toBeInstanceOf(GPSPoint);
        expect(typeof point.lat).toBe('number');
        expect(typeof point.lng).toBe('number');
        expect(typeof point.elevation).toBe('number');
        expect(point.time).toBeInstanceOf(Date);
        expect(typeof point.distance).toBe('number');
      });
    });
  });
});
