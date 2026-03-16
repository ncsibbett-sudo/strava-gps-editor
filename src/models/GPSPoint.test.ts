import { describe, it, expect } from 'vitest';
import { GPSPoint, haversineDistance } from './GPSPoint';

describe('GPSPoint', () => {
  describe('constructor', () => {
    it('should create a GPS point with all properties', () => {
      const point = new GPSPoint(40.7128, -74.006, 10, new Date('2024-01-01T12:00:00Z'), 100);

      expect(point.lat).toBe(40.7128);
      expect(point.lng).toBe(-74.006);
      expect(point.elevation).toBe(10);
      expect(point.time).toEqual(new Date('2024-01-01T12:00:00Z'));
      expect(point.distance).toBe(100);
    });

    it('should default distance to 0 if not provided', () => {
      const point = new GPSPoint(40.7128, -74.006, 10, new Date());

      expect(point.distance).toBe(0);
    });
  });

  describe('distanceTo', () => {
    it('should calculate distance between two points correctly', () => {
      // New York to Los Angeles (approximately 3936 km)
      const nyc = new GPSPoint(40.7128, -74.006, 10, new Date());
      const la = new GPSPoint(34.0522, -118.2437, 71, new Date());

      const distance = nyc.distanceTo(la);

      // Should be approximately 3,936,000 meters (3,936 km)
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });

    it('should return 0 for the same point', () => {
      const point = new GPSPoint(40.7128, -74.006, 10, new Date());

      const distance = point.distanceTo(point);

      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      // Two points ~111 meters apart (0.001 degrees latitude ≈ 111 meters)
      const point1 = new GPSPoint(40.0, -74.0, 10, new Date());
      const point2 = new GPSPoint(40.001, -74.0, 10, new Date());

      const distance = point1.distanceTo(point2);

      // Should be approximately 111 meters
      expect(distance).toBeGreaterThan(110);
      expect(distance).toBeLessThan(112);
    });
  });

  describe('speedTo', () => {
    it('should calculate speed correctly', () => {
      const time1 = new Date('2024-01-01T12:00:00Z');
      const time2 = new Date('2024-01-01T12:00:10Z'); // 10 seconds later

      // Two points ~111 meters apart, 10 seconds apart
      const point1 = new GPSPoint(40.0, -74.0, 10, time1);
      const point2 = new GPSPoint(40.001, -74.0, 10, time2);

      const speed = point2.speedTo(point1);

      // Should be approximately 11.1 m/s
      expect(speed).toBeGreaterThan(11);
      expect(speed).toBeLessThan(11.2);
    });

    it('should return 0 if time delta is 0', () => {
      const time = new Date('2024-01-01T12:00:00Z');
      const point1 = new GPSPoint(40.0, -74.0, 10, time);
      const point2 = new GPSPoint(40.001, -74.0, 10, time);

      const speed = point2.speedTo(point1);

      expect(speed).toBe(0);
    });

    it('should return 0 if time delta is negative', () => {
      const time1 = new Date('2024-01-01T12:00:10Z');
      const time2 = new Date('2024-01-01T12:00:00Z'); // Earlier time

      const point1 = new GPSPoint(40.0, -74.0, 10, time1);
      const point2 = new GPSPoint(40.001, -74.0, 10, time2);

      const speed = point2.speedTo(point1);

      expect(speed).toBe(0);
    });
  });

  describe('gradeTo', () => {
    it('should calculate positive grade correctly', () => {
      // 10m elevation gain over ~111m horizontal distance = ~9% grade
      const point1 = new GPSPoint(40.0, -74.0, 0, new Date());
      const point2 = new GPSPoint(40.001, -74.0, 10, new Date());

      const grade = point2.gradeTo(point1);

      // Should be approximately 9%
      expect(grade).toBeGreaterThan(8.9);
      expect(grade).toBeLessThan(9.1);
    });

    it('should calculate negative grade correctly', () => {
      // 10m elevation loss over ~111m horizontal distance = ~-9% grade
      const point1 = new GPSPoint(40.0, -74.0, 10, new Date());
      const point2 = new GPSPoint(40.001, -74.0, 0, new Date());

      const grade = point2.gradeTo(point1);

      // Should be approximately -9%
      expect(grade).toBeLessThan(-8.9);
      expect(grade).toBeGreaterThan(-9.1);
    });

    it('should return 0 for flat terrain', () => {
      const point1 = new GPSPoint(40.0, -74.0, 10, new Date());
      const point2 = new GPSPoint(40.001, -74.0, 10, new Date());

      const grade = point2.gradeTo(point1);

      expect(grade).toBeCloseTo(0, 1);
    });

    it('should return 0 if distance is 0', () => {
      const point1 = new GPSPoint(40.0, -74.0, 0, new Date());
      const point2 = new GPSPoint(40.0, -74.0, 10, new Date());

      const grade = point2.gradeTo(point1);

      expect(grade).toBe(0);
    });
  });
});

describe('haversineDistance', () => {
  it('should calculate distance between known points', () => {
    // New York to Los Angeles
    const distance = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);

    // Should be approximately 3,936,000 meters
    expect(distance).toBeGreaterThan(3900000);
    expect(distance).toBeLessThan(4000000);
  });

  it('should return 0 for identical coordinates', () => {
    const distance = haversineDistance(40.7128, -74.006, 40.7128, -74.006);

    expect(distance).toBe(0);
  });

  it('should be symmetric', () => {
    const distance1 = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    const distance2 = haversineDistance(34.0522, -118.2437, 40.7128, -74.006);

    expect(distance1).toBeCloseTo(distance2, 0);
  });

  it('should handle equator crossing', () => {
    const distance = haversineDistance(10, 0, -10, 0);

    // Should be approximately 2,222,000 meters (20 degrees latitude)
    expect(distance).toBeGreaterThan(2200000);
    expect(distance).toBeLessThan(2250000);
  });

  it('should handle prime meridian crossing', () => {
    const distance = haversineDistance(0, -10, 0, 10);

    // Should be approximately 2,222,000 meters (20 degrees longitude at equator)
    expect(distance).toBeGreaterThan(2200000);
    expect(distance).toBeLessThan(2250000);
  });
});
