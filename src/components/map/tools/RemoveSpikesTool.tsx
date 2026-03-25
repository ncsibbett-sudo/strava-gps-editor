import { useState, useEffect, useRef } from 'react';
import { useMap } from '../../../hooks/useMap';

/**
 * Remove Spikes tool - detects and removes GPS spikes
 */
export function RemoveSpikesTool() {
  const { editedTrack, setEditedTrack, setPreviewTrack } = useMap();
  const [speedThreshold, setSpeedThreshold] = useState(22); // m/s (~50 mph)
  const [distanceThreshold, setDistanceThreshold] = useState(100); // meters
  const [detectedSpikes, setDetectedSpikes] = useState<number[]>([]);

  // Ref so the preview effect reads the latest track without depending on it,
  // preventing the preview from re-triggering after Apply clears it.
  const editedTrackRef = useRef(editedTrack);
  editedTrackRef.current = editedTrack;

  useEffect(() => {
    const track = editedTrackRef.current;
    if (track) {
      const spikes = track.detectSpikes(speedThreshold, distanceThreshold);
      setDetectedSpikes(spikes);

      // Update preview track with spikes removed
      if (spikes.length > 0) {
        setPreviewTrack(track.removePoints(spikes));
      } else {
        setPreviewTrack(null);
      }
    }
  }, [speedThreshold, distanceThreshold, setPreviewTrack]);

  if (!editedTrack) return null;

  const handleRemoveSpikes = () => {
    if (!editedTrack || detectedSpikes.length === 0) return;
    // Guard: ensure at least 3 points remain after removal
    if (editedTrack.points.length - detectedSpikes.length < 3) return;

    const cleanedTrack = editedTrack.removePoints(detectedSpikes);
    setEditedTrack(cleanedTrack, true);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-white mb-4">Remove GPS Spikes</h3>

      <div className="space-y-4">
        {/* Speed Threshold */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">
            Max Speed Threshold: {speedThreshold} m/s (~{Math.round(speedThreshold * 2.237)} mph)
          </label>
          <input
            type="range"
            min="5"
            max="50"
            value={speedThreshold}
            onChange={(e) => setSpeedThreshold(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Distance Threshold */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">
            Max Distance Jump: {distanceThreshold}m
          </label>
          <input
            type="range"
            min="20"
            max="500"
            step="10"
            value={distanceThreshold}
            onChange={(e) => setDistanceThreshold(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Detection Results */}
        <div className="bg-gray-900 rounded p-3">
          <p className="text-xs text-gray-400">
            Detected Spikes:{' '}
            <span className="text-white font-semibold">{detectedSpikes.length}</span>
          </p>
          {detectedSpikes.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Points to remove: {detectedSpikes.length} /{' '}
              {editedTrack.points.length}
            </p>
          )}
        </div>

        {/* Actions */}
        {detectedSpikes.length > 0 &&
          editedTrack.points.length - detectedSpikes.length < 3 && (
            <p className="text-xs text-yellow-400">
              Cannot remove — fewer than 3 points would remain.
            </p>
          )}
        <button
          onClick={handleRemoveSpikes}
          disabled={
            detectedSpikes.length === 0 ||
            editedTrack.points.length - detectedSpikes.length < 3
          }
          className="w-full px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {detectedSpikes.length > 0
            ? `Remove ${detectedSpikes.length} Spike${detectedSpikes.length > 1 ? 's' : ''}`
            : 'No Spikes Detected'}
        </button>
      </div>
    </div>
  );
}
