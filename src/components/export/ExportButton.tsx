import { useState } from 'react';
import { useMap } from '../../hooks/useMap';
import { downloadGPX, estimateGPXSize } from '../../utils/export';

/**
 * Button to download the edited GPS track as a GPX file
 */
export function ExportButton() {
  const { editedTrack, originalTrack } = useMap();
  const [downloaded, setDownloaded] = useState(false);

  const track = editedTrack ?? originalTrack;
  if (!track) return null;

  const sizeBytes = estimateGPXSize(track);
  const sizeLabel =
    sizeBytes < 1024
      ? `${sizeBytes} B`
      : sizeBytes < 1024 * 1024
      ? `~${Math.round(sizeBytes / 1024)} KB`
      : `~${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

  const filename = `${track.metadata.name.replace(/[^a-z0-9]/gi, '_')}.gpx`;

  const handleDownload = () => {
    downloadGPX(track, filename);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors"
        title={`Download GPX (estimated ${sizeLabel})`}
      >
        <span>⬇</span>
        <span>{downloaded ? 'Downloaded!' : 'Download GPX'}</span>
      </button>
      <span className="text-xs text-gray-400 text-center">
        {track.points.length.toLocaleString()} points · {sizeLabel}
      </span>
    </div>
  );
}
