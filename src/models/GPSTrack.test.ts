import { describe, it, expect } from 'vitest';
import { GPSTrack } from './GPSTrack';
import { GPSPoint } from './GPSPoint';

describe('GPSTrack', () => {
  // Helper function to create a mock track
  function createMockTrack(numPoints: number = 5): GPSTrack {
    const points: GPSPoint[] = [];
    const startTime = new Date('2024-01-01T12:00:00Z');

    for (let i = 0; i < numPoints; i++) {
      const lat = 40.0 + i * 0.001; // ~111m between points
      const time = new Date(startTime.getTime() + i * 10000); // 10 seconds apart
      points.push(new GPSPoint(lat, -74.0, 10 + i, time));
    }

    return new GPSTrack(points, {
      name: 'Test Run',
      type: 'Run',
    });
  }

  describe('constructor', () => {
    it('should create a track with points and metadata', () => {
      const track = createMockTrack(3);

      expect(track.points).toHaveLength(3);
      expect(track.metadata.name).toBe('Test Run');
      expect(track.metadata.type).toBe('Run');
    });

    it('should use default metadata if not provided', () => {
      const points = [new GPSPoint(40.0, -74.0, 10, new Date())];
      const track = new GPSTrack(points);

      expect(track.metadata.name).toBe('Unnamed Activity');
      expect(track.metadata.type).toBe('Run');
    });

    it('should calculate cumulative distances', () => {
      const track = createMockTrack(3);

      expect(track.points[0].distance).toBe(0);
      expect(track.points[1].distance).toBeGreaterThan(0);
      expect(track.points[2].distance).toBeGreaterThan(track.points[1].distance);
    });
  });

  describe('totalDistance', () => {
    it('should return total distance of the track', () => {
      const track = createMockTrack(5);

      const distance = track.totalDistance;

      // 4 segments of ~111m each ≈ 444m
      expect(distance).toBeGreaterThan(440);
      expect(distance).toBeLessThan(450);
    });

    it('should return 0 for empty track', () => {
      const track = new GPSTrack([]);

      expect(track.totalDistance).toBe(0);
    });
  });

  describe('totalTime', () => {
    it('should return total elapsed time in seconds', () => {
      const track = createMockTrack(5);

      const time = track.totalTime;

      // 4 segments of 10 seconds each = 40 seconds
      expect(time).toBe(40);
    });

    it('should return 0 for track with single point', () => {
      const track = createMockTrack(1);

      expect(track.totalTime).toBe(0);
    });
  });

  describe('movingTime', () => {
    it('should calculate moving time excluding stationary periods', () => {
      const points: GPSPoint[] = [];
      const startTime = new Date('2024-01-01T12:00:00Z');

      // Moving: 0-1 (10s, 111m)
      points.push(new GPSPoint(40.0, -74.0, 10, startTime));
      points.push(new GPSPoint(40.001, -74.0, 10, new Date(startTime.getTime() + 10000)));

      // Stationary: 1-2 (10s, 0m)
      points.push(new GPSPoint(40.001, -74.0, 10, new Date(startTime.getTime() + 20000)));

      // Moving: 2-3 (10s, 111m)
      points.push(new GPSPoint(40.002, -74.0, 10, new Date(startTime.getTime() + 30000)));

      const track = new GPSTrack(points);

      // Should be ~20s (excluding the stationary period)
      expect(track.movingTime).toBeGreaterThan(19);
      expect(track.movingTime).toBeLessThan(21);
    });
  });

  describe('averageSpeed', () => {
    it('should calculate average speed based on moving time', () => {
      const track = createMockTrack(5);

      const avgSpeed = track.averageSpeed;

      // ~444m in 40s = ~11.1 m/s
      expect(avgSpeed).toBeGreaterThan(11);
      expect(avgSpeed).toBeLessThan(11.2);
    });

    it('should return 0 for stationary track', () => {
      const points = [
        new GPSPoint(40.0, -74.0, 10, new Date()),
        new GPSPoint(40.0, -74.0, 10, new Date(Date.now() + 10000)),
      ];
      const track = new GPSTrack(points);

      expect(track.averageSpeed).toBe(0);
    });
  });

  describe('maxSpeed', () => {
    it('should return maximum speed', () => {
      const points: GPSPoint[] = [];
      const startTime = new Date('2024-01-01T12:00:00Z');

      // Slow segment: ~11.1 m/s
      points.push(new GPSPoint(40.0, -74.0, 10, startTime));
      points.push(new GPSPoint(40.001, -74.0, 10, new Date(startTime.getTime() + 10000)));

      // Fast segment: ~22.2 m/s (twice the distance in same time)
      points.push(new GPSPoint(40.003, -74.0, 10, new Date(startTime.getTime() + 20000)));

      const track = new GPSTrack(points);

      const maxSpeed = track.maxSpeed;

      // Should be ~22.2 m/s
      expect(maxSpeed).toBeGreaterThan(22);
      expect(maxSpeed).toBeLessThan(22.5);
    });
  });

  describe('elevationGain', () => {
    it('should calculate total elevation gain', () => {
      const points = [
        new GPSPoint(40.0, -74.0, 0, new Date()),
        new GPSPoint(40.001, -74.0, 10, new Date()), // +10m
        new GPSPoint(40.002, -74.0, 5, new Date()), // -5m (ignored)
        new GPSPoint(40.003, -74.0, 20, new Date()), // +15m
      ];
      const track = new GPSTrack(points);

      const gain = track.elevationGain;

      expect(gain).toBe(25); // 10 + 15
    });

    it('should return 0 for flat track', () => {
      // Create a truly flat track
      const points = [
        new GPSPoint(40.0, -74.0, 10, new Date()),
        new GPSPoint(40.001, -74.0, 10, new Date()),
        new GPSPoint(40.002, -74.0, 10, new Date()),
      ];
      const flatTrack = new GPSTrack(points);

      expect(flatTrack.elevationGain).toBe(0);
    });
  });

  describe('elevationLoss', () => {
    it('should calculate total elevation loss', () => {
      const points = [
        new GPSPoint(40.0, -74.0, 20, new Date()),
        new GPSPoint(40.001, -74.0, 10, new Date()), // -10m
        new GPSPoint(40.002, -74.0, 15, new Date()), // +5m (ignored)
        new GPSPoint(40.003, -74.0, 5, new Date()), // -10m
      ];
      const track = new GPSTrack(points);

      const loss = track.elevationLoss;

      expect(loss).toBe(20); // 10 + 10
    });
  });

  describe('bounds', () => {
    it('should calculate bounding box', () => {
      const points = [
        new GPSPoint(40.0, -74.0, 10, new Date()),
        new GPSPoint(40.005, -74.005, 10, new Date()),
        new GPSPoint(39.995, -73.995, 10, new Date()),
      ];
      const track = new GPSTrack(points);

      const bounds = track.bounds;

      expect(bounds.north).toBe(40.005);
      expect(bounds.south).toBe(39.995);
      expect(bounds.east).toBe(-73.995);
      expect(bounds.west).toBe(-74.005);
    });

    it('should return zeroes for empty track', () => {
      const track = new GPSTrack([]);

      const bounds = track.bounds;

      expect(bounds.north).toBe(0);
      expect(bounds.south).toBe(0);
      expect(bounds.east).toBe(0);
      expect(bounds.west).toBe(0);
    });
  });

  describe('detectGaps', () => {
    it('should detect gaps in recording', () => {
      const points: GPSPoint[] = [];
      const startTime = new Date('2024-01-01T12:00:00Z');

      points.push(new GPSPoint(40.0, -74.0, 10, startTime));
      points.push(new GPSPoint(40.001, -74.0, 10, new Date(startTime.getTime() + 10000)));
      // 120-second gap
      points.push(new GPSPoint(40.002, -74.0, 10, new Date(startTime.getTime() + 130000)));
      points.push(new GPSPoint(40.003, -74.0, 10, new Date(startTime.getTime() + 140000)));

      const track = new GPSTrack(points);
      const gaps = track.detectGaps(60); // 60 second minimum

      expect(gaps).toHaveLength(1);
      expect(gaps[0].startIndex).toBe(1);
      expect(gaps[0].endIndex).toBe(2);
      expect(gaps[0].timeDelta).toBe(120);
    });

    it('should not detect short pauses', () => {
      const track = createMockTrack(5); // 10 seconds between points

      const gaps = track.detectGaps(60);

      expect(gaps).toHaveLength(0);
    });
  });

  describe('detectSpikes', () => {
    it('should detect speed spikes', () => {
      const points: GPSPoint[] = [];
      const startTime = new Date('2024-01-01T12:00:00Z');

      // Normal points
      points.push(new GPSPoint(40.0, -74.0, 10, startTime));
      points.push(new GPSPoint(40.001, -74.0, 10, new Date(startTime.getTime() + 10000)));

      // Spike: huge distance in short time
      points.push(new GPSPoint(40.1, -74.0, 10, new Date(startTime.getTime() + 20000)));

      // Back to normal
      points.push(new GPSPoint(40.101, -74.0, 10, new Date(startTime.getTime() + 30000)));

      const track = new GPSTrack(points);
      const spikes = track.detectSpikes(22, 100);

      expect(spikes.length).toBeGreaterThan(0);
      expect(spikes).toContain(2); // The spike point
    });

    it('should detect distance spikes', () => {
      const points: GPSPoint[] = [];
      const startTime = new Date('2024-01-01T12:00:00Z');

      points.push(new GPSPoint(40.0, -74.0, 10, startTime));
      // Huge distance jump (>100m threshold)
      points.push(new GPSPoint(40.002, -74.0, 10, new Date(startTime.getTime() + 10000)));
      points.push(new GPSPoint(40.003, -74.0, 10, new Date(startTime.getTime() + 20000)));

      const track = new GPSTrack(points);
      const spikes = track.detectSpikes(22, 100);

      expect(spikes.length).toBeGreaterThan(0);
    });

    it('should not detect spikes in normal track', () => {
      const track = createMockTrack(5);

      // Use higher thresholds that won't flag normal ~111m intervals
      const spikes = track.detectSpikes(22, 150);

      expect(spikes).toHaveLength(0);
    });
  });

  describe('trim', () => {
    it('should trim track to specified range', () => {
      const track = createMockTrack(10);

      const trimmed = track.trim(2, 7);

      expect(trimmed.points).toHaveLength(6); // indices 2-7 inclusive
      expect(trimmed.points[0]).toBe(track.points[2]);
      expect(trimmed.points[5]).toBe(track.points[7]);
    });

    it('should recalculate distances after trim', () => {
      const track = createMockTrack(10);

      const trimmed = track.trim(2, 7);

      expect(trimmed.points[0].distance).toBe(0);
      expect(trimmed.points[1].distance).toBeGreaterThan(0);
    });
  });

  describe('removePoints', () => {
    it('should remove specified points', () => {
      const track = createMockTrack(10);

      const filtered = track.removePoints([2, 5, 7]);

      expect(filtered.points).toHaveLength(7); // 10 - 3
      // Check that the right points were removed
      expect(filtered.points.every((p) => !track.points.slice(2, 3).includes(p))).toBe(true);
    });

    it('should recalculate distances after removal', () => {
      const track = createMockTrack(10);

      const filtered = track.removePoints([2, 5, 7]);

      expect(filtered.points[0].distance).toBe(0);
    });
  });

  describe('clone', () => {
    it('should create a deep copy', () => {
      const track = createMockTrack(5);

      const cloned = track.clone();

      expect(cloned).not.toBe(track);
      expect(cloned.points).not.toBe(track.points);
      expect(cloned.points[0]).not.toBe(track.points[0]);
      expect(cloned.metadata).not.toBe(track.metadata);
    });

    it('should have identical data', () => {
      const track = createMockTrack(5);

      const cloned = track.clone();

      expect(cloned.points).toHaveLength(track.points.length);
      expect(cloned.totalDistance).toBe(track.totalDistance);
      expect(cloned.metadata.name).toBe(track.metadata.name);
    });
  });
});
