import { GPSPoint } from '../models/GPSPoint';
import { GPSTrack } from '../models/GPSTrack';

/**
 * Apply moving average smoothing to GPS track
 * @param track - GPS track to smooth
 * @param windowSize - Number of points to average (must be odd)
 * @returns Smoothed GPS track
 */
export function applyMovingAverageSmoothing(track: GPSTrack, windowSize: number = 5): GPSTrack {
  if (track.points.length < windowSize) {
    return track.clone();
  }

  // Ensure window size is odd
  if (windowSize % 2 === 0) {
    windowSize += 1;
  }

  const halfWindow = Math.floor(windowSize / 2);
  const smoothedPoints: GPSPoint[] = [];

  for (let i = 0; i < track.points.length; i++) {
    const point = track.points[i];

    // For edge points, just copy them
    if (i < halfWindow || i >= track.points.length - halfWindow) {
      smoothedPoints.push(new GPSPoint(point.lat, point.lng, point.elevation, point.time, 0));
      continue;
    }

    // Calculate average for window
    let sumLat = 0;
    let sumLng = 0;
    let sumElevation = 0;

    for (let j = i - halfWindow; j <= i + halfWindow; j++) {
      sumLat += track.points[j].lat;
      sumLng += track.points[j].lng;
      sumElevation += track.points[j].elevation;
    }

    const avgLat = sumLat / windowSize;
    const avgLng = sumLng / windowSize;
    const avgElevation = sumElevation / windowSize;

    smoothedPoints.push(new GPSPoint(avgLat, avgLng, avgElevation, point.time, 0));
  }

  return new GPSTrack(smoothedPoints, track.metadata);
}

/**
 * Apply Gaussian smoothing to GPS track
 * @param track - GPS track to smooth
 * @param sigma - Standard deviation for Gaussian kernel
 * @returns Smoothed GPS track
 */
export function applyGaussianSmoothing(track: GPSTrack, sigma: number = 2): GPSTrack {
  if (track.points.length < 3) {
    return track.clone();
  }

  // Generate Gaussian kernel
  const kernelRadius = Math.ceil(sigma * 3);
  const kernelSize = kernelRadius * 2 + 1;
  const kernel: number[] = [];
  let kernelSum = 0;

  for (let i = 0; i < kernelSize; i++) {
    const x = i - kernelRadius;
    const value = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(value);
    kernelSum += value;
  }

  // Normalize kernel
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= kernelSum;
  }

  const smoothedPoints: GPSPoint[] = [];

  for (let i = 0; i < track.points.length; i++) {
    const point = track.points[i];

    let sumLat = 0;
    let sumLng = 0;
    let sumElevation = 0;
    let weightSum = 0;

    for (let j = 0; j < kernelSize; j++) {
      const idx = i - kernelRadius + j;
      if (idx >= 0 && idx < track.points.length) {
        const weight = kernel[j];
        sumLat += track.points[idx].lat * weight;
        sumLng += track.points[idx].lng * weight;
        sumElevation += track.points[idx].elevation * weight;
        weightSum += weight;
      }
    }

    const smoothedLat = sumLat / weightSum;
    const smoothedLng = sumLng / weightSum;
    const smoothedElevation = sumElevation / weightSum;

    smoothedPoints.push(
      new GPSPoint(smoothedLat, smoothedLng, smoothedElevation, point.time, 0)
    );
  }

  return new GPSTrack(smoothedPoints, track.metadata);
}
