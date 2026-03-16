import { describe, it, expect } from 'vitest';
import { parseGPXToTrack, trackToGPX } from './gpx';
import { GPSTrack } from '../models/GPSTrack';
import { GPSPoint } from '../models/GPSPoint';

describe('gpx utils', () => {
  const sampleGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <metadata>
    <name>Test Run</name>
    <time>2024-01-01T12:00:00Z</time>
  </metadata>
  <trk>
    <name>Test Run</name>
    <type>Run</type>
    <trkseg>
      <trkpt lat="40.0" lon="-74.0">
        <ele>10</ele>
        <time>2024-01-01T12:00:00Z</time>
      </trkpt>
      <trkpt lat="40.001" lon="-74.0">
        <ele>15</ele>
        <time>2024-01-01T12:00:10Z</time>
      </trkpt>
      <trkpt lat="40.002" lon="-74.0">
        <ele>20</ele>
        <time>2024-01-01T12:00:20Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

  describe('parseGPXToTrack', () => {
    it('should parse GPX string to GPSTrack', () => {
      const track = parseGPXToTrack(sampleGPX);

      expect(track.points).toHaveLength(3);
      expect(track.points[0].lat).toBe(40.0);
      expect(track.points[0].lng).toBe(-74.0);
      expect(track.points[0].elevation).toBe(10);
      expect(track.points[1].elevation).toBe(15);
      expect(track.metadata.name).toBe('Test Run');
    });

    it('should parse times correctly', () => {
      const track = parseGPXToTrack(sampleGPX);

      expect(track.points[0].time.toISOString()).toBe('2024-01-01T12:00:00.000Z');
      expect(track.points[1].time.toISOString()).toBe('2024-01-01T12:00:10.000Z');
      expect(track.points[2].time.toISOString()).toBe('2024-01-01T12:00:20.000Z');
    });

    it('should handle GPX without elevation', () => {
      const gpxWithoutElevation = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="40.0" lon="-74.0">
        <time>2024-01-01T12:00:00Z</time>
      </trkpt>
      <trkpt lat="40.001" lon="-74.0">
        <time>2024-01-01T12:00:10Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const track = parseGPXToTrack(gpxWithoutElevation);

      expect(track.points).toHaveLength(2);
      expect(track.points[0].elevation).toBe(0);
      expect(track.points[1].elevation).toBe(0);
    });

    it('should throw error for empty GPX', () => {
      const emptyGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
</gpx>`;

      expect(() => parseGPXToTrack(emptyGPX)).toThrow('No tracks found in GPX file');
    });

    it('should throw error for GPX with no points', () => {
      const gpxWithoutPoints = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
    </trkseg>
  </trk>
</gpx>`;

      expect(() => parseGPXToTrack(gpxWithoutPoints)).toThrow('No valid points found in GPX file');
    });
  });

  describe('trackToGPX', () => {
    it('should convert GPSTrack to GPX string', () => {
      const points = [
        new GPSPoint(40.0, -74.0, 10, new Date('2024-01-01T12:00:00Z')),
        new GPSPoint(40.001, -74.0, 15, new Date('2024-01-01T12:00:10Z')),
        new GPSPoint(40.002, -74.0, 20, new Date('2024-01-01T12:00:20Z')),
      ];

      const track = new GPSTrack(points, {
        name: 'Test Run',
        type: 'Run',
      });

      const gpxString = trackToGPX(track);

      expect(gpxString).toContain('<?xml');
      expect(gpxString).toContain('<gpx');
      expect(gpxString).toContain('Test Run');
      expect(gpxString).toContain('lat="40"');
      expect(gpxString).toContain('lon="-74"');
      expect(gpxString).toContain('<ele>10</ele>');
    });

    it('should produce parseable GPX', () => {
      const points = [
        new GPSPoint(40.0, -74.0, 10, new Date('2024-01-01T12:00:00Z')),
        new GPSPoint(40.001, -74.0, 15, new Date('2024-01-01T12:00:10Z')),
      ];

      const originalTrack = new GPSTrack(points, {
        name: 'Round Trip Test',
        type: 'Run',
      });

      const gpxString = trackToGPX(originalTrack);
      const parsedTrack = parseGPXToTrack(gpxString);

      expect(parsedTrack.points).toHaveLength(2);
      expect(parsedTrack.points[0].lat).toBeCloseTo(40.0, 5);
      expect(parsedTrack.points[0].lng).toBeCloseTo(-74.0, 5);
      expect(parsedTrack.metadata.name).toBe('Round Trip Test');
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data through parse and stringify cycle', () => {
      const track = parseGPXToTrack(sampleGPX);
      const gpxString = trackToGPX(track);
      const reparsedTrack = parseGPXToTrack(gpxString);

      expect(reparsedTrack.points).toHaveLength(3);
      expect(reparsedTrack.metadata.name).toBe('Test Run');
    });
  });
});
