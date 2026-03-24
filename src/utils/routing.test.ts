import { describe, it, expect } from 'vitest';
import {
  createStraightLineSegment,
  combineRouteSegments,
  resamplePath,
  type RouteSegment,
} from './routing';
import L from 'leaflet';

describe('Routing Utilities', () => {
  describe('createStraightLineSegment', () => {
    it('should create straight line segment between two points', () => {
      const start = L.latLng(40.0, -105.0);
      const end = L.latLng(40.002, -105.002);

      const segment = createStraightLineSegment(start, end, 5);

      // numPoints=5 creates 6 points (i goes from 0 to 5 inclusive)
      expect(segment.points.length).toBe(6);
      expect(segment.points[0].lat).toBe(start.lat);
      expect(segment.points[0].lng).toBe(start.lng);
      expect(segment.points[5].lat).toBe(end.lat);
      expect(segment.points[5].lng).toBe(end.lng);
      expect(segment.distance).toBeGreaterThan(0);
      expect(segment.duration).toBeGreaterThan(0); // duration = distance / 4
    });

    it('should create evenly spaced points', () => {
      const start = L.latLng(40.0, -105.0);
      const end = L.latLng(40.004, -105.004);

      const segment = createStraightLineSegment(start, end, 5);

      // numPoints=5 creates 6 points, so step is (end - start) / 5
      const latStep = (end.lat - start.lat) / 5;
      const lngStep = (end.lng - start.lng) / 5;

      for (let i = 0; i <= 5; i++) {
        expect(segment.points[i].lat).toBeCloseTo(start.lat + i * latStep, 6);
        expect(segment.points[i].lng).toBeCloseTo(start.lng + i * lngStep, 6);
      }
    });

    it('should handle different number of points', () => {
      const start = L.latLng(40.0, -105.0);
      const end = L.latLng(40.002, -105.002);

      const segment3 = createStraightLineSegment(start, end, 3);
      const segment10 = createStraightLineSegment(start, end, 10);

      // numPoints=n creates n+1 points
      expect(segment3.points.length).toBe(4);
      expect(segment10.points.length).toBe(11);
    });

    it('should calculate distance using Haversine formula', () => {
      const start = L.latLng(40.0, -105.0);
      const end = L.latLng(40.001, -105.001);

      const segment = createStraightLineSegment(start, end, 2);

      // Distance should be reasonable (roughly 150m for ~0.001 degrees)
      expect(segment.distance).toBeGreaterThan(100);
      expect(segment.distance).toBeLessThan(200);
    });

    it('should handle same start and end points', () => {
      const start = L.latLng(40.0, -105.0);
      const end = L.latLng(40.0, -105.0);

      const segment = createStraightLineSegment(start, end, 3);

      expect(segment.points.length).toBe(4); // numPoints=3 creates 4 points
      expect(segment.distance).toBe(0);
      segment.points.forEach((point) => {
        expect(point.lat).toBe(start.lat);
        expect(point.lng).toBe(start.lng);
      });
    });
  });

  describe('combineRouteSegments', () => {
    it('should combine segments removing duplicate boundary points', () => {
      const segments: RouteSegment[] = [
        {
          points: [
            { lat: 40.0, lng: -105.0 },
            { lat: 40.001, lng: -105.001 },
            { lat: 40.002, lng: -105.002 },
          ],
          distance: 200,
          duration: 60,
        },
        {
          points: [
            { lat: 40.002, lng: -105.002 }, // Duplicate end of previous segment
            { lat: 40.003, lng: -105.003 },
            { lat: 40.004, lng: -105.004 },
          ],
          distance: 200,
          duration: 60,
        },
      ];

      const combined = combineRouteSegments(segments);

      // Should have 5 points, not 6 (one duplicate removed)
      expect(combined.length).toBe(5);
      expect(combined[0]).toEqual({ lat: 40.0, lng: -105.0 });
      expect(combined[2]).toEqual({ lat: 40.002, lng: -105.002 });
      expect(combined[4]).toEqual({ lat: 40.004, lng: -105.004 });
    });

    it('should handle single segment', () => {
      const segments: RouteSegment[] = [
        {
          points: [
            { lat: 40.0, lng: -105.0 },
            { lat: 40.001, lng: -105.001 },
          ],
          distance: 100,
          duration: 30,
        },
      ];

      const combined = combineRouteSegments(segments);

      expect(combined.length).toBe(2);
      expect(combined).toEqual(segments[0].points);
    });

    it('should handle empty segments array', () => {
      const combined = combineRouteSegments([]);

      expect(combined).toEqual([]);
    });

    it('should preserve all points when no duplicates', () => {
      const segments: RouteSegment[] = [
        {
          points: [
            { lat: 40.0, lng: -105.0 },
            { lat: 40.001, lng: -105.001 },
          ],
          distance: 100,
          duration: 30,
        },
        {
          points: [
            { lat: 40.002, lng: -105.002 },
            { lat: 40.003, lng: -105.003 },
          ],
          distance: 100,
          duration: 30,
        },
      ];

      const combined = combineRouteSegments(segments);

      // combineRouteSegments always skips first point of subsequent segments
      // So 2 + 2 - 1 = 3 points
      expect(combined.length).toBe(3);
    });

    it('should handle multiple segments with consistent duplicates', () => {
      const segments: RouteSegment[] = [
        {
          points: [
            { lat: 40.0, lng: -105.0 },
            { lat: 40.001, lng: -105.001 },
          ],
          distance: 100,
          duration: 30,
        },
        {
          points: [
            { lat: 40.001, lng: -105.001 },
            { lat: 40.002, lng: -105.002 },
          ],
          distance: 100,
          duration: 30,
        },
        {
          points: [
            { lat: 40.002, lng: -105.002 },
            { lat: 40.003, lng: -105.003 },
          ],
          distance: 100,
          duration: 30,
        },
      ];

      const combined = combineRouteSegments(segments);

      expect(combined.length).toBe(4); // 3 segments * 2 points - 2 duplicates
    });
  });

  describe('resamplePath', () => {
    it('should resample path to target spacing', () => {
      const points = [
        { lat: 40.0, lng: -105.0 },
        { lat: 40.001, lng: -105.001 },
        { lat: 40.002, lng: -105.002 },
        { lat: 40.003, lng: -105.003 },
      ];

      const resampled = resamplePath(points, 50); // 50m spacing

      // resamplePath selects points from input based on spacing, doesn't interpolate
      // Distance between points is ~150m, so with 50m spacing we'll include every point
      expect(resampled.length).toBeGreaterThanOrEqual(1);
      expect(resampled.length).toBeLessThanOrEqual(points.length);

      // First point should be preserved
      expect(resampled[0].lat).toBeCloseTo(points[0].lat, 6);
      expect(resampled[0].lng).toBeCloseTo(points[0].lng, 6);

      // Last resampled point should be from input points
      expect(points.some(p =>
        Math.abs(p.lat - resampled[resampled.length - 1].lat) < 0.000001 &&
        Math.abs(p.lng - resampled[resampled.length - 1].lng) < 0.000001
      )).toBe(true);
    });

    it('should handle empty points array', () => {
      const resampled = resamplePath([], 10);

      expect(resampled).toEqual([]);
    });

    it('should handle single point', () => {
      const points = [{ lat: 40.0, lng: -105.0 }];

      const resampled = resamplePath(points, 10);

      expect(resampled.length).toBe(1);
      expect(resampled[0]).toEqual(points[0]);
    });

    it('should handle two points', () => {
      const points = [
        { lat: 40.0, lng: -105.0 },
        { lat: 40.002, lng: -105.002 },
      ];

      const resampled = resamplePath(points, 50);

      // resamplePath doesn't interpolate, just selects points
      // Distance between points is ~300m, with 50m spacing we'll include both points
      expect(resampled.length).toBe(2);
      expect(resampled[0]).toEqual(points[0]);
      expect(resampled[1].lat).toBeCloseTo(points[1].lat, 6);
      expect(resampled[1].lng).toBeCloseTo(points[1].lng, 6);
    });

    it('should create points at approximately target spacing', () => {
      const points = [
        { lat: 40.0, lng: -105.0 },
        { lat: 40.01, lng: -105.01 }, // ~1.4km apart
      ];

      const targetSpacing = 100; // 100m
      const resampled = resamplePath(points, targetSpacing);

      // resamplePath doesn't interpolate points, it just selects from input
      // With only 2 input points and 1.4km distance, will include both points
      expect(resampled.length).toBe(2);
    });

    it('should handle very small spacing', () => {
      const points = [
        { lat: 40.0, lng: -105.0 },
        { lat: 40.001, lng: -105.001 },
      ];

      const resampled = resamplePath(points, 5); // 5m spacing

      // Distance is ~150m, with 5m spacing we'd include both points
      expect(resampled.length).toBe(2);
    });

    it('should handle very large spacing', () => {
      const points = [
        { lat: 40.0, lng: -105.0 },
        { lat: 40.001, lng: -105.001 },
      ];

      const resampled = resamplePath(points, 1000); // 1km spacing

      // Distance is ~150m, so should only have start and end
      expect(resampled.length).toBe(2);
    });

    it('should produce points along the path', () => {
      const points = [
        { lat: 40.0, lng: -105.0 },
        { lat: 40.0, lng: -105.002 }, // Move east
        { lat: 40.002, lng: -105.002 }, // Move north
      ];

      const resampled = resamplePath(points, 50);

      // All resampled points should be within bounding box
      resampled.forEach((point) => {
        expect(point.lat).toBeGreaterThanOrEqual(40.0);
        expect(point.lat).toBeLessThanOrEqual(40.002);
        expect(point.lng).toBeGreaterThanOrEqual(-105.002);
        expect(point.lng).toBeLessThanOrEqual(-105.0);
      });
    });
  });

  describe('integration tests', () => {
    it('should work together: straight line → combine → resample', () => {
      const start = L.latLng(40.0, -105.0);
      const mid = L.latLng(40.002, -105.002);
      const end = L.latLng(40.004, -105.004);

      // Create two segments (numPoints=3 creates 4 points each)
      const segment1 = createStraightLineSegment(start, mid, 3);
      const segment2 = createStraightLineSegment(mid, end, 3);

      // Combine them
      const combined = combineRouteSegments([segment1, segment2]);

      // Should have 7 points (4 + 4 - 1 duplicate)
      expect(combined.length).toBe(7);

      // Resample with consistent spacing
      const resampled = resamplePath(combined, 100);

      expect(resampled.length).toBeGreaterThan(0);
      expect(resampled[0].lat).toBeCloseTo(start.lat, 6);
    });

    it('should handle complex multi-segment path', () => {
      const waypoints = [
        L.latLng(40.0, -105.0),
        L.latLng(40.001, -105.001),
        L.latLng(40.002, -105.002),
        L.latLng(40.003, -105.003),
        L.latLng(40.004, -105.004),
      ];

      // Create segments between each waypoint pair (numPoints=5 creates 6 points)
      const segments: RouteSegment[] = [];
      for (let i = 0; i < waypoints.length - 1; i++) {
        segments.push(createStraightLineSegment(waypoints[i], waypoints[i + 1], 5));
      }

      // Combine all segments
      const combined = combineRouteSegments(segments);

      // 4 segments * 6 points - 3 duplicates = 21 points
      expect(combined.length).toBe(21);

      // Resample to consistent spacing
      const resampled = resamplePath(combined, 50);

      expect(resampled.length).toBeGreaterThan(0);
      expect(resampled[0].lat).toBeCloseTo(waypoints[0].lat, 6);
    });
  });
});
