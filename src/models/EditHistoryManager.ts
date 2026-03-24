import { GPSTrack } from './GPSTrack';
import { EditOperation, applyOperation } from './EditOperation';

/**
 * Manages an immutable operation stack for undo/redo.
 *
 * State is computed by replaying all past operations from the base track,
 * so each individual operation stays lightweight and reversible without
 * needing to store full track snapshots.
 */
export class EditHistoryManager {
  private past: EditOperation[] = [];
  private future: EditOperation[] = [];
  private baseTrack: GPSTrack;

  constructor(track: GPSTrack) {
    this.baseTrack = track.clone();
  }

  /** Update the base track and clear all history (call when a new activity is loaded). */
  setBaseTrack(track: GPSTrack): void {
    this.baseTrack = track.clone();
    this.past = [];
    this.future = [];
  }

  /**
   * Record a new operation and clear the redo stack.
   * Returns the updated track after applying the operation.
   */
  addOperation(op: EditOperation): GPSTrack {
    this.past.push(op);
    this.future = [];
    return this.getCurrentTrack();
  }

  /**
   * Undo the last operation.
   * @returns The track after undoing, or null if nothing to undo.
   */
  undo(): GPSTrack | null {
    const op = this.past.pop();
    if (!op) return null;
    this.future.push(op);
    return this.getCurrentTrack();
  }

  /**
   * Redo the last undone operation.
   * @returns The track after redoing, or null if nothing to redo.
   */
  redo(): GPSTrack | null {
    const op = this.future.pop();
    if (!op) return null;
    this.past.push(op);
    return this.getCurrentTrack();
  }

  /** Clear all history, returning to the base track. */
  reset(): void {
    this.past = [];
    this.future = [];
  }

  /** Recompute the current track by replaying all past operations. */
  getCurrentTrack(): GPSTrack {
    let track = this.baseTrack;
    for (const op of this.past) {
      track = applyOperation(track, op);
    }
    return track;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  get pastLength(): number {
    return this.past.length;
  }

  get futureLength(): number {
    return this.future.length;
  }
}
