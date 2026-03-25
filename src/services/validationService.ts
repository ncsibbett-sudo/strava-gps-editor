import { GPSTrack } from '../models/GPSTrack';
import { GPSPoint } from '../models/GPSPoint';

export interface ValidationError {
  type: 'speed' | 'timestamp' | 'teleportation';
  severity: 'error' | 'warning';
  message: string;
  pointIndex?: number;
  value?: number;
  threshold?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Speed thresholds by activity type (km/h)
 */
const SPEED_THRESHOLDS: Record<string, number> = {
  run: 25, // Elite sprint pace
  ride: 150, // Downhill maximum
  hike: 15,
  walk: 15,
  alpineski: 100,
  backcountryski: 100,
  nordicski: 50,
  swim: 10,
  default: 150, // Conservative default
};

/**
 * Get speed threshold for activity type
 */
function getSpeedThreshold(activityType?: string): number {
  if (!activityType) return SPEED_THRESHOLDS.default;

  const type = activityType.toLowerCase();

  // Check exact match
  if (type in SPEED_THRESHOLDS) {
    return SPEED_THRESHOLDS[type];
  }

  // Check partial matches
  if (type.includes('run')) return SPEED_THRESHOLDS.run;
  if (type.includes('ride') || type.includes('bike') || type.includes('cycling')) {
    return SPEED_THRESHOLDS.ride;
  }
  if (type.includes('hike') || type.includes('walk')) return SPEED_THRESHOLDS.hike;
  if (type.includes('ski')) return SPEED_THRESHOLDS.alpineski;
  if (type.includes('swim')) return SPEED_THRESHOLDS.swim;

  return SPEED_THRESHOLDS.default;
}

/**
 * Calculate speed between two GPS points (km/h)
 */
function calculateSpeed(point1: GPSPoint, point2: GPSPoint): number {
  const distanceKm = point1.distanceTo(point2) / 1000; // meters to km
  const timeDiff = point2.time.getTime() - point1.time.getTime(); // milliseconds

  if (timeDiff === 0) return 0;

  const timeHours = timeDiff / (1000 * 60 * 60); // ms to hours
  return distanceKm / timeHours;
}

/**
 * Validate GPS track for physical impossibilities and data integrity issues
 */
export function validateTrack(track: GPSTrack): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const points = track.points;

  if (points.length < 2) {
    return { isValid: true, errors: [], warnings: [] };
  }

  const speedThreshold = getSpeedThreshold(track.metadata?.type);

  // Check each consecutive pair of points
  for (let i = 0; i < points.length - 1; i++) {
    const point1 = points[i];
    const point2 = points[i + 1];

    // 1. Check timestamp ordering (prevent time travel)
    if (point2.time.getTime() < point1.time.getTime()) {
      errors.push({
        type: 'timestamp',
        severity: 'error',
        message: `Time travel detected at point ${i + 1}. Timestamps must increase.`,
        pointIndex: i + 1,
      });
    }

    // Skip speed/teleportation checks if timestamps are identical (stationary points)
    if (point2.time.getTime() === point1.time.getTime()) {
      continue;
    }

    // 3. Calculate speed between points
    const speed = calculateSpeed(point1, point2);
    const distance = point1.distanceTo(point2);
    const timeDiff = (point2.time.getTime() - point1.time.getTime()) / 1000; // seconds

    // 4. Check for unrealistic speed
    if (speed > speedThreshold) {
      errors.push({
        type: 'speed',
        severity: 'error',
        message: `Unrealistic speed at point ${i + 1}: ${speed.toFixed(
          1
        )} km/h (max: ${speedThreshold} km/h)`,
        pointIndex: i + 1,
        value: speed,
        threshold: speedThreshold,
      });
    }

    // 5. Check for teleportation (large distance, short time)
    // Teleportation = >10km in <1 minute, or >50km in <5 minutes
    if (distance > 10000 && timeDiff < 60) {
      errors.push({
        type: 'teleportation',
        severity: 'error',
        message: `Teleportation detected at point ${i + 1}: ${(distance / 1000).toFixed(
          1
        )} km in ${timeDiff.toFixed(0)} seconds`,
        pointIndex: i + 1,
        value: distance,
      });
    } else if (distance > 50000 && timeDiff < 300) {
      warnings.push({
        type: 'teleportation',
        severity: 'warning',
        message: `Large gap at point ${i + 1}: ${(distance / 1000).toFixed(
          1
        )} km in ${(timeDiff / 60).toFixed(1)} minutes`,
        pointIndex: i + 1,
        value: distance,
      });
    }
  }

  // 6. Warn about suspiciously high speeds (but not impossible)
  const warningThreshold = speedThreshold * 0.8;
  for (let i = 0; i < points.length - 1; i++) {
    const point1 = points[i];
    const point2 = points[i + 1];

    if (point2.time === point1.time) continue;

    const speed = calculateSpeed(point1, point2);

    if (speed > warningThreshold && speed <= speedThreshold) {
      warnings.push({
        type: 'speed',
        severity: 'warning',
        message: `High speed at point ${i + 1}: ${speed.toFixed(1)} km/h`,
        pointIndex: i + 1,
        value: speed,
        threshold: warningThreshold,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get a human-readable summary of validation results
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.isValid && result.warnings.length === 0) {
    return 'Track is valid with no issues detected.';
  }

  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} error${result.errors.length === 1 ? '' : 's'}`);
  }

  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}`);
  }

  return parts.join(', ') + ' detected.';
}
