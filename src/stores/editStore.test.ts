import { describe, it, expect, beforeEach } from 'vitest';
import { useEditStore } from './editStore';
import { GPSPoint } from '../models/GPSPoint';
import { GPSTrack } from '../models/GPSTrack';
import type { TrimOperation, SmoothOperation } from '../models/EditOperation';

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

describe('editStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useEditStore.setState({
      manager: null,
      currentTrack: null,
      canUndo: false,
      canRedo: false,
    });
  });

  describe('initEdit', () => {
    it('sets currentTrack to the base track', () => {
      const track = makeTrack(10);
      useEditStore.getState().initEdit(track);
      expect(useEditStore.getState().currentTrack?.points.length).toBe(10);
    });

    it('resets undo/redo state', () => {
      useEditStore.getState().initEdit(makeTrack(10));
      expect(useEditStore.getState().canUndo).toBe(false);
      expect(useEditStore.getState().canRedo).toBe(false);
    });
  });

  describe('applyEdit', () => {
    it('updates currentTrack after applying operation', () => {
      useEditStore.getState().initEdit(makeTrack(10));
      useEditStore.getState().applyEdit(trimOp);
      expect(useEditStore.getState().currentTrack?.points.length).toBe(8);
    });

    it('enables canUndo after applying operation', () => {
      useEditStore.getState().initEdit(makeTrack(10));
      useEditStore.getState().applyEdit(trimOp);
      expect(useEditStore.getState().canUndo).toBe(true);
    });

    it('does nothing when manager is null', () => {
      useEditStore.getState().applyEdit(trimOp);
      expect(useEditStore.getState().currentTrack).toBeNull();
    });
  });

  describe('undo', () => {
    it('reverts track to before operation', () => {
      useEditStore.getState().initEdit(makeTrack(10));
      useEditStore.getState().applyEdit(trimOp);
      useEditStore.getState().undo();
      expect(useEditStore.getState().currentTrack?.points.length).toBe(10);
    });

    it('enables canRedo after undo', () => {
      useEditStore.getState().initEdit(makeTrack(10));
      useEditStore.getState().applyEdit(trimOp);
      useEditStore.getState().undo();
      expect(useEditStore.getState().canRedo).toBe(true);
    });

    it('disables canUndo when back at base', () => {
      useEditStore.getState().initEdit(makeTrack(10));
      useEditStore.getState().applyEdit(trimOp);
      useEditStore.getState().undo();
      expect(useEditStore.getState().canUndo).toBe(false);
    });
  });

  describe('redo', () => {
    it('reapplies the undone operation', () => {
      useEditStore.getState().initEdit(makeTrack(10));
      useEditStore.getState().applyEdit(trimOp);
      useEditStore.getState().undo();
      useEditStore.getState().redo();
      expect(useEditStore.getState().currentTrack?.points.length).toBe(8);
    });

    it('disables canRedo after redo', () => {
      useEditStore.getState().initEdit(makeTrack(10));
      useEditStore.getState().applyEdit(trimOp);
      useEditStore.getState().undo();
      useEditStore.getState().redo();
      expect(useEditStore.getState().canRedo).toBe(false);
    });
  });

  describe('reset', () => {
    it('reverts to base track', () => {
      useEditStore.getState().initEdit(makeTrack(10));
      useEditStore.getState().applyEdit(trimOp);
      useEditStore.getState().applyEdit(smoothOp);
      useEditStore.getState().reset();
      expect(useEditStore.getState().currentTrack?.points.length).toBe(10);
    });

    it('clears canUndo and canRedo', () => {
      useEditStore.getState().initEdit(makeTrack(10));
      useEditStore.getState().applyEdit(trimOp);
      useEditStore.getState().reset();
      expect(useEditStore.getState().canUndo).toBe(false);
      expect(useEditStore.getState().canRedo).toBe(false);
    });
  });

  describe('getCurrentTrack', () => {
    it('returns null before initEdit', () => {
      expect(useEditStore.getState().getCurrentTrack()).toBeNull();
    });

    it('returns current track after operations', () => {
      useEditStore.getState().initEdit(makeTrack(10));
      useEditStore.getState().applyEdit(trimOp);
      const track = useEditStore.getState().getCurrentTrack();
      expect(track?.points.length).toBe(8);
    });
  });

  describe('full workflow', () => {
    it('apply → undo → apply new op clears redo', () => {
      useEditStore.getState().initEdit(makeTrack(10));
      useEditStore.getState().applyEdit(trimOp);
      useEditStore.getState().undo();
      useEditStore.getState().applyEdit(smoothOp);
      expect(useEditStore.getState().canRedo).toBe(false);
      expect(useEditStore.getState().currentTrack?.points.length).toBe(10);
    });
  });
});
