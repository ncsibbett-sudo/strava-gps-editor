/**
 * Represents a single GPS point with location, elevation, and time data
 */
export class GPSPoint {
  lat: number;
  lng: number;
  elevation: number; // meters above sea level
  time: Date;
  distance: number; // cumulative distance from start in meters

  constructor(
    lat: number,
    lng: number,
    elevation: number,
    time: Date,
    distance: number = 0
  ) {
    this.lat = lat;
    this.lng = lng;
    this.elevation = elevation;
    this.time = time;
    this.distance = distance;
  }

  /**
   * Calculate speed in meters per second
   * Requires comparison with a previous point
   */
  get speed(): number {
    // Speed calculation requires two points, handled at track level
    return 0;
  }

  /**
   * Calculate elevation grade percentage
   * Requires comparison with a previous point
   */
  get grade(): number {
    // Grade calculation requires two points, handled at track level
    return 0;
  }

  /**
   * Calculate distance to another GPS point using Haversine formula
   * @param other - The other GPS point
   * @returns Distance in meters
   */
  distanceTo(other: GPSPoint): number {
    return haversineDistance(this.lat, this.lng, other.lat, other.lng);
  }

  /**
   * Calculate speed between this point and another
   * @param other - The other GPS point (should be previous point chronologically)
   * @returns Speed in meters per second
   */
  speedTo(other: GPSPoint): number {
    const timeDelta = (this.time.getTime() - other.time.getTime()) / 1000; // seconds
    if (timeDelta <= 0) return 0;

    const distance = other.distanceTo(this);
    return distance / timeDelta;
  }

  /**
   * Calculate elevation grade between this point and another
   * @param other - The other GPS point (should be previous point)
   * @returns Grade as percentage
   */
  gradeTo(other: GPSPoint): number {
    const distance = other.distanceTo(this);
    if (distance === 0) return 0;

    const elevationChange = this.elevation - other.elevation;
    return (elevationChange / distance) * 100;
  }
}

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
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
