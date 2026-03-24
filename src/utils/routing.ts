import L from 'leaflet';

export interface RouteSegment {
  points: Array<{ lat: number; lng: number }>;
  distance: number;
  duration: number;
}

export type RoutingProfile = 'bike' | 'foot';

/**
 * Route between two points using OSRM API
 * @param start - Starting point
 * @param end - Ending point
 * @param profile - Routing profile (bike or foot)
 * @returns Route segment with points, distance, and duration
 */
export async function routeBetweenPoints(
  start: L.LatLng,
  end: L.LatLng,
  profile: RoutingProfile = 'bike'
): Promise<RouteSegment> {
  const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`;
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?geometries=geojson&overview=full`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Routing failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    const geometry = route.geometry;

    // Convert GeoJSON coordinates [lng, lat] to {lat, lng}
    const points = geometry.coordinates.map((coord: [number, number]) => ({
      lat: coord[1],
      lng: coord[0],
    }));

    return {
      points,
      distance: route.distance,
      duration: route.duration,
    };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Routing request timed out');
    }
    throw error;
  }
}

/**
 * Create a straight line segment between two points as fallback
 * @param start - Starting point
 * @param end - Ending point
 * @param numPoints - Number of points to interpolate
 * @returns Straight line segment
 */
export function createStraightLineSegment(
  start: L.LatLng,
  end: L.LatLng,
  numPoints: number = 10
): RouteSegment {
  const points: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i <= numPoints; i++) {
    const ratio = i / numPoints;
    points.push({
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio,
    });
  }

  const distance = start.distanceTo(end);

  return {
    points,
    distance,
    duration: distance / 4, // Assume 4 m/s average speed for estimation
  };
}

/**
 * Route between two points with automatic fallback to straight line
 * @param start - Starting point
 * @param end - Ending point
 * @param profile - Routing profile
 * @returns Route segment (routed or straight line fallback)
 */
export async function routeWithFallback(
  start: L.LatLng,
  end: L.LatLng,
  profile: RoutingProfile = 'bike'
): Promise<{ segment: RouteSegment; wasRouted: boolean }> {
  try {
    const segment = await routeBetweenPoints(start, end, profile);
    return { segment, wasRouted: true };
  } catch (error) {
    console.warn('Routing failed, using straight line fallback:', error);
    const segment = createStraightLineSegment(start, end);
    return { segment, wasRouted: false };
  }
}

/**
 * Combine multiple route segments into a single array of points
 * Removes duplicate points at segment boundaries
 * @param segments - Array of route segments to combine
 * @returns Combined array of points
 */
export function combineRouteSegments(segments: RouteSegment[]): Array<{ lat: number; lng: number }> {
  const allPoints: Array<{ lat: number; lng: number }> = [];

  segments.forEach((segment, index) => {
    if (index === 0) {
      // Include all points from first segment
      allPoints.push(...segment.points);
    } else {
      // Skip first point of subsequent segments (duplicate of last point of previous)
      allPoints.push(...segment.points.slice(1));
    }
  });

  return allPoints;
}

/**
 * Route through multiple waypoints in sequence
 * @param points - Array of waypoints to route through
 * @param profile - Routing profile
 * @returns Combined route segments with routing status for each
 */
export async function routeThroughWaypoints(
  points: L.LatLng[],
  profile: RoutingProfile = 'bike'
): Promise<{
  segments: RouteSegment[];
  routingStatus: boolean[]; // true if segment was successfully routed, false if fallback
}> {
  if (points.length < 2) {
    throw new Error('Need at least 2 points to route');
  }

  const segments: RouteSegment[] = [];
  const routingStatus: boolean[] = [];

  // Route between each consecutive pair of points
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];

    const { segment, wasRouted } = await routeWithFallback(start, end, profile);
    segments.push(segment);
    routingStatus.push(wasRouted);
  }

  return { segments, routingStatus };
}

/**
 * Resample a path to maintain consistent point spacing
 * @param points - Points to resample
 * @param targetSpacing - Desired spacing between points in meters
 * @returns Resampled points
 */
export function resamplePath(
  points: Array<{ lat: number; lng: number }>,
  targetSpacing: number = 10
): Array<{ lat: number; lng: number }> {
  if (points.length < 2) return points;

  const resampled: Array<{ lat: number; lng: number }> = [points[0]];
  let accumulatedDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = L.latLng(points[i - 1].lat, points[i - 1].lng);
    const curr = L.latLng(points[i].lat, points[i].lng);
    const segmentDist = prev.distanceTo(curr);

    accumulatedDistance += segmentDist;

    // Add point if we've traveled far enough
    if (accumulatedDistance >= targetSpacing) {
      resampled.push(points[i]);
      accumulatedDistance = 0;
    }
  }

  // Always include last point
  const lastPoint = points[points.length - 1];
  const lastResampled = resampled[resampled.length - 1];
  if (lastResampled.lat !== lastPoint.lat || lastResampled.lng !== lastPoint.lng) {
    resampled.push(lastPoint);
  }

  return resampled;
}
