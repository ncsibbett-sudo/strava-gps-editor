import { useState, useRef } from 'react';
import type { StravaActivity } from '../../types/strava';
import {
  batchFixActivities,
  type BatchFixProgress,
  type BatchFixResult,
} from '../../services/batchFixService';

interface BatchFixDialogProps {
  activities: StravaActivity[];
  onClose: () => void;
  onComplete: () => void;
}

type Phase = 'confirm' | 'running' | 'done';

export function BatchFixDialog({ activities, onClose, onComplete }: BatchFixDialogProps) {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [deleteOriginals, setDeleteOriginals] = useState(false);
  const [progress, setProgress] = useState<BatchFixProgress>({
    total: activities.length,
    completed: 0,
    current: null,
    results: [],
  });
  const abortRef = useRef<AbortController | null>(null);

  const handleStart = async () => {
    setPhase('running');
    abortRef.current = new AbortController();

    await batchFixActivities(activities, deleteOriginals, setProgress, abortRef.current.signal);
    setPhase('done');
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const successCount = progress.results.filter((r) => r.status === 'success').length;
  const skippedCount = progress.results.filter((r) => r.status === 'skipped').length;
  const errorCount = progress.results.filter((r) => r.status === 'error').length;
  const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-6">
          <h2 className="text-lg font-bold text-white mb-1">
            {phase === 'confirm' && 'Batch Fix Activities'}
            {phase === 'running' && 'Fixing Activities…'}
            {phase === 'done' && 'Batch Fix Complete'}
          </h2>

          {/* Confirm phase */}
          {phase === 'confirm' && (
            <div className="space-y-4 mt-3">
              <p className="text-sm text-gray-400">
                This will auto-fix <strong className="text-white">{activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}</strong> by removing GPS spikes and filling data gaps, then uploading the fixed versions to Strava.
              </p>

              <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3 text-xs text-yellow-200 space-y-1">
                <p>⚠️ Each fix creates a <strong>new Strava activity</strong>. Kudos, comments and segments from the original will not transfer.</p>
                <p>This process uses ~3–4 API calls per activity. For {activities.length} activities that is ~{activities.length * 4} calls.</p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteOriginals}
                  onChange={(e) => setDeleteOriginals(e.target.checked)}
                  className="w-4 h-4 accent-strava-orange"
                />
                <span className="text-sm text-gray-300">Delete originals after successful upload</span>
              </label>

              <div className="max-h-32 overflow-y-auto space-y-1 bg-gray-800 rounded p-2">
                {activities.map((a) => (
                  <p key={a.id} className="text-xs text-gray-400 truncate">{a.name}</p>
                ))}
              </div>
            </div>
          )}

          {/* Running phase */}
          {phase === 'running' && (
            <div className="space-y-4 mt-3">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{progress.completed} / {progress.total}</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-strava-orange h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              {progress.current && (
                <p className="text-sm text-gray-300 truncate">
                  <span className="text-gray-500">Processing: </span>{progress.current}
                </p>
              )}
              <div className="max-h-40 overflow-y-auto space-y-1">
                {progress.results.map((r) => (
                  <ResultRow key={r.activityId} result={r} />
                ))}
              </div>
            </div>
          )}

          {/* Done phase */}
          {phase === 'done' && (
            <div className="space-y-4 mt-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-900/30 border border-green-700 rounded p-3">
                  <p className="text-2xl font-bold text-green-400">{successCount}</p>
                  <p className="text-xs text-green-300 mt-1">Fixed</p>
                </div>
                <div className="bg-gray-800 border border-gray-600 rounded p-3">
                  <p className="text-2xl font-bold text-gray-400">{skippedCount}</p>
                  <p className="text-xs text-gray-500 mt-1">No issues</p>
                </div>
                <div className="bg-red-900/30 border border-red-700 rounded p-3">
                  <p className="text-2xl font-bold text-red-400">{errorCount}</p>
                  <p className="text-xs text-red-300 mt-1">Failed</p>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {progress.results.map((r) => (
                  <ResultRow key={r.activityId} result={r} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 pb-6">
          {phase === 'confirm' && (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="flex-1 px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Fix {activities.length} Activit{activities.length !== 1 ? 'ies' : 'y'}
              </button>
            </>
          )}
          {phase === 'running' && (
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
            >
              Stop
            </button>
          )}
          {phase === 'done' && (
            <button
              onClick={() => { onComplete(); onClose(); }}
              className="flex-1 px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: BatchFixResult }) {
  const icons = { success: '✅', skipped: '⏭️', error: '❌' };
  const textColors = { success: 'text-green-300', skipped: 'text-gray-400', error: 'text-red-300' };

  return (
    <div className="flex items-center gap-2 text-xs py-0.5">
      <span>{icons[result.status]}</span>
      <span className="flex-1 truncate text-gray-300">{result.activityName}</span>
      <span className={textColors[result.status]}>
        {result.status === 'success' && `−${result.spikesRemoved} spikes, +${result.gapsFilled} gaps filled`}
        {result.status === 'skipped' && (result.error ?? 'No issues found')}
        {result.status === 'error' && result.error}
      </span>
    </div>
  );
}
