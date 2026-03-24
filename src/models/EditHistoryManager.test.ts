import { describe, it, expect, beforeEach } from 'vitest';
import { EditHistoryManager } from './EditHistoryManager';
import { GPSPoint } from './GPSPoint';
import { GPSTrack } from './GPSTrack';
import type { TrimOperation, SmoothOperation, SpikeRemovalOperation } from './EditOperation';

function makeTrack(count: number): GPSTrack {
  const base = new Date('2024-01-01T10:00:00Z');
  const points = Array.from({ length: count }, (_, i) =>
    new GPSPoint(40.0 + i * 0.0008, -105.0, 1000, new Date(base.getTime() + i * 60000), 0)
  );
  return new GPSTrack(points);
}

const trimOp: TrimOperation = { type: 'trim', startIndex: 1, endIndex: 8 };
const smoothOp: SmoothOperation = {
  type: 'smooth',
  algorithm: 'moving-average',
  intensity: 50,
  windowSize: 3,
};
const spikeOp: SpikeRemovalOperation = {
  type: 'spike-removal',
  speedThreshold: 22,
  distanceThreshold: 100,
  spikesDetected: [],
  action: 'remove-all',
};

describe('EditHistoryManager', () => {
  let manager: EditHistoryManager;

  beforeEach(() => {
    manager = new EditHistoryManager(makeTrack(10));
  });

  describe('initial state', () => {
    it('canUndo is false initially', () => {
      expect(manager.canUndo).toBe(false);
    });

    it('canRedo is false initially', () => {
      expect(manager.canRedo).toBe(false);
    });

    it('returns base track from getCurrentTrack', () => {
      const track = manager.getCurrentTrack();
      expect(track.points.length).toBe(10);
    });
  });

  describe('addOperation', () => {
    it('returns modified track after trim', () => {
      const result = manager.addOperation(trimOp);
      // trim 1–8 → 8 points
      expect(result.points.length).toBe(8);
    });

    it('enables undo after adding operation', () => {
      manager.addOperation(trimOp);
      expect(manager.canUndo).toBe(true);
    });

    it('clears redo stack when adding new operation', () => {
      manager.addOperation(trimOp);
      manager.undo();
      expect(manager.canRedo).toBe(true);
      manager.addOperation(smoothOp);
      expect(manager.canRedo).toBe(false);
    });

    it('tracks past length correctly', () => {
      manager.addOperation(trimOp);
      manager.addOperation(smoothOp);
      expect(manager.pastLength).toBe(2);
    });
  });

  describe('undo', () => {
    it('returns null when nothing to undo', () => {
      expect(manager.undo()).toBeNull();
    });

    it('restores track to state before operation', () => {
      const original = manager.getCurrentTrack();
      manager.addOperation(trimOp);
      manager.undo();
      const restored = manager.getCurrentTrack();
      expect(restored.points.length).toBe(original.points.length);
    });

    it('enables redo after undo', () => {
      manager.addOperation(trimOp);
      manager.undo();
      expect(manager.canRedo).toBe(true);
    });

    it('disables undo when back at base', () => {
      manager.addOperation(trimOp);
      manager.undo();
      expect(manager.canUndo).toBe(false);
    });
  });

  describe('redo', () => {
    it('returns null when nothing to redo', () => {
      expect(manager.redo()).toBeNull();
    });

    it('reapplies the undone operation', () => {
      manager.addOperation(trimOp);
      const afterTrim = manager.getCurrentTrack().points.length;
      manager.undo();
      manager.redo();
      expect(manager.getCurrentTrack().points.length).toBe(afterTrim);
    });

    it('disables redo after redo', () => {
      manager.addOperation(trimOp);
      manager.undo();
      manager.redo();
      expect(manager.canRedo).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears all history', () => {
      manager.addOperation(trimOp);
      manager.addOperation(smoothOp);
      manager.reset();
      expect(manager.canUndo).toBe(false);
      expect(manager.canRedo).toBe(false);
      expect(manager.pastLength).toBe(0);
    });

    it('getCurrentTrack returns base track after reset', () => {
      manager.addOperation(trimOp);
      manager.reset();
      expect(manager.getCurrentTrack().points.length).toBe(10);
    });
  });

  describe('setBaseTrack', () => {
    it('updates base track and clears history', () => {
      manager.addOperation(trimOp);
      manager.setBaseTrack(makeTrack(20));
      expect(manager.canUndo).toBe(false);
      expect(manager.getCurrentTrack().points.length).toBe(20);
    });
  });

  describe('operation stacking', () => {
    it('applies operations in order', () => {
      // trim to 8 points, then smooth
      manager.addOperation(trimOp);
      manager.addOperation(smoothOp);
      const track = manager.getCurrentTrack();
      expect(track.points.length).toBe(8);
    });

    it('no-op spike removal with empty list leaves track unchanged', () => {
      const before = manager.getCurrentTrack().points.length;
      manager.addOperation(spikeOp);
      expect(manager.getCurrentTrack().points.length).toBe(before);
    });
  });
});
