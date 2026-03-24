import { create } from 'zustand';
import { GPSTrack } from '../models/GPSTrack';
import { EditHistoryManager } from '../models/EditHistoryManager';
import { EditOperation } from '../models/EditOperation';

interface EditState {
  manager: EditHistoryManager | null;
  currentTrack: GPSTrack | null;
  canUndo: boolean;
  canRedo: boolean;

  /** Initialize (or re-initialize) the edit session with a base track. */
  initEdit: (track: GPSTrack) => void;
  /** Apply an operation and advance the history. */
  applyEdit: (operation: EditOperation) => void;
  /** Undo the last operation. */
  undo: () => void;
  /** Redo the last undone operation. */
  redo: () => void;
  /** Reset all edits back to the base track. */
  reset: () => void;
  /** Get the current computed track. */
  getCurrentTrack: () => GPSTrack | null;
}

export const useEditStore = create<EditState>((set, get) => ({
  manager: null,
  currentTrack: null,
  canUndo: false,
  canRedo: false,

  initEdit: (track: GPSTrack) => {
    const manager = new EditHistoryManager(track);
    set({
      manager,
      currentTrack: track.clone(),
      canUndo: false,
      canRedo: false,
    });
  },

  applyEdit: (operation: EditOperation) => {
    const { manager } = get();
    if (!manager) return;
    const updated = manager.addOperation(operation);
    set({
      currentTrack: updated,
      canUndo: manager.canUndo,
      canRedo: manager.canRedo,
    });
  },

  undo: () => {
    const { manager } = get();
    if (!manager) return;
    const result = manager.undo();
    if (result) {
      set({
        currentTrack: result,
        canUndo: manager.canUndo,
        canRedo: manager.canRedo,
      });
    }
  },

  redo: () => {
    const { manager } = get();
    if (!manager) return;
    const result = manager.redo();
    if (result) {
      set({
        currentTrack: result,
        canUndo: manager.canUndo,
        canRedo: manager.canRedo,
      });
    }
  },

  reset: () => {
    const { manager } = get();
    if (!manager) return;
    manager.reset();
    const base = manager.getCurrentTrack();
    set({
      currentTrack: base,
      canUndo: false,
      canRedo: false,
    });
  },

  getCurrentTrack: () => {
    return get().currentTrack;
  },
}));
