import { create } from 'zustand';
import { GPSTrack } from '../models/GPSTrack';

export type ViewMode = 'original' | 'edited' | 'both';
export type TileLayer = 'streets' | 'satellite' | 'terrain';

interface MapState {
  // Tracks
  originalTrack: GPSTrack | null;
  editedTrack: GPSTrack | null;
  previewTrack: GPSTrack | null;

  // View settings
  viewMode: ViewMode;
  tileLayer: TileLayer;

  // Editing state
  selectedTool: string | null;
  isEditMode: boolean;

  // Edit history for undo/redo
  editHistory: GPSTrack[];
  historyIndex: number;

  // Actions
  loadTrack: (track: GPSTrack) => void;
  setEditedTrack: (track: GPSTrack, addToHistory?: boolean) => void;
  setPreviewTrack: (track: GPSTrack | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setTileLayer: (layer: TileLayer) => void;
  setSelectedTool: (tool: string | null) => void;
  setEditMode: (enabled: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  reset: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  originalTrack: null,
  editedTrack: null,
  previewTrack: null,
  viewMode: 'original',
  tileLayer: 'streets',
  selectedTool: null,
  isEditMode: false,
  editHistory: [],
  historyIndex: -1,

  /**
   * Load original track and set as edited track initially
   */
  loadTrack: (track: GPSTrack) => {
    const clonedTrack = track.clone();
    set({
      originalTrack: track,
      editedTrack: clonedTrack,
      viewMode: 'original',
      editHistory: [clonedTrack],
      historyIndex: 0,
    });
  },

  /**
   * Update edited track and optionally add to history
   */
  setEditedTrack: (track: GPSTrack, addToHistory = true) => {
    if (addToHistory) {
      const { editHistory, historyIndex } = get();
      // Remove any history after current index (when editing after undo)
      const newHistory = editHistory.slice(0, historyIndex + 1);
      // Add new state to history
      newHistory.push(track.clone());
      // Limit history to 50 states
      const limitedHistory = newHistory.slice(-50);

      set({
        editedTrack: track,
        editHistory: limitedHistory,
        historyIndex: limitedHistory.length - 1,
        // Switch to 'both' view to show comparison when an edit is made
        viewMode: 'both',
        // Clear preview when committing
        previewTrack: null,
      });
    } else {
      set({ editedTrack: track });
    }
  },

  /**
   * Set preview track for live preview before applying changes
   */
  setPreviewTrack: (track: GPSTrack | null) => {
    set({
      previewTrack: track,
      // Switch to 'both' view when showing preview
      viewMode: track ? 'both' : get().viewMode,
    });
  },

  /**
   * Set view mode (original, edited, or both)
   */
  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode });
  },

  /**
   * Set tile layer type
   */
  setTileLayer: (layer: TileLayer) => {
    set({ tileLayer: layer });
  },

  /**
   * Set selected editing tool
   */
  setSelectedTool: (tool: string | null) => {
    set({
      selectedTool: tool,
      // Clear preview when changing tools
      previewTrack: null,
    });
  },

  /**
   * Toggle edit mode
   */
  setEditMode: (enabled: boolean) => {
    set({ isEditMode: enabled });
  },

  /**
   * Undo last edit
   */
  undo: () => {
    const { editHistory, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({
        editedTrack: editHistory[newIndex].clone(),
        historyIndex: newIndex,
      });
    }
  },

  /**
   * Redo last undone edit
   */
  redo: () => {
    const { editHistory, historyIndex } = get();
    if (historyIndex < editHistory.length - 1) {
      const newIndex = historyIndex + 1;
      set({
        editedTrack: editHistory[newIndex].clone(),
        historyIndex: newIndex,
      });
    }
  },

  /**
   * Check if undo is available
   */
  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  /**
   * Check if redo is available
   */
  canRedo: () => {
    const { editHistory, historyIndex } = get();
    return historyIndex < editHistory.length - 1;
  },

  /**
   * Reset map state
   */
  reset: () => {
    set({
      originalTrack: null,
      editedTrack: null,
      previewTrack: null,
      viewMode: 'original',
      tileLayer: 'streets',
      selectedTool: null,
      isEditMode: false,
      editHistory: [],
      historyIndex: -1,
    });
  },
}));
