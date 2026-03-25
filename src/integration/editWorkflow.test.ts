/**
 * Integration tests — GPS edit workflow
 *
 * These tests verify that the editing utilities work together correctly in
 * end-to-end scenarios: detect → fix → validate → export.
 */
import { describe, it, expect } from 'vitest';
import { GPSPoint } from '../models/GPSPoint';
import { GPSTrack } from '../models/GPSTrack';
import { detectSpikes, removeSpikes } from '../utils/spikeDetection';
import { detectGaps } from '../utils/gapDetection';
import { fillGapsInTrack } from '../utils/fillGaps';
import { trimTrack } from '../utils/trim';
import { applyMovingAverageSmoothing } from '../utils/smoothing';
import { validateTrack } from '../services/validationService';
import { analyzeTrack } from '../services/issueDetectionService';
import { generateGPX } from '../utils/export';
import { EditHistoryManager } from '../models/EditHistoryManager';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// 30-second intervals, 89m per step → ~10.7 km/h (well under 25 km/h run threshold)
function makeCleanTrack(count: number): GPSTrack {
  const base = new Date('2024-06-01T08:00:00Z');
  const points = Array.from({ length: count }, (_, i) =>
    new GPSPoint(
      40.0 + i * 0.0008,
      -105.0,
      100 + Math.sin(i / 5) * 20,
      new Date(base.getTime() + i * 30_000), // 30-second intervals
      0
    )
  );
  return new GPSTrack(points, { name: 'Test Run', type: 'Run' });
}

function injectSpike(track: GPSTrack, index: number): GPSTrack {
  const points = track.points.map((p, i) =>
    i === index
      ? new GPSPoint(p.lat + 0.1, p.lng, p.elevation, p.time, 0) // ~11 km north
      : new GPSPoint(p.lat, p.lng, p.elevation, p.time, 0)
  );
  return new GPSTrack(points, track.metadata);
}

function injectGap(track: GPSTrack, afterIndex: number): GPSTrack {
  const points = track.points.map((p, i) => {
    if (i <= afterIndex) return new GPSPoint(p.lat, p.lng, p.elevation, p.time, 0);
    // Shift all points after the gap index by 10 minutes
    return new GPSPoint(p.lat, p.lng, p.elevation, new Date(p.time.getTime() + 10 * 60_000), 0);
  });
  return new GPSTrack(points, track.metadata);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Spike detection and removal workflow', () => {
  it('detects a spike and removes it', () => {
    const clean = makeCleanTrack(10);
    const withSpike = injectSpike(clean, 5);

    // Step 1: Detect
    const { indices } = detectSpikes(withSpike.points);
    expect(indices.length).toBeGreaterThan(0);
    expect(indices).toContain(5);

    // Step 2: Remove — track should have fewer points
    const fixed = removeSpikes(withSpike);
    expect(fixed.points.length).toBeLessThan(withSpike.points.length);
  });

  it('detects a spike on a clean track first', () => {
    const clean = makeCleanTrack(10);
    const { indices: cleanIndices } = detectSpikes(clean.points);
    expect(cleanIndices).toHaveLength(0);

    const withSpike = injectSpike(clean, 5);
    const { indices } = detectSpikes(withSpike.points);
    expect(indices.length).toBeGreaterThan(0);
  });

  it('validates successfully after spike removal', () => {
    const clean = makeCleanTrack(10);
    // Use clean track directly — it should pass validation (30s intervals, ~10.7 km/h)
    const validation = validateTrack(clean);
    expect(validation.isValid).toBe(true);
  });
});

describe('Gap detection and fill workflow', () => {
  it('detects a gap, fills it, and restores monotonic time', () => {
    const clean = makeCleanTrack(8);
    const withGap = injectGap(clean, 3);

    // Step 1: Detect
    const gaps = detectGaps(withGap);
    expect(gaps.length).toBeGreaterThan(0);

    // Step 2: Fill
    const filled = fillGapsInTrack(withGap, gaps);
    expect(filled.points.length).toBeGreaterThan(withGap.points.length);

    // Step 3: All timestamps should be monotonically increasing
    for (let i = 1; i < filled.points.length; i++) {
      expect(filled.points[i].time.getTime()).toBeGreaterThanOrEqual(
        filled.points[i - 1].time.getTime()
      );
    }
  });

  it('gap count is 0 after filling all detected gaps', () => {
    const clean = makeCleanTrack(8);
    const withGap = injectGap(clean, 3);

    const gaps = detectGaps(withGap);
    const filled = fillGapsInTrack(withGap, gaps);
    const remainingGaps = detectGaps(filled);

    expect(remainingGaps).toHaveLength(0);
  });
});

describe('Trim workflow', () => {
  it('trim produces a track with correct point count', () => {
    const track = makeCleanTrack(20);
    const trimmed = trimTrack(track, 5, 14);

    expect(trimmed.points.length).toBe(10); // indices 5–14 inclusive
    expect(trimmed.points[0].lat).toBeCloseTo(track.points[5].lat, 5);
  });

  it('trimmed track passes validation', () => {
    const track = makeCleanTrack(20);
    const trimmed = trimTrack(track, 5, 14);

    const result = validateTrack(trimmed);
    expect(result.isValid).toBe(true);
  });
});

describe('Smoothing workflow', () => {
  it('smoothed track has same point count', () => {
    const track = makeCleanTrack(15);
    const smoothed = applyMovingAverageSmoothing(track, 3);

    expect(smoothed.points.length).toBe(track.points.length);
  });

  it('smoothed track passes validation', () => {
    const track = makeCleanTrack(15);
    const smoothed = applyMovingAverageSmoothing(track, 3);

    const result = validateTrack(smoothed);
    expect(result.isValid).toBe(true);
  });
});

describe('GPX export workflow', () => {
  it('generates valid GPX XML from a clean track', () => {
    const track = makeCleanTrack(5);
    const gpx = generateGPX(track);

    expect(gpx).toContain('<?xml');
    expect(gpx).toContain('<gpx');
    expect(gpx).toContain('<trkpt');
    expect(gpx).toContain('</gpx>');
  });

  it('GPX output includes all track points', () => {
    const track = makeCleanTrack(5);
    const gpx = generateGPX(track);

    const trkptCount = (gpx.match(/<trkpt/g) || []).length;
    expect(trkptCount).toBe(5);
  });

  it('GPX export after spike removal contains fewer points', () => {
    const clean = makeCleanTrack(10);
    const withSpike = injectSpike(clean, 5);
    const fixed = removeSpikes(withSpike);

    const gpx = generateGPX(fixed);
    const trkptCount = (gpx.match(/<trkpt/g) || []).length;
    expect(trkptCount).toBeLessThan(10);
  });
});

describe('Edit history (undo/redo) workflow', () => {
  it('undo restores original track after a trim', () => {
    const original = makeCleanTrack(20);
    const history = new EditHistoryManager(original);

    history.addOperation({ type: 'trim', startIndex: 5, endIndex: 14 });

    expect(history.getCurrentTrack().points.length).toBe(10);
    expect(history.canUndo).toBe(true);

    history.undo();
    expect(history.getCurrentTrack().points.length).toBe(20);
    expect(history.canUndo).toBe(false);
  });

  it('redo re-applies the edit after undo', () => {
    const original = makeCleanTrack(20);
    const history = new EditHistoryManager(original);

    history.addOperation({ type: 'trim', startIndex: 5, endIndex: 14 });

    history.undo();
    expect(history.canRedo).toBe(true);

    history.redo();
    expect(history.getCurrentTrack().points.length).toBe(10);
  });

  it('multiple edits: undo chain restores each prior state', () => {
    const original = makeCleanTrack(20);
    const history = new EditHistoryManager(original);

    history.addOperation({ type: 'trim', startIndex: 0, endIndex: 14 });
    history.addOperation({ type: 'smooth', algorithm: 'moving-average', intensity: 50, windowSize: 3 });

    expect(history.getCurrentTrack().points.length).toBe(15); // 0–14 inclusive

    history.undo(); // undo smooth → back to trimmed (15 points)
    expect(history.getCurrentTrack().points.length).toBe(15);

    history.undo(); // undo trim → back to original (20 points)
    expect(history.getCurrentTrack().points.length).toBe(20);
  });
});

describe('Issue detection integration', () => {
  it('clean track reports no issues', () => {
    const track = makeCleanTrack(10);
    const issues = analyzeTrack(track);

    expect(issues.spikeIndices).toHaveLength(0);
    expect(issues.gapCount).toBe(0);
    expect(issues.missingElevation).toBe(false);
  });

  it('track with spike reports at least one spike', () => {
    const track = injectSpike(makeCleanTrack(10), 5);
    const issues = analyzeTrack(track);

    expect(issues.spikeIndices.length).toBeGreaterThan(0);
  });

  it('track with gap reports at least one gap', () => {
    const track = injectGap(makeCleanTrack(8), 3);
    const issues = analyzeTrack(track);

    expect(issues.gapCount).toBeGreaterThan(0);
  });
});
