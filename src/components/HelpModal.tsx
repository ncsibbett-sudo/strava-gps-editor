import { useEffect, useState } from 'react';

interface HelpModalProps {
  onClose: () => void;
}

type Tab = 'tools' | 'shortcuts' | 'formats';

const TOOLS = [
  {
    icon: '✂️',
    name: 'Trim',
    shortcut: null,
    description:
      'Remove points from the start or end of your track. Use this to cut off the walk to/from your car, or to remove the part where you forgot to stop recording.',
    howTo: 'Drag the start/end sliders to select the section to keep, then click Apply.',
  },
  {
    icon: '🎯',
    name: 'Remove Spikes',
    shortcut: null,
    description:
      'Detect and remove GPS spikes — sudden jumps off-route caused by satellite loss. The algorithm finds points that require an unrealistic speed to reach.',
    howTo: 'Adjust the sensitivity threshold, preview detected spikes on the map, then click Apply.',
  },
  {
    icon: '〰️',
    name: 'Smooth',
    shortcut: null,
    description:
      'Reduce GPS noise by averaging nearby points. Useful when your track looks jagged or zigzags on straight roads. Two algorithms: Moving Average (fast) and Gaussian (higher quality).',
    howTo: 'Choose algorithm and window size, preview the result, then Apply.',
  },
  {
    icon: '🔗',
    name: 'Fill Gap',
    shortcut: null,
    description:
      'Connect two sections of your track that have a gap — e.g. when your GPS lost signal in a tunnel. Fills the gap with a straight line or interpolated points.',
    howTo: 'Click the gap on the map, choose fill method, then Apply.',
  },
  {
    icon: '✏️',
    name: 'Redraw',
    shortcut: null,
    description:
      'Replace a section of your track by drawing the correct path. Supports snap-to-road (OSRM routing) or freehand drawing. Great for fixing entire sections that went wrong.',
    howTo: 'Click a start point on the track, then an end point. Place waypoints along the correct route. Toggle Snap-to-Road or Freehand mode. Click Apply.',
  },
  {
    icon: '🗑️',
    name: 'Delete Points',
    shortcut: null,
    description:
      'Click individual GPS points directly on the map to delete them. Useful for removing one-off outlier points that other tools miss.',
    howTo: 'With the tool active, click any point on the map to remove it.',
  },
  {
    icon: '⛰️',
    name: 'Fix Elevation',
    shortcut: null,
    description:
      'Replace the elevation data in your track with real terrain data from the Open-Elevation API. Fixes flat tracks, incorrect elevation profiles, and Strava\'s elevation discrepancies.',
    howTo: 'Click "Fix Elevation" to fetch real elevation data. Shows before/after gain comparison.',
  },
];

const SHORTCUTS = [
  { keys: ['Ctrl', 'Z'], action: 'Undo last edit' },
  { keys: ['Ctrl', 'Y'], action: 'Redo' },
  { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo (alternative)' },
  { keys: ['Escape'], action: 'Deselect active tool' },
  { keys: ['?'], action: 'Open this help dialog' },
  { keys: ['1'], action: 'Select Trim tool' },
  { keys: ['2'], action: 'Select Remove Spikes tool' },
  { keys: ['3'], action: 'Select Smooth tool' },
  { keys: ['4'], action: 'Select Fill Gap tool' },
  { keys: ['5'], action: 'Select Redraw tool' },
  { keys: ['6'], action: 'Select Delete Points tool' },
  { keys: ['7'], action: 'Select Fix Elevation tool' },
  { keys: ['Delete'], action: 'Confirm deletion (in Delete Points tool)' },
];

const FORMATS = [
  {
    ext: 'GPX',
    name: 'GPS Exchange Format',
    icon: '📍',
    description: 'Universal XML format. Works with Strava, Garmin Connect, Komoot, Wahoo, and almost everything else. Best default choice.',
  },
  {
    ext: 'FIT',
    name: 'Flexible and Interoperable Data Transfer',
    icon: '⌚',
    description: 'Binary format used by Garmin devices and Wahoo. Smaller file size, faster processing. Use this if uploading to Garmin Connect or Wahoo Elemnt.',
  },
  {
    ext: 'TCX',
    name: 'Training Center XML',
    icon: '📊',
    description: 'XML format used by TrainingPeaks, Garmin, and older platforms. Includes laps and session data. Best for TrainingPeaks uploads.',
  },
];

export function HelpModal({ onClose }: HelpModalProps) {
  const [tab, setTab] = useState<Tab>('tools');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Help & Reference</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 px-6">
          {([
            { id: 'tools', label: '🛠 Tools' },
            { id: 'shortcuts', label: '⌨️ Shortcuts' },
            { id: 'formats', label: '📁 Export Formats' },
          ] as { id: Tab; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? 'border-strava-orange text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {tab === 'tools' && (
            <div className="space-y-5">
              {TOOLS.map((tool) => (
                <div key={tool.name} className="flex gap-3">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{tool.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">{tool.name}</h3>
                    <p className="text-xs text-gray-400 mb-1">{tool.description}</p>
                    <p className="text-xs text-blue-400">
                      <span className="font-medium">How to use: </span>
                      {tool.howTo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'shortcuts' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 mb-4">
                Keyboard shortcuts work while the map editor is open.
              </p>
              {SHORTCUTS.map(({ keys, action }) => (
                <div key={action} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{action}</span>
                  <div className="flex items-center gap-1">
                    {keys.map((k, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <kbd className="px-2 py-1 text-xs font-mono bg-gray-700 border border-gray-600 rounded text-gray-200">
                          {k}
                        </kbd>
                        {i < keys.length - 1 && <span className="text-gray-500 text-xs">+</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'formats' && (
            <div className="space-y-4">
              {FORMATS.map((fmt) => (
                <div key={fmt.ext} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{fmt.icon}</span>
                    <span className="font-semibold text-white text-sm">.{fmt.ext}</span>
                    <span className="text-xs text-gray-400">— {fmt.name}</span>
                  </div>
                  <p className="text-xs text-gray-400">{fmt.description}</p>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-2">
                Not sure which to use? Download GPX — it works everywhere.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-700 text-xs text-gray-500 flex justify-between items-center">
          <span>Press <kbd className="px-1 py-0.5 bg-gray-700 rounded font-mono text-gray-300">?</kbd> at any time to open this dialog</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
