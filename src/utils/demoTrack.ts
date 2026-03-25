import { GPSTrack } from '../models/GPSTrack';
import { GPSPoint } from '../models/GPSPoint';

/**
 * Generates a synthetic "problematic" GPS track for demo/practice purposes.
 * The track is a ~4 km loop with intentional GPS issues:
 *   - A speed spike (one point jumps ~300 m off-route)
 *   - A data gap (30-second jump with missing points)
 *   - Slightly incorrect elevation (flat then sudden jump)
 */
export function createDemoTrack(): GPSTrack {
  const points: GPSPoint[] = [];

  // Base location: a park loop in San Francisco (Golden Gate Park area)
  const baseLat = 37.7694;
  const baseLng = -122.4862;
  const startTime = new Date('2024-06-15T09:00:00Z');

  // Helper to add a point
  const addPoint = (
    lat: number,
    lng: number,
    elev: number,
    secondsOffset: number
  ) => {
    const t = new Date(startTime.getTime() + secondsOffset * 1000);
    points.push(new GPSPoint(lat, lng, elev, t));
  };

  // Segment 1: heading east ~1 km (normal, good GPS, ~6 min/km pace)
  const seg1Count = 60;
  for (let i = 0; i < seg1Count; i++) {
    const t = i * 6; // ~6 seconds apart
    const lat = baseLat + (i / seg1Count) * 0.0005;
    const lng = baseLng + (i / seg1Count) * 0.009;
    const elev = 25 + Math.sin(i / 10) * 3;
    addPoint(lat, lng, elev, t);
  }

  // GPS SPIKE: one point jumps ~300 m off-route
  const spikeT = seg1Count * 6 + 6;
  addPoint(baseLat + 0.0005 + 0.003, baseLng + 0.009 + 0.0015, 25, spikeT); // spike!
  addPoint(
    baseLat + 0.0005 + (1 / seg1Count) * 0.0005,
    baseLng + 0.009 + (1 / seg1Count) * 0.009,
    25,
    spikeT + 6
  ); // back on track

  // Segment 2: turn north ~500 m (good GPS)
  const seg2Count = 30;
  const seg2Start = spikeT + 12;
  for (let i = 0; i < seg2Count; i++) {
    const t = seg2Start + i * 6;
    const lat = baseLat + 0.0005 + 0.0005 + (i / seg2Count) * 0.004;
    const lng = baseLng + 0.009 + 0.0001;
    const elev = 28 + (i / seg2Count) * 8; // slight uphill
    addPoint(lat, lng, elev, t);
  }

  // DATA GAP: jump 30 seconds with ~400 m of missing track
  const gapEndT = seg2Start + seg2Count * 6 + 30;
  addPoint(
    baseLat + 0.0005 + 0.0005 + 0.004 + 0.0035,
    baseLng + 0.009 + 0.0001 + 0.001,
    36,
    gapEndT
  );

  // Segment 3: heading west back toward start (good GPS)
  const seg3Count = 60;
  const seg3Start = gapEndT + 6;
  const seg3StartLat = baseLat + 0.0005 + 0.0005 + 0.004 + 0.0035;
  const seg3StartLng = baseLng + 0.009 + 0.0001 + 0.001;
  for (let i = 0; i < seg3Count; i++) {
    const t = seg3Start + i * 6;
    const lat = seg3StartLat - (i / seg3Count) * 0.0055;
    const lng = seg3StartLng - (i / seg3Count) * 0.011;
    const elev = 36 - (i / seg3Count) * 11; // downhill back
    addPoint(lat, lng, elev, t);
  }

  // ELEVATION SPIKE: sudden bad elevation reading
  const elevSpikeIdx = Math.floor(points.length * 0.85);
  if (elevSpikeIdx < points.length) {
    const p = points[elevSpikeIdx];
    points[elevSpikeIdx] = new GPSPoint(p.lat, p.lng, 180, p.time); // absurd elevation
  }

  // Final segment: back to start
  const seg4Count = 20;
  const seg4Start = seg3Start + seg3Count * 6;
  const lastGood = points[points.length - 1];
  for (let i = 1; i <= seg4Count; i++) {
    const t = seg4Start + i * 6;
    const lat = lastGood.lat + (baseLat - lastGood.lat) * (i / seg4Count);
    const lng = lastGood.lng + (baseLng - lastGood.lng) * (i / seg4Count);
    const elev = 25 + Math.sin(i / 5) * 2;
    addPoint(lat, lng, elev, t);
  }

  return new GPSTrack(points, {
    name: 'Demo Run (with GPS issues)',
    type: 'Run',
    startTime,
    endTime: points[points.length - 1].time,
  });
}
