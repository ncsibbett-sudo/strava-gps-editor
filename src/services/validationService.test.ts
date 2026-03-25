import { describe, it, expect } from 'vitest';
import { validateTrack, getValidationSummary } from './validationService';
import { GPSTrack } from '../models/GPSTrack';
import { GPSPoint } from '../models/GPSPoint';

describe('validationService', () => {
  describe('validateTrack', () => {
    it('should pass validation for valid track', () => {
      const now = new Date();
      // Walking pace: ~100m in 60 seconds = 6 km/h (reasonable)
      const points = [
        new GPSPoint(45.0, -122.0, 100, now, 0),
        new GPSPoint(45.0009, -122.0, 105, new Date(now.getTime() + 60000), 100), // ~100m in 60s
        new GPSPoint(45.0018, -122.0, 110, new Date(now.getTime() + 120000), 200), // ~100m in 60s
      ];
      const track = new GPSTrack(points, { name: 'Test', type: 'Run' });

      const result = validateTrack(track);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect time travel (decreasing timestamps)', () => {
      const now = new Date();
      const points = [
        new GPSPoint(45.0, -122.0, 100, now, 0),
        new GPSPoint(45.001, -122.001, 105, new Date(now.getTime() - 10000), 100), // Time goes backwards!
        new GPSPoint(45.002, -122.002, 110, new Date(now.getTime() + 20000), 200),
      ];
      const track = new GPSTrack(points, { name: 'Test', type: 'Run' });

      const result = validateTrack(track);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('timestamp');
      expect(result.errors[0].message).toContain('Time travel');
    });

    it('should detect unrealistic speed for running', () => {
      const now = new Date();
      // Create points 10km apart in 1 minute = 600 km/h (impossible!)
      const points = [
        new GPSPoint(45.0, -122.0, 100, now, 0),
        new GPSPoint(45.09, -122.0, 105, new Date(now.getTime() + 60000), 10000), // 10km in 1 minute
      ];
      const track = new GPSTrack(points, { name: 'Test', type: 'Run' });

      const result = validateTrack(track);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('speed');
      expect(result.errors[0].message).toContain('Unrealistic speed');
    });

    it('should allow high speeds for cycling', () => {
      const now = new Date();
      // 100 km/h is reasonable for downhill cycling
      // Distance: ~2.78 km in 100 seconds = 100 km/h
      const points = [
        new GPSPoint(45.0, -122.0, 100, now, 0),
        new GPSPoint(45.025, -122.0, 105, new Date(now.getTime() + 100000), 2780), // ~100 km/h
      ];
      const track = new GPSTrack(points, { name: 'Test', type: 'Ride' });

      const result = validateTrack(track);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect teleportation (large distance in short time)', () => {
      const now = new Date();
      // 50km in 30 seconds = teleportation
      const points = [
        new GPSPoint(45.0, -122.0, 100, now, 0),
        new GPSPoint(45.45, -122.0, 105, new Date(now.getTime() + 30000), 50000), // 50km in 30s
      ];
      const track = new GPSTrack(points, { name: 'Test', type: 'Run' });

      const result = validateTrack(track);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      const teleportError = result.errors.find(e => e.type === 'teleportation');
      expect(teleportError).toBeDefined();
    });

    it('should warn about large gaps (but not error)', () => {
      const now = new Date();
      // 55km in 6 minutes for cycling = warning but not error (within 150 km/h threshold)
      // 55km in 360s = 550 km/h which exceeds threshold, so let's use less distance
      // 20km in 10 minutes = 120 km/h (within 150 km/h threshold for cycling)
      const points = [
        new GPSPoint(45.0, -122.0, 100, now, 0),
        new GPSPoint(45.18, -122.0, 105, new Date(now.getTime() + 600000), 20000), // 20km in 10min = 120 km/h
      ];
      const track = new GPSTrack(points, { name: 'Test', type: 'Ride' }); // Cycling

      const result = validateTrack(track);

      // Should be valid speed for cycling but still warn about gap
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      const gapWarning = result.warnings.find(w => w.type === 'teleportation' || w.type === 'speed');
      expect(gapWarning).toBeDefined();
    });

    it('should handle tracks with less than 2 points', () => {
      const points = [new GPSPoint(45.0, -122.0, 100, new Date(), 0)];
      const track = new GPSTrack(points, { name: 'Test', type: 'Run' });

      const result = validateTrack(track);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle stationary points (same timestamp)', () => {
      const now = new Date();
      const points = [
        new GPSPoint(45.0, -122.0, 100, now, 0),
        new GPSPoint(45.0, -122.0, 100, now, 0), // Same timestamp and distance (paused recording)
        new GPSPoint(45.0009, -122.0, 105, new Date(now.getTime() + 60000), 100), // ~100m in 60s = 6 km/h
      ];
      const track = new GPSTrack(points, { name: 'Test', type: 'Run' });

      const result = validateTrack(track);

      expect(result.isValid).toBe(true); // Should not fail on stationary points
    });

    it('should use correct speed threshold for activity type', () => {
      const now = new Date();
      // 30 km/h is impossible for hiking but fine for cycling
      // Distance: ~833m in 100 seconds = 30 km/h
      const hikingPoints = [
        new GPSPoint(45.0, -122.0, 100, now, 0),
        new GPSPoint(45.0075, -122.0, 105, new Date(now.getTime() + 100000), 833), // ~30 km/h
      ];
      const cyclingPoints = [...hikingPoints];

      const hikingTrack = new GPSTrack(hikingPoints, { name: 'Test', type: 'Hike' });
      const cyclingTrack = new GPSTrack(cyclingPoints, { name: 'Test', type: 'Ride' });

      const hikingResult = validateTrack(hikingTrack);
      const cyclingResult = validateTrack(cyclingTrack);

      expect(hikingResult.isValid).toBe(false); // Should fail for hiking
      expect(cyclingResult.isValid).toBe(true); // Should pass for cycling
    });
  });

  describe('getValidationSummary', () => {
    it('should return success message for valid track', () => {
      const result = { isValid: true, errors: [], warnings: [] };
      const summary = getValidationSummary(result);

      expect(summary).toContain('valid');
      expect(summary).toContain('no issues');
    });

    it('should show error count', () => {
      const result = {
        isValid: false,
        errors: [
          { type: 'speed' as const, severity: 'error' as const, message: 'Test' },
          { type: 'timestamp' as const, severity: 'error' as const, message: 'Test' },
        ],
        warnings: [],
      };
      const summary = getValidationSummary(result);

      expect(summary).toContain('2 errors');
    });

    it('should show warning count', () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: [{ type: 'speed' as const, severity: 'warning' as const, message: 'Test' }],
      };
      const summary = getValidationSummary(result);

      expect(summary).toContain('1 warning');
    });

    it('should show both errors and warnings', () => {
      const result = {
        isValid: false,
        errors: [{ type: 'speed' as const, severity: 'error' as const, message: 'Test' }],
        warnings: [
          { type: 'teleportation' as const, severity: 'warning' as const, message: 'Test' },
        ],
      };
      const summary = getValidationSummary(result);

      expect(summary).toContain('1 error');
      expect(summary).toContain('1 warning');
    });
  });
});
