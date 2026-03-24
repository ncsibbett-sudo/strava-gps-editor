import { GPSPoint } from './GPSPoint';
import { GPSTrack } from './GPSTrack';
import { trimTrack } from '../utils/trim';
import { applyMovingAverageSmoothing, applyGaussianSmoothing } from '../utils/smoothing';

// ─── Operation type definitions ───────────────────────────────────────────────

export interface TrimOperation {
  type: 'trim';
  startIndex: number;
  endIndex: number;
}

export interface SmoothOperation {
  type: 'smooth';
  algorithm: 'gaussian' | 'moving-average';
  /** Normalised intensity 0-100; mapped to windowSize / sigma internally */
  intensity: number;
  windowSize: number;
}

export interface SpikeRemovalOperation {
  type: 'spike-removal';
  speedThreshold: number;    // m/s
  distanceThreshold: number; // meters
  /** Indices that were detected as spikes at the time of the operation */
  spikesDetected: number[];
  action: 'remove-all' | 'remove-selected';
  /** Subset to remove when action === 'remove-selected' */
  selectedIndices?: number[];
}

export interface RedrawOperation {
  type: 'redraw';
  startIndex: number;
  endIndex: number;
  mode: 'snap-to-road' | 'freehand';
  newPoints: GPSPoint[];
  mixedModes?: { mode: 'snap-to-road' | 'freehand'; points: GPSPoint[] }[];
}

export interface FillGapOperation {
  type: 'fill-gap';
  gapStart: number;
  gapEnd: number;
  filledPoints: GPSPoint[];
}

export type EditOperation =
  | TrimOperation
  | SmoothOperation
  | SpikeRemovalOperation
  | RedrawOperation
  | FillGapOperation;

// ─── Operation application ────────────────────────────────────────────────────

/**
 * Apply a single edit operation to a track, returning the modified track.
 * All operations are non-destructive — they return a new GPSTrack instance.
 */
export function applyOperation(track: GPSTrack, op: EditOperation): GPSTrack {
  switch (op.type) {
    case 'trim':
      return trimTrack(track, op.startIndex, op.endIndex);

    case 'smooth': {
      if (op.algorithm === 'moving-average') {
        return applyMovingAverageSmoothing(track, op.windowSize);
      }
      // gaussian: treat windowSize as sigma
      return applyGaussianSmoothing(track, op.windowSize);
    }

    case 'spike-removal': {
      const indicesToRemove =
        op.action === 'remove-selected' && op.selectedIndices
          ? op.selectedIndices
          : op.spikesDetected;
      return track.removePoints(indicesToRemove);
    }

    case 'redraw':
      return track.replaceSection(op.startIndex, op.endIndex, op.newPoints);

    case 'fill-gap':
      return track.replaceSection(op.gapStart, op.gapEnd, op.filledPoints);

    default: {
      const _exhaustive: never = op;
      throw new Error(`Unknown operation type: ${(_exhaustive as EditOperation).type}`);
    }
  }
}
