import { create } from 'zustand';
import { GPSTrack } from '../models/GPSTrack';

export type ViewMode = 'original' | 'edited' | 'both';
export type TileLayer = 'streets' | 'satellite' | 'terrain';

interface MapState {
  // Tracks
  originalTrack: GPSTrack | null;
  editedTrack: GPSTrack | null;

  // View settings
  viewMode: ViewMode;
  tileLayer: TileLayer;

  // Editing state
  selectedTool: string | null;
  isEditMode: boolean;

  // Actions
  loadTrack: (track: GPSTrack) => void;
  setEditedTrack: (track: GPSTrack) => void;
  setViewMode: (mode: ViewMode) => void;
  setTileLayer: (layer: TileLayer) => void;
  setSelectedTool: (tool: string | null) => void;
  setEditMode: (enabled: boolean) => void;
  reset: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  // Initial state
  originalTrack: null,
  editedTrack: null,
  viewMode: 'original',
  tileLayer: 'streets',
  selectedTool: null,
  isEditMode: false,

  /**
   * Load original track and set as edited track initially
   */
  loadTrack: (track: GPSTrack) => {
    set({
      originalTrack: track,
      editedTrack: track.clone(),
      viewMode: 'original',
    });
  },

  /**
   * Update edited track
   */
  setEditedTrack: (track: GPSTrack) => {
    set({ editedTrack: track });
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
    set({ selectedTool: tool });
  },

  /**
   * Toggle edit mode
   */
  setEditMode: (enabled: boolean) => {
    set({ isEditMode: enabled });
  },

  /**
   * Reset map state
   */
  reset: () => {
    set({
      originalTrack: null,
      editedTrack: null,
      viewMode: 'original',
      tileLayer: 'streets',
      selectedTool: null,
      isEditMode: false,
    });
  },
}));
