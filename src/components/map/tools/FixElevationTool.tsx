import { useState } from 'react';
import { useMap } from '../../../hooks/useMap';
import { elevationService } from '../../../services/elevationService';
import { GPSPoint } from '../../../models/GPSPoint';
import { GPSTrack } from '../../../models/GPSTrack';

/**
 * Fix Elevation tool - replaces GPS elevation with real terrain data
 * Uses Open-Elevation API to fetch accurate elevation for all GPS points
 */
export function FixElevationTool() {
  const { editedTrack, setEditedTrack } = useMap();

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    originalGain: number;
    newGain: number;
    difference: number;
  } | null>(null);

  if (!editedTrack) return null;

  const handleFixElevation = async () => {
    if (!editedTrack) return;

    setIsProcessing(true);
    setError(null);
    setPreview(null);

    try {
      const points = editedTrack.points;
      const totalPoints = points.length;

      // Fetch elevations in batches (500 at a time)
      const batchSize = 500;
      const newElevations: number[] = [];

      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        setProgress({ current: i, total: totalPoints });

        const batchElevations = await elevationService.getElevations(
          batch.map(p => ({ lat: p.lat, lng: p.lng }))
        );

        newElevations.push(...batchElevations);
      }

      setProgress({ current: totalPoints, total: totalPoints });

      // Create new GPS points with corrected elevation
      const newPoints = points.map((point, index) => {
        return new GPSPoint(
          point.lat,
          point.lng,
          newElevations[index], // Replace with terrain elevation
          point.time,
          point.distance
        );
      });

      const newTrack = new GPSTrack(newPoints, editedTrack.metadata);

      // Calculate before/after comparison
      const originalGain = editedTrack.elevationGain;
      const newGain = newTrack.elevationGain;
      const difference = newGain - originalGain;

      setPreview({
        originalGain,
        newGain,
        difference,
      });

      // Auto-apply the fix (user can undo if needed)
      setEditedTrack(newTrack, true);
      setIsProcessing(false);
    } catch (err) {
      console.error('Failed to fix elevation:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch elevation data');
      setIsProcessing(false);
    }
  };

  const currentElevationGain = editedTrack.elevationGain;

  // Calculate min/max elevation
  const elevations = editedTrack.points.map(p => p.elevation);
  const minElevation = elevations.length > 0 ? Math.min(...elevations) : 0;
  const maxElevation = elevations.length > 0 ? Math.max(...elevations) : 0;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-white mb-4">Fix Elevation from Terrain</h3>

      <div className="space-y-4">
        {/* Info */}
        <div className="bg-blue-900/30 border border-blue-700 rounded p-3">
          <p className="text-xs text-blue-200">
            This tool replaces GPS elevation data with accurate terrain elevation from
            topographic maps.
          </p>
          <p className="text-xs text-blue-200 mt-2">
            Useful when GPS elevation is inaccurate or missing.
          </p>
        </div>

        {/* Current Stats */}
        <div className="bg-gray-900 rounded p-3">
          <div className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Points:</span>
              <span className="text-white font-semibold">
                {editedTrack.points.length.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Current Elevation Gain:</span>
              <span className="text-white font-semibold">
                {Math.round(currentElevationGain)} m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Elevation Range:</span>
              <span className="text-white font-semibold">
                {Math.round(minElevation)} m → {Math.round(maxElevation)}{' '}
                m
              </span>
            </div>
          </div>
        </div>

        {/* Progress */}
        {isProcessing && progress && (
          <div className="bg-gray-900 rounded p-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-5 h-5 border-2 border-strava-orange border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-300">
                Fetching elevation data... {progress.current} / {progress.total}
              </p>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-strava-orange h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && !isProcessing && (
          <div className="bg-green-900/30 border border-green-700 rounded p-3">
            <p className="text-xs text-green-200 font-semibold mb-2">✓ Elevation Fixed!</p>
            <div className="text-xs space-y-1 text-gray-300">
              <div className="flex justify-between">
                <span>Original Elevation Gain:</span>
                <span className="font-semibold">{Math.round(preview.originalGain)} m</span>
              </div>
              <div className="flex justify-between">
                <span>Corrected Elevation Gain:</span>
                <span className="font-semibold text-green-400">
                  {Math.round(preview.newGain)} m
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-600 pt-1 mt-1">
                <span>Difference:</span>
                <span
                  className={`font-semibold ${
                    preview.difference > 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {preview.difference > 0 ? '+' : ''}
                  {Math.round(preview.difference)} m
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Applied! Use Undo (Ctrl+Z) if you want to revert.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded p-3">
            <p className="text-xs text-red-200 font-semibold mb-1">⚠️ Error</p>
            <p className="text-xs text-red-300">{error}</p>
            <p className="text-xs text-gray-400 mt-2">
              The elevation API may be temporarily unavailable. Try again in a few moments.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleFixElevation}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Fixing...' : preview ? 'Fix Again' : 'Fix Elevation'}
          </button>
        </div>

        {/* Cache Info */}
        <div className="text-xs text-gray-500 text-center">
          Powered by Open-Elevation API · Cache: {elevationService.getCacheSize()} points
        </div>
      </div>
    </div>
  );
}
