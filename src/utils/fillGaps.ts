import { GPSPoint } from '../models/GPSPoint';
import { GPSTrack, type Gap } from '../models/GPSTrack';

/**
 * Fill detected gaps in a track by linearly interpolating GPS points.
 * Returns a new GPSTrack with interpolated points inserted.
 */
export function fillGapsInTrack(track: GPSTrack, gaps: Gap[]): GPSTrack {
  if (gaps.length === 0) return track.clone();

  const filledTrack = track.clone();
  let offset = 0;

  gaps.forEach((gap) => {
    const startIdx = gap.startIndex + offset;
    const endIdx = gap.endIndex + offset;

    if (startIdx >= filledTrack.points.length - 1 || endIdx >= filledTrack.points.length) return;

    const startPoint = filledTrack.points[startIdx];
    const endPoint = filledTrack.points[endIdx];

    // ~1 point per 5 seconds of gap
    const numPoints = Math.max(2, Math.floor(gap.timeDelta / 5));
    const interpolated: GPSPoint[] = [];

    for (let i = 1; i < numPoints; i++) {
      const t = i / numPoints;
      interpolated.push(
        new GPSPoint(
          startPoint.lat + (endPoint.lat - startPoint.lat) * t,
          startPoint.lng + (endPoint.lng - startPoint.lng) * t,
          startPoint.elevation + (endPoint.elevation - startPoint.elevation) * t,
          new Date(startPoint.time.getTime() + (endPoint.time.getTime() - startPoint.time.getTime()) * t),
          0
        )
      );
    }

    filledTrack.points.splice(endIdx, 0, ...interpolated);
    offset += interpolated.length;
  });

  return filledTrack;
}
