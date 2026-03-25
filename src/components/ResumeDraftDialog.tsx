interface ResumeDraftDialogProps {
  activityName: string;
  savedAt: Date;
  onResume: () => void;
  onDiscard: () => void;
}

/**
 * Modal shown when a saved draft is found for the selected activity.
 * Lets the user resume where they left off or start fresh.
 */
export function ResumeDraftDialog({
  activityName,
  savedAt,
  onResume,
  onDiscard,
}: ResumeDraftDialogProps) {
  const formattedDate = savedAt.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-white mb-1">Resume editing?</h2>
        <p className="text-sm text-gray-400 mb-4">
          You have unsaved edits for{' '}
          <span className="text-white font-medium">{activityName}</span> from{' '}
          <span className="text-gray-300">{formattedDate}</span>.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onResume}
            className="flex-1 px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
          >
            Resume editing
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-red-700 text-gray-300 hover:text-white rounded-lg font-semibold transition-colors"
          >
            Discard draft
          </button>
        </div>
      </div>
    </div>
  );
}
