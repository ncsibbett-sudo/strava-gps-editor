import { FitEncoder, Message, FitMessages, FitConstants } from 'fit-encoder';
import type { GPSTrack } from '../models/GPSTrack';

/** Convert decimal degrees to FIT semicircles (sint32) */
const SEMICIRCLES_PER_DEGREE = Math.pow(2, 31) / 180;
function toSemicircles(degrees: number): number {
  return Math.round(degrees * SEMICIRCLES_PER_DEGREE);
}

/** Convert meters to FIT altitude raw value (scale=5, offset=-500) */
function toFitAltitude(meters: number): number {
  return Math.round((meters + 500) * 5);
}

/** Convert meters to FIT distance raw value (scale=100) */
function toFitDistance(meters: number): number {
  return Math.round(meters * 100);
}

/** Map Strava activity type to FIT sport constant */
function stravaTypeToFitSport(activityType: string): number {
  const t = activityType.toLowerCase();
  if (t === 'run') return FitConstants.sport.running;
  if (t === 'ride' || t === 'virtualride' || t === 'ebikeride' ||
      t === 'mountainbikeride' || t === 'gravelride') return FitConstants.sport.cycling;
  if (t === 'hike') return FitConstants.sport.hiking;
  if (t === 'walk') return FitConstants.sport.walking;
  if (t === 'swim') return FitConstants.sport.swimming;
  if (t.includes('ski') || t.includes('snowboard')) return FitConstants.sport.alpine_skiing;
  return FitConstants.sport.generic;
}

/**
 * Generate a FIT file ArrayBuffer from a GPS track.
 * Produces a valid activity FIT file compatible with Garmin Connect and Wahoo.
 */
export function generateFIT(track: GPSTrack): ArrayBufferLike {
  // Creating a new FitEncoder resets the shared static Message buffer
  const encoder = new FitEncoder();

  const firstPoint = track.points[0];
  const lastPoint = track.points[track.points.length - 1];
  const startDate = firstPoint?.time ?? new Date();
  const endDate = lastPoint?.time ?? new Date();
  const startFit = FitEncoder.toFitTimestamp(startDate);
  const endFit = FitEncoder.toFitTimestamp(endDate);
  const durationSec = Math.max(0, endFit - startFit);
  const sport = stravaTypeToFitSport(track.metadata.type);

  // ── File ID ────────────────────────────────────────────────────────────────
  const fileIdMsg = new Message(
    FitConstants.mesg_num.file_id,
    FitMessages.file_id,
    'time_created', 'manufacturer', 'product', 'type'
  );
  fileIdMsg.writeDataMessage(
    startFit,
    FitConstants.manufacturer.garmin,
    0,
    FitConstants.file.activity
  );

  // ── Event: timer start ────────────────────────────────────────────────────
  const eventMsg = new Message(
    FitConstants.mesg_num.event,
    FitMessages.event,
    'timestamp', 'data', 'event', 'event_type'
  );
  eventMsg.writeDataMessage(
    startFit, 0,
    FitConstants.event.timer,
    FitConstants.event_type.start
  );

  // ── Sport ─────────────────────────────────────────────────────────────────
  const sportMsg = new Message(
    FitConstants.mesg_num.sport,
    FitMessages.sport,
    'sport', 'sub_sport'
  );
  sportMsg.writeDataMessage(sport, FitConstants.sub_sport.generic);

  // ── Records (one per GPS point) ───────────────────────────────────────────
  const recordMsg = new Message(
    FitConstants.mesg_num.record,
    FitMessages.record,
    'timestamp', 'position_lat', 'position_long', 'altitude', 'distance'
  );

  track.points.forEach((point, index) => {
    const ts = point.time ? FitEncoder.toFitTimestamp(point.time) : startFit + index;
    recordMsg.writeDataMessage(
      ts,
      toSemicircles(point.lat),
      toSemicircles(point.lng),
      toFitAltitude(point.elevation ?? 0),
      toFitDistance(point.distance)
    );
  });

  // ── Event: timer stop ─────────────────────────────────────────────────────
  eventMsg.writeDataMessage(
    endFit, 0,
    FitConstants.event.timer,
    FitConstants.event_type.stop_all
  );

  // ── Session ───────────────────────────────────────────────────────────────
  const sessionMsg = new Message(
    FitConstants.mesg_num.session,
    FitMessages.session,
    'timestamp', 'start_time',
    'total_elapsed_time', 'total_timer_time', 'total_distance',
    'event', 'event_type', 'sport', 'sub_sport'
  );
  sessionMsg.writeDataMessage(
    endFit,
    startFit,
    durationSec * 1000, // scale=1000
    durationSec * 1000,
    toFitDistance(track.totalDistance),
    FitConstants.event.session,
    FitConstants.event_type.stop,
    sport,
    FitConstants.sub_sport.generic
  );

  // ── Activity ──────────────────────────────────────────────────────────────
  const activityMsg = new Message(
    FitConstants.mesg_num.activity,
    FitMessages.activity,
    'total_timer_time', 'local_timestamp', 'num_sessions', 'type', 'event', 'event_type'
  );
  activityMsg.writeDataMessage(
    durationSec * 1000,
    startFit,
    1,
    FitConstants.activity.manual,
    FitConstants.event.activity,
    FitConstants.event_type.stop
  );

  return encoder.getFile();
}

/**
 * Trigger a browser download of the GPS track as a .fit file.
 */
export function downloadFIT(track: GPSTrack, filename: string = 'activity'): void {
  const buffer = generateFIT(track) as ArrayBuffer;
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.fit') ? filename : `${filename}.fit`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
