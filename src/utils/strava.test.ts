import { describe, it, expect } from 'vitest';
import { streamsToTrack, StravaStreams } from './strava';

describe('strava utils', () => {
  describe('streamsToTrack', () => {
    it('should convert Strava streams to GPSTrack', () => {
      const streams: StravaStreams = {
        latlng: {
          data: [
            [40.0, -74.0],
            [40.001, -74.0],
            [40.002, -74.0],
          ],
        },
        altitude: {
          data: [10, 15, 20],
        },
        time: {
          data: [0, 10, 20],
        },
        distance: {
          data: [0, 111, 222],
        },
      };

      const track = streamsToTrack(streams, {
        name: 'Test Run',
        type: 'Run',
      });

      expect(track.points).toHaveLength(3);
      expect(track.points[0].lat).toBe(40.0);
      expect(track.points[0].lng).toBe(-74.0);
      expect(track.points[0].elevation).toBe(10);
      expect(track.points[1].elevation).toBe(15);
      expect(track.metadata.name).toBe('Test Run');
    });

    it('should handle missing altitude data', () => {
      const streams: StravaStreams = {
        latlng: {
          data: [
            [40.0, -74.0],
            [40.001, -74.0],
          ],
        },
        time: {
          data: [0, 10],
        },
      };

      const track = streamsToTrack(streams);

      expect(track.points).toHaveLength(2);
      expect(track.points[0].elevation).toBe(0);
      expect(track.points[1].elevation).toBe(0);
    });

    it('should handle missing time data', () => {
      const streams: StravaStreams = {
        latlng: {
          data: [
            [40.0, -74.0],
            [40.001, -74.0],
          ],
        },
      };

      const track = streamsToTrack(streams);

      expect(track.points).toHaveLength(2);
      // Times should be generated
      expect(track.points[0].time).toBeInstanceOf(Date);
      expect(track.points[1].time).toBeInstanceOf(Date);
    });

    it('should throw error for missing latlng data', () => {
      const streams: StravaStreams = {
        altitude: {
          data: [10, 15, 20],
        },
      };

      expect(() => streamsToTrack(streams)).toThrow('No GPS data in streams');
    });

    it('should calculate times correctly from start time', () => {
      const startTime = new Date('2024-01-01T12:00:00Z');
      const streams: StravaStreams = {
        latlng: {
          data: [
            [40.0, -74.0],
            [40.001, -74.0],
          ],
        },
        time: {
          data: [0, 30], // 30 seconds after start
        },
      };

      const track = streamsToTrack(streams, { startTime });

      expect(track.points[0].time.toISOString()).toBe('2024-01-01T12:00:00.000Z');
      expect(track.points[1].time.toISOString()).toBe('2024-01-01T12:00:30.000Z');
    });
  });
});
