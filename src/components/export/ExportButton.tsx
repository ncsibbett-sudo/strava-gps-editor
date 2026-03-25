import { useState, useMemo } from 'react';
import { useMap } from '../../hooks/useMap';
import { downloadGPX, estimateGPXSize } from '../../utils/export';
import { downloadFIT } from '../../utils/fitExport';
import { downloadTCX } from '../../utils/tcxExport';
import { validateTrack } from '../../services/validationService';
import { ValidationWarning } from '../map/ValidationWarning';
import { StatsComparison } from '../map/StatsComparison';

/**
 * Button to download the edited GPS track as a GPX file
 */
export function ExportButton() {
  const { editedTrack, originalTrack } = useMap();
  const [downloaded, setDownloaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState<'gpx' | 'fit' | 'tcx' | null>(null);
  const [isOverridden, setIsOverridden] = useState(false);

  const track = editedTrack ?? originalTrack;

  // Hoist useMemo before early return to comply with React hooks rules
  const validationResult = useMemo(
    () => (track ? validateTrack(track) : null),
    [track]
  );

  if (!track) return null;
  // validationResult is non-null here since track is non-null

  const sizeBytes = estimateGPXSize(track);
  const sizeLabel =
    sizeBytes < 1024
      ? `${sizeBytes} B`
      : sizeBytes < 1024 * 1024
      ? `~${Math.round(sizeBytes / 1024)} KB`
      : `~${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

  const canDownload = validationResult!.isValid || isOverridden;

  const handleDownload = async (format: 'gpx' | 'fit' | 'tcx') => {
    if (!canDownload || isGenerating) return;

    setIsGenerating(true);
    setGeneratingFormat(format);
    // Yield to the UI so the loading state renders before synchronous generation blocks
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const baseName = track.metadata.name.replace(/[^a-z0-9]/gi, '_');
    if (format === 'gpx') downloadGPX(track, `${baseName}.gpx`);
    else if (format === 'fit') downloadFIT(track, baseName);
    else if (format === 'tcx') downloadTCX(track, baseName);

    setIsGenerating(false);
    setGeneratingFormat(null);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const hasEdits = editedTrack !== null && editedTrack !== originalTrack;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
      <h3 className="text-sm font-semibold text-white">Export GPX</h3>

      {/* Stats Comparison (if edits were made) */}
      {hasEdits && originalTrack && editedTrack && (
        <StatsComparison originalTrack={originalTrack} editedTrack={editedTrack} />
      )}

      {/* Validation Warning */}
      {!validationResult!.isValid && (
        <ValidationWarning
          validationResult={validationResult}
          onOverride={() => setIsOverridden(true)}
          showOverride={true}
        />
      )}

      {/* Download Buttons */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          {(['gpx', 'fit', 'tcx'] as const).map((fmt) => {
            const busy = isGenerating && generatingFormat === fmt;
            const labels: Record<string, string> = { gpx: 'GPX', fit: 'FIT', tcx: 'TCX' };
            const titles: Record<string, string> = {
              gpx: `Universal GPS format (estimated ${sizeLabel})`,
              fit: 'Garmin/Wahoo binary format',
              tcx: 'TrainingPeaks XML format',
            };
            return (
              <button
                key={fmt}
                onClick={() => handleDownload(fmt)}
                disabled={!canDownload || isGenerating}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={titles[fmt]}
              >
                {busy ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>⬇</span>
                )}
                <span>{busy ? '...' : labels[fmt]}</span>
              </button>
            );
          })}
        </div>
        {downloaded && (
          <span className="text-xs text-green-400 text-center">Downloaded!</span>
        )}
        <span className="text-xs text-gray-400 text-center">
          {track.points.length.toLocaleString()} points · GPX ~{sizeLabel}
        </span>
      </div>
    </div>
  );
}
