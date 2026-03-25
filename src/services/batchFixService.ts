import { stravaService } from './stravaService';
import { streamsToTrack } from '../utils/strava';
import { detectSpikes } from '../utils/spikeDetection';
import { detectGaps } from '../utils/gapDetection';
import { fillGapsInTrack } from '../utils/fillGaps';
import { generateGPX } from '../utils/export';
import type { StravaActivity } from '../types/strava';
import type { GPSTrack } from '../models/GPSTrack';

export interface BatchFixResult {
  activityId: number;
  activityName: string;
  status: 'success' | 'skipped' | 'error';
  spikesRemoved?: number;
  gapsFilled?: number;
  newActivityId?: number;
  error?: string;
}

export interface BatchFixProgress {
  total: number;
  completed: number;
  current: string | null;
  results: BatchFixResult[];
}

export type ProgressCallback = (progress: BatchFixProgress) => void;

/**
 * Fix and re-upload a batch of Strava activities.
 * For each activity: fetch GPS streams → remove spikes → fill gaps → upload new → copy metadata → optionally delete original.
 * Processes sequentially to respect Strava rate limits.
 */
export async function batchFixActivities(
  activities: StravaActivity[],
  deleteOriginals: boolean,
  onProgress: ProgressCallback,
  signal?: AbortSignal
): Promise<BatchFixResult[]> {
  const results: BatchFixResult[] = [];

  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];

    if (signal?.aborted) break;

    onProgress({
      total: activities.length,
      completed: i,
      current: activity.name,
      results,
    });

    const result = await fixSingleActivity(activity, deleteOriginals);
    results.push(result);
  }

  onProgress({
    total: activities.length,
    completed: activities.length,
    current: null,
    results,
  });

  return results;
}

async function fixSingleActivity(
  activity: StravaActivity,
  deleteOriginal: boolean
): Promise<BatchFixResult> {
  try {
    // Fetch GPS streams
    const streams = await stravaService.fetchActivityStreams(activity.id);

    if (!streams.latlng?.data?.length) {
      return { activityId: activity.id, activityName: activity.name, status: 'skipped', error: 'No GPS data' };
    }

    // Convert to GPSTrack
    let track: GPSTrack = streamsToTrack(
      {
        latlng: { data: streams.latlng.data as [number, number][] },
        altitude: streams.altitude ? { data: streams.altitude.data as number[] } : undefined,
        time: streams.time ? { data: streams.time.data as number[] } : undefined,
        distance: streams.distance ? { data: streams.distance.data as number[] } : undefined,
      },
      { name: activity.name, type: activity.type, startTime: new Date(activity.start_date) }
    );

    // Remove spikes
    const { indices } = detectSpikes(track.points);
    if (indices.length > 0) track = track.removePoints(indices);

    // Fill gaps
    const gaps = detectGaps(track, { minTimeDelta: 30 });
    if (gaps.length > 0) track = fillGapsInTrack(track, gaps);

    if (indices.length === 0 && gaps.length === 0) {
      return { activityId: activity.id, activityName: activity.name, status: 'skipped', spikesRemoved: 0, gapsFilled: 0 };
    }

    // Generate and upload GPX
    const gpxContent = generateGPX(track);
    const uploadResult = await stravaService.uploadActivity(gpxContent, activity.name, undefined, activity.type.toLowerCase());
    const pollResult = await stravaService.pollUploadStatus(uploadResult.id);

    if (!pollResult.activity_id) {
      throw new Error(pollResult.error ?? 'Upload processing failed');
    }

    // Copy metadata from original to new activity
    const detailed = await stravaService.fetchActivityMetadata(activity.id);
    await stravaService.updateActivity(pollResult.activity_id, {
      name: detailed.name,
      type: detailed.type,
      description: detailed.description ?? undefined,
    });

    // Optionally delete original
    if (deleteOriginal) {
      await stravaService.deleteActivity(activity.id);
    }

    return {
      activityId: activity.id,
      activityName: activity.name,
      status: 'success',
      spikesRemoved: indices.length,
      gapsFilled: gaps.length,
      newActivityId: pollResult.activity_id,
    };
  } catch (err) {
    return {
      activityId: activity.id,
      activityName: activity.name,
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
