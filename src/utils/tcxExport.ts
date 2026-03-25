import type { GPSTrack } from '../models/GPSTrack';

/** Map Strava activity type to TCX Sport attribute */
function stravaTypeToTcxSport(activityType: string): string {
  const t = activityType.toLowerCase();
  if (t === 'run') return 'Running';
  if (t === 'ride' || t === 'virtualride' || t === 'ebikeride' ||
      t === 'mountainbikeride' || t === 'gravelride') return 'Biking';
  return 'Other';
}

/** Format a Date as ISO 8601 string compatible with TCX */
function toTcxTime(date: Date): string {
  return date.toISOString();
}

/**
 * Generate a TCX (Training Center XML) string from a GPS track.
 * Compatible with TrainingPeaks, Garmin Connect, and other platforms.
 */
export function generateTCX(track: GPSTrack): string {
  const sport = stravaTypeToTcxSport(track.metadata.type);
  const startTime = toTcxTime(track.metadata.startTime);
  const totalSec = track.totalTime;
  const totalDist = track.totalDistance;

  const trackpoints = track.points.map((point) => {
    const time = toTcxTime(point.time);
    const altLine = point.elevation != null
      ? `        <AltitudeMeters>${point.elevation.toFixed(2)}</AltitudeMeters>\n`
      : '';
    const distLine = `        <DistanceMeters>${point.distance.toFixed(2)}</DistanceMeters>\n`;
    return (
      `      <Trackpoint>\n` +
      `        <Time>${time}</Time>\n` +
      `        <Position>\n` +
      `          <LatitudeDegrees>${point.lat.toFixed(8)}</LatitudeDegrees>\n` +
      `          <LongitudeDegrees>${point.lng.toFixed(8)}</LongitudeDegrees>\n` +
      `        </Position>\n` +
      altLine +
      distLine +
      `      </Trackpoint>`
    );
  }).join('\n');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<TrainingCenterDatabase\n` +
    `  xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"\n` +
    `  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n` +
    `  xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">\n` +
    `  <Activities>\n` +
    `    <Activity Sport="${sport}">\n` +
    `      <Id>${startTime}</Id>\n` +
    `      <Lap StartTime="${startTime}">\n` +
    `        <TotalTimeSeconds>${totalSec.toFixed(0)}</TotalTimeSeconds>\n` +
    `        <DistanceMeters>${totalDist.toFixed(2)}</DistanceMeters>\n` +
    `        <Calories>0</Calories>\n` +
    `        <Intensity>Active</Intensity>\n` +
    `        <TriggerMethod>Manual</TriggerMethod>\n` +
    `        <Track>\n` +
    trackpoints + `\n` +
    `        </Track>\n` +
    `      </Lap>\n` +
    `    </Activity>\n` +
    `  </Activities>\n` +
    `</TrainingCenterDatabase>\n`
  );
}

/**
 * Trigger a browser download of the GPS track as a .tcx file.
 */
export function downloadTCX(track: GPSTrack, filename: string = 'activity'): void {
  const tcxContent = generateTCX(track);
  const blob = new Blob([tcxContent], { type: 'application/vnd.garmin.tcx+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.tcx') ? filename : `${filename}.tcx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
