import { useState, useEffect, useRef } from 'react';
import { useMap } from '../../../hooks/useMap';
import { applyMovingAverageSmoothing, applyGaussianSmoothing } from '../../../utils/smoothing';

type SmoothingAlgorithm = 'movingAverage' | 'gaussian';

/**
 * Smooth tool - applies smoothing to GPS track
 */
export function SmoothTool() {
  const { editedTrack, setEditedTrack, setPreviewTrack } = useMap();
  const [algorithm, setAlgorithm] = useState<SmoothingAlgorithm>('movingAverage');
  const [windowSize, setWindowSize] = useState(5);
  const [sigma, setSigma] = useState(2);

  // Keep a ref so the preview effect always reads the latest track without
  // depending on it — this prevents the preview from re-triggering after Apply
  // clears it (which would hide the committed edit).
  const editedTrackRef = useRef(editedTrack);
  editedTrackRef.current = editedTrack;

  // Update preview when parameters change
  useEffect(() => {
    const track = editedTrackRef.current;
    if (track) {
      let smoothedTrack;
      if (algorithm === 'movingAverage') {
        smoothedTrack = applyMovingAverageSmoothing(track, windowSize);
      } else {
        smoothedTrack = applyGaussianSmoothing(track, sigma);
      }
      setPreviewTrack(smoothedTrack);
    }
  }, [algorithm, windowSize, sigma, setPreviewTrack]);

  if (!editedTrack) return null;

  const handleApplySmoothing = () => {
    if (!editedTrack) return;

    let smoothedTrack;
    if (algorithm === 'movingAverage') {
      smoothedTrack = applyMovingAverageSmoothing(editedTrack, windowSize);
    } else {
      smoothedTrack = applyGaussianSmoothing(editedTrack, sigma);
    }

    setEditedTrack(smoothedTrack, true);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-white mb-4">Smooth Track</h3>

      <div className="space-y-4">
        {/* Algorithm Selection */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Algorithm</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setAlgorithm('movingAverage')}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                algorithm === 'movingAverage'
                  ? 'bg-strava-orange text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Moving Average
            </button>
            <button
              onClick={() => setAlgorithm('gaussian')}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                algorithm === 'gaussian'
                  ? 'bg-strava-orange text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Gaussian
            </button>
          </div>
        </div>

        {/* Parameters */}
        {algorithm === 'movingAverage' ? (
          <div>
            <label className="block text-xs text-gray-400 mb-2">
              Window Size: {windowSize} points
            </label>
            <input
              type="range"
              min="3"
              max="21"
              step="2"
              value={windowSize}
              onChange={(e) => setWindowSize(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Larger window = more smoothing
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-400 mb-2">
              Sigma (σ): {sigma.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={sigma}
              onChange={(e) => setSigma(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher sigma = more smoothing
            </p>
          </div>
        )}

        {/* Info */}
        <div className="bg-gray-900 rounded p-3">
          <p className="text-xs text-gray-400">
            Track points: <span className="text-white font-semibold">{editedTrack.points.length}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {algorithm === 'movingAverage'
              ? 'Averages nearby points for smooth curves'
              : 'Applies weighted averaging with Gaussian distribution'}
          </p>
        </div>

        {/* Actions */}
        <button
          onClick={handleApplySmoothing}
          className="w-full px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded font-semibold transition-colors"
        >
          Apply Smoothing
        </button>
      </div>
    </div>
  );
}
