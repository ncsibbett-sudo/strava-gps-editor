import { create } from 'zustand';
import { GPSTrack } from '../models/GPSTrack';
import { saveDraft, deleteDraft } from '../services/draftService';
import { analyzeTrack, type TrackIssues } from '../services/issueDetectionService';
import { detectSpikes } from '../utils/spikeDetection';
import { detectGaps } from '../utils/gapDetection';
import { fillGapsInTrack } from '../utils/fillGaps';

export type ViewMode = 'original' | 'edited' | 'both';
export type TileLayer = 'streets' | 'satellite' | 'terrain';

interface MapState {
  // Tracks
  originalTrack: GPSTrack | null;
  editedTrack: GPSTrack | null;
  previewTrack: GPSTrack | null;

  // Active activity id (for draft persistence)
  activityId: number | null;

  // View settings
  viewMode: ViewMode;
  tileLayer: TileLayer;

  // Editing state
  selectedTool: string | null;
  isEditMode: boolean;

  // Edit history for undo/redo
  editHistory: GPSTrack[];
  historyIndex: number;

  // Auto-detected issues for the current track
  detectedIssues: TrackIssues | null;

  // Hover state for elevation chart sync
  hoveredPointIndex: number | null;

  // Actions
  loadTrack: (track: GPSTrack, activityId?: number | null) => void;
  setEditedTrack: (track: GPSTrack, addToHistory?: boolean) => void;
  setPreviewTrack: (track: GPSTrack | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setTileLayer: (layer: TileLayer) => void;
  setSelectedTool: (tool: string | null) => void;
  setEditMode: (enabled: boolean) => void;
  setHoveredPointIndex: (index: number | null) => void;
  autoFix: () => void;
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
  activityId: null,
  viewMode: 'original',
  tileLayer: 'streets',
  selectedTool: null,
  isEditMode: false,
  editHistory: [],
  historyIndex: -1,
  hoveredPointIndex: null,
  detectedIssues: null,

  /**
   * Load original track and set as edited track initially
   */
  loadTrack: (track: GPSTrack, activityId: number | null = null) => {
    const clonedTrack = track.clone();
    const detectedIssues = analyzeTrack(track);
    set({
      originalTrack: track,
      editedTrack: clonedTrack,
      activityId,
      viewMode: 'original',
      editHistory: [clonedTrack],
      historyIndex: 0,
      detectedIssues,
    });
  },

  /**
   * Update edited track and optionally add to history
   */
  setEditedTrack: (track: GPSTrack, addToHistory = true) => {
    if (addToHistory) {
      const { editHistory, historyIndex, originalTrack, activityId } = get();
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

      // Auto-save draft to IndexedDB
      if (activityId !== null && originalTrack) {
        saveDraft(activityId, originalTrack, track).catch((err) =>
          console.warn('Failed to save draft:', err)
        );
      }
    } else {
      set({ editedTrack: track });
    }
  },

  /**
   * Set preview track for live preview before applying changes.
   * Debounced at 60ms so rapid slider moves don't flood the renderer.
   */
  setPreviewTrack: (() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (track: GPSTrack | null) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        set({ previewTrack: track, viewMode: track ? 'both' : get().viewMode });
      }, 60);
    };
  })(),

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
   * Set hovered point index (syncs elevation chart with map)
   */
  setHoveredPointIndex: (index: number | null) => {
    set({ hoveredPointIndex: index });
  },

  /**
   * Auto-fix all detected issues: remove spikes, then fill gaps.
   * Does not fix elevation (requires external API — user does that manually).
   */
  autoFix: () => {
    const { editedTrack } = get();
    if (!editedTrack) return;

    let fixed = editedTrack;

    // 1. Remove spikes
    const { indices } = detectSpikes(fixed.points);
    if (indices.length > 0) {
      fixed = fixed.removePoints(indices);
    }

    // 2. Fill gaps (30s threshold)
    const gaps = detectGaps(fixed, { minTimeDelta: 30 });
    if (gaps.length > 0) {
      fixed = fillGapsInTrack(fixed, gaps);
    }

    if (fixed !== editedTrack) {
      // Reanalyze after fix
      const detectedIssues = analyzeTrack(fixed);
      const { editHistory, historyIndex, activityId, originalTrack } = get();
      const newHistory = [...editHistory.slice(0, historyIndex + 1), fixed.clone()].slice(-50);
      set({
        editedTrack: fixed,
        editHistory: newHistory,
        historyIndex: newHistory.length - 1,
        viewMode: 'both',
        previewTrack: null,
        detectedIssues,
      });
      if (activityId !== null && originalTrack) {
        saveDraft(activityId, originalTrack, fixed).catch(() => {});
      }
    }
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
   * Reset map state and discard any saved draft
   */
  reset: () => {
    const { activityId } = get();
    if (activityId !== null) {
      deleteDraft(activityId).catch((err) => console.warn('Failed to delete draft:', err));
    }
    set({
      originalTrack: null,
      editedTrack: null,
      previewTrack: null,
      activityId: null,
      viewMode: 'original',
      tileLayer: 'streets',
      selectedTool: null,
      isEditMode: false,
      editHistory: [],
      historyIndex: -1,
      detectedIssues: null,
      hoveredPointIndex: null,
    });
  },
}));
