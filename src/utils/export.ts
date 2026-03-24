import { GPSTrack } from '../models/GPSTrack';
import { trackToGPX } from './gpx';

/**
 * Generate GPX string from a GPS track.
 * Wraps trackToGPX for consistent public API.
 */
export function generateGPX(track: GPSTrack): string {
  return trackToGPX(track);
}

/**
 * Estimate the file size of the GPX string in bytes.
 */
export function estimateGPXSize(track: GPSTrack): number {
  // Rough estimate: ~120 bytes per trackpoint in GPX XML
  return track.points.length * 120;
}

/**
 * Create a downloadable GPX Blob and trigger browser download.
 * @param track - The GPS track to export
 * @param filename - Download filename (default: activity.gpx)
 */
export function downloadGPX(track: GPSTrack, filename: string = 'activity.gpx'): void {
  const gpxContent = generateGPX(track);
  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.gpx') ? filename : `${filename}.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Release the object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
