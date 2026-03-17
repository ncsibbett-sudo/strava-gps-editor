import { useState, useEffect } from 'react';
import { useMap } from '../../../hooks/useMap';
import { GPSPoint } from '../../../models/GPSPoint';
import { Gap } from '../../../models/GPSTrack';

/**
 * Fill Gap tool - detects and fills GPS gaps
 */
export function FillGapTool() {
  const { editedTrack, setEditedTrack } = useMap();
  const [minGapTime, setMinGapTime] = useState(30); // seconds
  const [detectedGaps, setDetectedGaps] = useState<Gap[]>([]);

  useEffect(() => {
    if (editedTrack) {
      const gaps = editedTrack.detectGaps(minGapTime);
      setDetectedGaps(gaps);
    }
  }, [editedTrack, minGapTime]);

  if (!editedTrack) return null;

  const handleFillGaps = () => {
    if (!editedTrack || detectedGaps.length === 0) return;

    // Fill gaps by interpolating points between gap start and end
    const filledTrack = editedTrack.clone();
    let offset = 0; // Track offset as we add points

    detectedGaps.forEach((gap) => {
      const startIdx = gap.startIndex + offset;
      const endIdx = gap.endIndex + offset;

      if (startIdx >= filledTrack.points.length - 1 || endIdx >= filledTrack.points.length) {
        return;
      }

      const startPoint = filledTrack.points[startIdx];
      const endPoint = filledTrack.points[endIdx];

      // Calculate number of interpolated points based on gap duration
      // Roughly 1 point per 5 seconds
      const numPoints = Math.max(2, Math.floor(gap.timeDelta / 5));

      const interpolatedPoints: GPSPoint[] = [];

      for (let i = 1; i < numPoints; i++) {
        const ratio = i / numPoints;
        const lat = startPoint.lat + (endPoint.lat - startPoint.lat) * ratio;
        const lng = startPoint.lng + (endPoint.lng - startPoint.lng) * ratio;
        const elevation = startPoint.elevation + (endPoint.elevation - startPoint.elevation) * ratio;
        const time = new Date(
          startPoint.time.getTime() + (endPoint.time.getTime() - startPoint.time.getTime()) * ratio
        );

        interpolatedPoints.push(new GPSPoint(lat, lng, elevation, time, 0));
      }

      // Insert interpolated points
      filledTrack.points.splice(endIdx, 0, ...interpolatedPoints);
      offset += interpolatedPoints.length;
    });

    setEditedTrack(filledTrack, true);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-white mb-4">Fill GPS Gaps</h3>

      <div className="space-y-4">
        {/* Gap Time Threshold */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">
            Min Gap Duration: {minGapTime}s
          </label>
          <input
            type="range"
            min="10"
            max="300"
            step="10"
            value={minGapTime}
            onChange={(e) => setMinGapTime(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum time gap to detect (seconds)
          </p>
        </div>

        {/* Detection Results */}
        <div className="bg-gray-900 rounded p-3">
          <p className="text-xs text-gray-400">
            Detected Gaps:{' '}
            <span className="text-white font-semibold">{detectedGaps.length}</span>
          </p>
          {detectedGaps.length > 0 && (
            <div className="mt-2 space-y-1">
              {detectedGaps.map((gap, idx) => (
                <p key={idx} className="text-xs text-gray-400">
                  Gap {idx + 1}: {Math.round(gap.timeDelta)}s
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-gray-900 rounded p-3">
          <p className="text-xs text-gray-400">
            Gaps will be filled by interpolating GPS points between the gap start and end.
          </p>
        </div>

        {/* Actions */}
        <button
          onClick={handleFillGaps}
          disabled={detectedGaps.length === 0}
          className="w-full px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {detectedGaps.length > 0
            ? `Fill ${detectedGaps.length} Gap${detectedGaps.length > 1 ? 's' : ''}`
            : 'No Gaps Detected'}
        </button>
      </div>
    </div>
  );
}
