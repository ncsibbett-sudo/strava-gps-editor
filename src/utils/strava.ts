import { GPSTrack, TrackMetadata } from '../models/GPSTrack';
import { GPSPoint } from '../models/GPSPoint';

/**
 * Strava streams data structure from API
 */
export interface StravaStreams {
  latlng?: {
    data: [number, number][];
  };
  altitude?: {
    data: number[];
  };
  time?: {
    data: number[];
  };
  distance?: {
    data: number[];
  };
}

/**
 * Convert Strava API streams to GPSTrack
 * @param streams - Strava streams object
 * @param metadata - Optional track metadata
 * @returns GPSTrack instance
 */
export function streamsToTrack(
  streams: StravaStreams,
  metadata?: Partial<TrackMetadata>
): GPSTrack {
  if (!streams.latlng || !streams.latlng.data || streams.latlng.data.length === 0) {
    throw new Error('No GPS data in streams');
  }

  const latlngData = streams.latlng.data;
  const altitudeData = streams.altitude?.data || [];
  const timeData = streams.time?.data || [];
  const distanceData = streams.distance?.data || [];

  const points: GPSPoint[] = [];
  const activityStartTime = metadata?.startTime || new Date();

  for (let i = 0; i < latlngData.length; i++) {
    const [lat, lng] = latlngData[i];

    // Get elevation (default to 0 if not available)
    const elevation = altitudeData[i] ?? 0;

    // Calculate time (time data is in seconds from start)
    const timeOffset = timeData[i] ?? i; // fallback to index
    const pointTime = new Date(activityStartTime.getTime() + timeOffset * 1000);

    // Get distance (will be recalculated by GPSTrack if not available)
    const distance = distanceData[i] ?? 0;

    points.push(new GPSPoint(lat, lng, elevation, pointTime, distance));
  }

  return new GPSTrack(points, metadata);
}
