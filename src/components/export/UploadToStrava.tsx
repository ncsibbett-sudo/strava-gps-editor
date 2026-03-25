import { useState, useMemo, useEffect, useRef } from 'react';
import { useMap } from '../../hooks/useMap';
import { useActivities } from '../../hooks/useActivities';
import { stravaService } from '../../services/stravaService';
import { generateGPX, downloadGPX } from '../../utils/export';
import { validateTrack } from '../../services/validationService';
import { ValidationWarning } from '../map/ValidationWarning';
import { StatsComparison } from '../map/StatsComparison';

type UploadStatus = 'idle' | 'confirming' | 'generating' | 'uploading' | 'processing' | 'success' | 'error';

interface UploadResult {
  newActivityId: number;
  activityUrl: string;
}

/**
 * Upload edited GPS track to Strava.
 * Strategy: upload new activity with corrected GPS, then optionally delete original.
 */
export function UploadToStrava() {
  const { editedTrack, originalTrack } = useMap();
  const { selectedActivity } = useActivities();

  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [deleteOriginal, setDeleteOriginal] = useState(false);
  const [backupFirst, setBackupFirst] = useState(true);
  const [isOverridden, setIsOverridden] = useState(false);
  const [processingSeconds, setProcessingSeconds] = useState(0);
  const processingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track how long the 'processing' state has been active for timeout hints
  useEffect(() => {
    if (status === 'processing') {
      setProcessingSeconds(0);
      processingTimerRef.current = setInterval(() => {
        setProcessingSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
        processingTimerRef.current = null;
      }
      setProcessingSeconds(0);
    }
    return () => {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
        processingTimerRef.current = null;
      }
    };
  }, [status]);

  const track = editedTrack ?? originalTrack;

  // Hoist useMemo before early return to comply with React hooks rules
  const validationResult = useMemo(
    () => (track ? validateTrack(track) : null),
    [track]
  );

  if (!track || !selectedActivity) return null;

  const hasEdits = editedTrack !== null && editedTrack !== originalTrack;
  // validationResult is non-null here since track is non-null
  const canProceed = validationResult!.isValid || isOverridden;

  const handleUpload = async () => {
    if (!track || !selectedActivity) return;

    try {
      // Step 1: Optionally download GPX backup
      if (backupFirst) {
        downloadGPX(track, `${track.metadata.name}_backup`);
      }

      // Step 2: Generate GPX
      setStatus('generating');
      const gpxContent = generateGPX(track);

      // Step 3: Upload to Strava
      setStatus('uploading');
      const uploadResponse = await stravaService.uploadActivity(
        gpxContent,
        track.metadata.name,
        selectedActivity.description ?? '',
        track.metadata.type.toLowerCase()
      );

      // Step 4: Poll until processed
      setStatus('processing');
      const processed = await stravaService.pollUploadStatus(uploadResponse.id);

      if (!processed.activity_id) {
        throw new Error('Strava processing completed but no activity ID was returned');
      }

      // Step 5: Copy metadata from original to new activity
      await stravaService.updateActivity(processed.activity_id, {
        name: selectedActivity.name,
        description: selectedActivity.description ?? '',
        type: selectedActivity.type,
      });

      // Step 6: Optionally delete original activity
      if (deleteOriginal) {
        await stravaService.deleteActivity(selectedActivity.id);
      }

      setResult({
        newActivityId: processed.activity_id,
        activityUrl: `https://www.strava.com/activities/${processed.activity_id}`,
      });
      setStatus('success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setErrorMessage(null);
    setResult(null);
  };

  // ── Confirmation dialog ────────────────────────────────────────────────────
  if (status === 'confirming') {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-yellow-600 space-y-4">
        <h3 className="text-sm font-semibold text-white">Upload to Strava</h3>

        {/* Stats Comparison */}
        {hasEdits && originalTrack && (
          <StatsComparison originalTrack={originalTrack} editedTrack={track} />
        )}

        {/* Validation Warning */}
        {!validationResult!.isValid && (
          <ValidationWarning
            validationResult={validationResult!}
            onOverride={() => setIsOverridden(true)}
            showOverride={true}
          />
        )}

        <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3 text-xs text-yellow-200 space-y-1">
          <p className="font-semibold">⚠️ This will create a new Strava activity.</p>
          <p>The original activity will remain unless you check "Delete original" below.</p>
          <p>Kudos and comments are tied to the original activity and will not transfer.</p>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={backupFirst}
            onChange={e => setBackupFirst(e.target.checked)}
            className="rounded"
          />
          Download GPX backup before uploading (recommended)
        </label>

        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={deleteOriginal}
            onChange={e => setDeleteOriginal(e.target.checked)}
            className="rounded"
          />
          Delete original activity after upload
        </label>

        {deleteOriginal && (
          <div className="bg-red-900/30 border border-red-700 rounded p-2 text-xs text-red-200">
            ⚠️ Deleting the original activity is permanent and cannot be undone. All kudos and
            comments on the original will be lost.
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={!canProceed}
            className="flex-1 px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Upload
          </button>
          <button
            onClick={() => setStatus('idle')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── In-progress states ─────────────────────────────────────────────────────
  if (status === 'generating' || status === 'uploading' || status === 'processing') {
    const messages: Record<string, string> = {
      generating: 'Generating GPX file...',
      uploading: 'Uploading to Strava...',
      processing: 'Waiting for Strava to process activity...',
    };

    const timeoutHint =
      status === 'processing' && processingSeconds >= 30
        ? 'Still processing... Large files can take a few minutes.'
        : status === 'processing' && processingSeconds >= 15
        ? 'This is taking longer than expected...'
        : null;

    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
        <h3 className="text-sm font-semibold text-white">Upload to Strava</h3>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-strava-orange border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-gray-300">{messages[status]}</p>
        </div>
        {timeoutHint && (
          <p className="text-xs text-yellow-400">{timeoutHint}</p>
        )}
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (status === 'success' && result) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-green-600 space-y-3">
        <h3 className="text-sm font-semibold text-white">✓ Upload Complete</h3>
        <p className="text-xs text-gray-300">Your corrected activity has been uploaded to Strava.</p>
        <a
          href={result.activityUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded font-semibold text-sm transition-colors"
        >
          View on Strava →
        </a>
        <button
          onClick={handleReset}
          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-red-600 space-y-3">
        <h3 className="text-sm font-semibold text-white">Upload Failed</h3>
        <p className="text-xs text-red-300">{errorMessage}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setStatus('confirming')}
            className="flex-1 px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded text-sm font-semibold transition-colors"
          >
            Retry
          </button>
          <button
            onClick={() => downloadGPX(track, track.metadata.name)}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition-colors"
          >
            Download GPX
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Idle ───────────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
      <h3 className="text-sm font-semibold text-white">Upload to Strava</h3>

      {!hasEdits && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded p-2 text-xs text-yellow-200">
          No edits have been made to this track.
        </div>
      )}

      {/* Stats Comparison (if edits were made) */}
      {hasEdits && originalTrack && (
        <StatsComparison originalTrack={originalTrack} editedTrack={track} />
      )}

      {/* Validation Warning (if any issues) */}
      {(!validationResult!.isValid || validationResult!.warnings.length > 0) && (
        <ValidationWarning
          validationResult={validationResult!}
          onOverride={() => setIsOverridden(true)}
          showOverride={!validationResult!.isValid}
        />
      )}

      <div className="text-xs text-gray-400 space-y-1">
        <p>Activity: <span className="text-white">{selectedActivity.name}</span></p>
        <p>Points: <span className="text-white">{track.points.length.toLocaleString()}</span></p>
        <p>Distance: <span className="text-white">{(track.totalDistance / 1000).toFixed(2)} km</span></p>
      </div>

      <button
        onClick={() => setStatus('confirming')}
        disabled={!canProceed}
        className="w-full px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Upload to Strava
      </button>
    </div>
  );
}
