import { useState, useEffect, useRef } from 'react';
import { useMap } from '../../../hooks/useMap';

/**
 * Trim tool - allows trimming start/end of GPS track
 */
export function TrimTool() {
  const { editedTrack, setEditedTrack, setPreviewTrack } = useMap();
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(0);

  // Ref so the preview effect reads the latest track without depending on it,
  // preventing the preview from re-triggering after Apply clears it.
  const editedTrackRef = useRef(editedTrack);
  editedTrackRef.current = editedTrack;

  // Reset sliders whenever the track changes (e.g. after Apply commits a trim)
  useEffect(() => {
    if (editedTrack) {
      setStartIndex(0);
      setEndIndex(editedTrack.points.length - 1);
    }
  }, [editedTrack]);

  // Update preview track when slider positions change.
  // Only show preview when the selection is actually non-trivial.
  useEffect(() => {
    const track = editedTrackRef.current;
    if (!track) return;
    if (startIndex > 0 || endIndex < track.points.length - 1) {
      if (startIndex < endIndex) {
        setPreviewTrack(track.trim(startIndex, endIndex));
        return;
      }
    }
    setPreviewTrack(null);
  }, [startIndex, endIndex, setPreviewTrack]);

  if (!editedTrack) return null;

  const totalPoints = editedTrack.points.length;
  const trimmedDistance = (
    (editedTrack.points[endIndex]?.distance || 0) -
    (editedTrack.points[startIndex]?.distance || 0)
  ).toFixed(2);

  const handleApply = () => {
    if (!editedTrack || startIndex >= endIndex) return;

    const trimmedTrack = editedTrack.trim(startIndex, endIndex);
    setEditedTrack(trimmedTrack, true);
  };

  const handleReset = () => {
    setStartIndex(0);
    setEndIndex(totalPoints - 1);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-white mb-4">Trim Track</h3>

      <div className="space-y-4">
        {/* Start Point */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">
            Start Point: {startIndex} / {totalPoints}
          </label>
          <input
            type="range"
            min="0"
            max={totalPoints - 1}
            value={startIndex}
            onChange={(e) => setStartIndex(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* End Point */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">
            End Point: {endIndex} / {totalPoints}
          </label>
          <input
            type="range"
            min="0"
            max={totalPoints - 1}
            value={endIndex}
            onChange={(e) => setEndIndex(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Stats */}
        <div className="bg-gray-900 rounded p-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Points:</span>
              <span className="ml-2 text-white font-semibold">
                {endIndex - startIndex + 1}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Distance:</span>
              <span className="ml-2 text-white font-semibold">{trimmedDistance}m</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleApply}
            disabled={startIndex >= endIndex}
            className="flex-1 px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Trim
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
