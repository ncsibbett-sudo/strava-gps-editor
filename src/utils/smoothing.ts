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
  const n = track.points.length;
  const pts = track.points;
  const smoothedPoints: GPSPoint[] = new Array(n);

  // Copy edge points unchanged
  for (let i = 0; i < halfWindow; i++) {
    smoothedPoints[i] = new GPSPoint(pts[i].lat, pts[i].lng, pts[i].elevation, pts[i].time, 0);
  }
  for (let i = n - halfWindow; i < n; i++) {
    smoothedPoints[i] = new GPSPoint(pts[i].lat, pts[i].lng, pts[i].elevation, pts[i].time, 0);
  }

  // Seed the sliding window sum for the first full window
  let sumLat = 0;
  let sumLng = 0;
  let sumElevation = 0;
  for (let j = 0; j < windowSize; j++) {
    sumLat += pts[j].lat;
    sumLng += pts[j].lng;
    sumElevation += pts[j].elevation;
  }

  // Slide the window across interior points in O(n)
  for (let i = halfWindow; i < n - halfWindow; i++) {
    smoothedPoints[i] = new GPSPoint(
      sumLat / windowSize,
      sumLng / windowSize,
      sumElevation / windowSize,
      pts[i].time,
      0
    );

    // Slide: remove leftmost point, add next point on the right
    if (i + halfWindow + 1 < n) {
      sumLat += pts[i + halfWindow + 1].lat - pts[i - halfWindow].lat;
      sumLng += pts[i + halfWindow + 1].lng - pts[i - halfWindow].lng;
      sumElevation += pts[i + halfWindow + 1].elevation - pts[i - halfWindow].elevation;
    }
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
