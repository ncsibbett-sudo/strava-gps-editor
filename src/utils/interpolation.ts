import { GPSPoint } from '../models/GPSPoint';
import { GPSTrack } from '../models/GPSTrack';

/**
 * Haversine distance formula
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Interpolate elevation for a point using inverse distance weighting
 * from the original GPS track
 * @param point - Point to interpolate elevation for
 * @param originalTrack - Original GPS track to sample elevations from
 * @param maxNeighbors - Maximum number of nearest neighbors to use
 * @returns Interpolated elevation
 */
export function interpolateElevation(
  point: { lat: number; lng: number },
  originalTrack: GPSTrack,
  maxNeighbors: number = 2
): number {
  if (originalTrack.points.length === 0) {
    return 0;
  }

  // Calculate distances to all original track points
  const distances = originalTrack.points.map((p, index) => ({
    distance: haversineDistance(point.lat, point.lng, p.lat, p.lng),
    index,
  }));

  // Sort by distance and take nearest neighbors
  const nearest = distances
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxNeighbors);

  // Handle case where point is exactly on an original point
  if (nearest[0].distance < 0.001) {
    return originalTrack.points[nearest[0].index].elevation;
  }

  // Inverse distance weighted interpolation
  let weightedElevation = 0;
  let totalWeight = 0;

  nearest.forEach(({ distance, index }) => {
    const weight = 1 / (distance + 0.001); // Avoid division by zero
    weightedElevation += originalTrack.points[index].elevation * weight;
    totalWeight += weight;
  });

  return weightedElevation / totalWeight;
}

/**
 * Interpolate timestamps for a series of points based on distance
 * @param routedPoints - Points to assign timestamps to
 * @param startPoint - Starting GPS point with timestamp
 * @param endPoint - Ending GPS point with timestamp
 * @returns Array of timestamps
 */
export function interpolateTimestamps(
  routedPoints: Array<{ lat: number; lng: number }>,
  startPoint: GPSPoint,
  endPoint: GPSPoint
): Date[] {
  if (routedPoints.length === 0) {
    return [];
  }

  if (routedPoints.length === 1) {
    return [new Date(startPoint.time)];
  }

  // Calculate cumulative distances along routed path
  const distances: number[] = [0];
  let totalDistance = 0;

  for (let i = 1; i < routedPoints.length; i++) {
    const prev = routedPoints[i - 1];
    const curr = routedPoints[i];
    const dist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    totalDistance += dist;
    distances.push(totalDistance);
  }

  // Calculate total time available
  const totalTime = (endPoint.time.getTime() - startPoint.time.getTime()) / 1000; // seconds
  const startTime = startPoint.time.getTime();

  // Distribute time proportionally to distance
  return distances.map((dist) => {
    const ratio = totalDistance > 0 ? dist / totalDistance : 0;
    return new Date(startTime + ratio * totalTime * 1000);
  });
}

/**
 * Calculate average point spacing from a GPS track
 * @param track - GPS track to analyze
 * @returns Average spacing in meters
 */
export function calculateAverageSpacing(track: GPSTrack): number {
  if (track.points.length < 2) {
    return 10; // Default fallback
  }

  const totalDistance = track.totalDistance;
  const numPoints = track.points.length;
  const averageSpacing = totalDistance / numPoints;

  // Clamp between 5m and 20m
  return Math.max(5, Math.min(20, averageSpacing));
}

/**
 * Convert routed points to GPS points with interpolated elevation and timestamps
 * @param routedPoints - Raw routed points (lat/lng only)
 * @param startPoint - Start point of section being replaced
 * @param endPoint - End point of section being replaced
 * @param originalTrack - Original GPS track for elevation interpolation
 * @returns Array of GPS points
 */
export function convertToGPSPoints(
  routedPoints: Array<{ lat: number; lng: number }>,
  startPoint: GPSPoint,
  endPoint: GPSPoint,
  originalTrack: GPSTrack
): GPSPoint[] {
  if (routedPoints.length === 0) {
    return [];
  }

  // Interpolate timestamps
  const timestamps = interpolateTimestamps(routedPoints, startPoint, endPoint);

  // Convert to GPS points with interpolated elevation
  const gpsPoints: GPSPoint[] = [];
  let cumulativeDistance = startPoint.distance;

  for (let i = 0; i < routedPoints.length; i++) {
    const point = routedPoints[i];

    // Interpolate elevation from original track
    const elevation = interpolateElevation(point, originalTrack);

    // Calculate cumulative distance
    if (i > 0) {
      const prev = routedPoints[i - 1];
      const dist = haversineDistance(prev.lat, prev.lng, point.lat, point.lng);
      cumulativeDistance += dist;
    }

    gpsPoints.push(
      new GPSPoint(point.lat, point.lng, elevation, timestamps[i], cumulativeDistance)
    );
  }

  return gpsPoints;
}
