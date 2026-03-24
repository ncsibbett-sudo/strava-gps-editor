import { GPSTrack } from '../models/GPSTrack';

/**
 * Trim a GPS track to the given index range (inclusive on both ends).
 * Distance and time statistics are recalculated automatically by the GPSTrack constructor.
 *
 * @param track - Source GPS track
 * @param startIndex - Index of the first point to keep (0-based)
 * @param endIndex - Index of the last point to keep (inclusive)
 * @returns New GPSTrack containing only the selected range
 */
export function trimTrack(track: GPSTrack, startIndex: number, endIndex: number): GPSTrack {
  if (startIndex < 0 || endIndex >= track.points.length || startIndex > endIndex) {
    throw new RangeError(
      `Invalid trim range [${startIndex}, ${endIndex}] for track with ${track.points.length} points`
    );
  }
  return track.trim(startIndex, endIndex);
}
