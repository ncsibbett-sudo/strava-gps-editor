import { useState } from 'react';
import { useMap } from '../../hooks/useMap';
import { getIssuesSummary, getTotalIssueCount } from '../../services/issueDetectionService';

/**
 * Shows auto-detected GPS issues when a track first loads.
 * Offers one-click auto-fix (removes spikes + fills gaps).
 */
export function IssuesBanner() {
  const { detectedIssues, autoFix, canUndo } = useMap();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when a new track loads (issues object reference changes)
  // We key the outer component on detectedIssues so React recreates it on track change.

  if (!detectedIssues || dismissed) return null;

  const total = getTotalIssueCount(detectedIssues);
  if (total === 0) return null;

  // After user has already done edits, the banner is less useful — hide it
  if (canUndo()) return null;

  const summary = getIssuesSummary(detectedIssues);
  const canAutoFix = detectedIssues.spikeIndices.length > 0 || detectedIssues.gapCount > 0;

  return (
    <div className="flex items-center gap-3 bg-yellow-900/40 border border-yellow-600 rounded-lg px-3 py-2 text-sm flex-wrap">
      <span className="text-yellow-300 font-medium whitespace-nowrap">
        ⚠️ {total} issue{total !== 1 ? 's' : ''} detected
      </span>
      <span className="text-yellow-200/70 text-xs flex-1 min-w-0 truncate" title={summary}>
        {summary}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {canAutoFix && (
          <button
            onClick={() => { autoFix(); setDismissed(true); }}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-xs font-semibold transition-colors"
            title="Remove spikes and fill gaps automatically"
          >
            Auto-fix
          </button>
        )}
        {detectedIssues.missingElevation && (
          <span className="text-xs text-yellow-400/80 italic">
            Use Fix Elevation tool for elevation
          </span>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-400/60 hover:text-yellow-300 text-lg leading-none ml-1"
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
