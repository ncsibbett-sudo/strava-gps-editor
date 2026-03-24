import { describe, it, expect } from 'vitest';
import { generateGPX, estimateGPXSize } from './export';
import { GPSPoint } from '../models/GPSPoint';
import { GPSTrack } from '../models/GPSTrack';

function makeTrack(count: number): GPSTrack {
  const base = new Date('2024-01-01T10:00:00Z');
  const points = Array.from({ length: count }, (_, i) =>
    new GPSPoint(
      40.0 + i * 0.001,
      -105.0 + i * 0.001,
      1000 + i,
      new Date(base.getTime() + i * 60000),
      0
    )
  );
  return new GPSTrack(points, { name: 'Test Run', type: 'Run' });
}

describe('generateGPX', () => {
  it('returns a valid GPX string', () => {
    const track = makeTrack(5);
    const gpx = generateGPX(track);
    expect(gpx).toContain('<?xml version="1.0"');
    expect(gpx).toContain('<gpx');
    expect(gpx).toContain('<trkpt');
    expect(gpx).toContain('</gpx>');
  });

  it('includes all track points', () => {
    const track = makeTrack(10);
    const gpx = generateGPX(track);
    const matches = gpx.match(/<trkpt/g);
    expect(matches).toHaveLength(10);
  });

  it('includes elevation data', () => {
    const track = makeTrack(3);
    const gpx = generateGPX(track);
    expect(gpx).toContain('<ele>');
  });

  it('includes timestamp data', () => {
    const track = makeTrack(3);
    const gpx = generateGPX(track);
    expect(gpx).toContain('<time>');
  });

  it('includes track name', () => {
    const track = makeTrack(3);
    const gpx = generateGPX(track);
    expect(gpx).toContain('Test Run');
  });

  it('generates within 1 second for 50,000 points', () => {
    const track = makeTrack(50000);
    const start = performance.now();
    generateGPX(track);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });
});

describe('estimateGPXSize', () => {
  it('returns a positive number for non-empty track', () => {
    const track = makeTrack(100);
    expect(estimateGPXSize(track)).toBeGreaterThan(0);
  });

  it('scales with point count', () => {
    const small = estimateGPXSize(makeTrack(10));
    const large = estimateGPXSize(makeTrack(100));
    expect(large).toBeGreaterThan(small);
  });
});
