import { parseGPX } from '@we-gold/gpxjs';
import { GPSTrack } from '../models/GPSTrack';
import { GPSPoint } from '../models/GPSPoint';

/**
 * Parse GPX string and convert to GPSTrack
 * @param gpxString - GPX file content as string
 * @returns GPSTrack instance
 */
export function parseGPXToTrack(gpxString: string): GPSTrack {
  const [gpxData, error] = parseGPX(gpxString);

  if (error) {
    throw new Error(`Failed to parse GPX: ${error.message}`);
  }

  if (!gpxData || !gpxData.tracks || gpxData.tracks.length === 0) {
    throw new Error('No tracks found in GPX file');
  }

  // Use the first track
  const track = gpxData.tracks[0];
  const points: GPSPoint[] = [];

  // Tracks have points directly (not segments)
  for (const point of track.points || []) {
    if (point.latitude !== undefined && point.longitude !== undefined) {
      const gpsPoint = new GPSPoint(
        point.latitude,
        point.longitude,
        point.elevation ?? 0,
        point.time ?? new Date(),
        0 // Distance will be recalculated by GPSTrack constructor
      );
      points.push(gpsPoint);
    }
  }

  if (points.length === 0) {
    throw new Error('No valid points found in GPX file');
  }

  return new GPSTrack(points, {
    name: track.name ?? 'Unnamed Activity',
    type: track.type ?? 'Run',
  });
}

/**
 * Convert GPSTrack to GPX format
 * @param track - GPSTrack instance
 * @returns GPX file content as string
 */
export function trackToGPX(track: GPSTrack): string {
  // Build GPX XML manually
  const escapeXml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const trackPoints = track.points
    .map(
      (point) => `      <trkpt lat="${point.lat}" lon="${point.lng}">
        <ele>${point.elevation}</ele>
        <time>${point.time.toISOString()}</time>
      </trkpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Strava GPS Route Editor" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(track.metadata.name)}</name>
    <time>${track.metadata.startTime.toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(track.metadata.name)}</name>
    <type>${escapeXml(track.metadata.type)}</type>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;
}
