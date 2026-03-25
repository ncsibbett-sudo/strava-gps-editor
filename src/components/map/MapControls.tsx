import { useState } from 'react';
import { useMap } from '../../hooks/useMap';
import type { ViewMode, TileLayer } from '../../stores/mapStore';

/**
 * Map control panel for view mode and tile layer selection.
 * On desktop: static panel (positioned by MapContainer).
 * On mobile: collapsible panel toggled by a compact button.
 */
export function MapControls() {
  const { viewMode, tileLayer, setViewMode, setTileLayer, originalTrack, editedTrack } =
    useMap();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!originalTrack) return null;

  const hasEdits = editedTrack && editedTrack !== originalTrack;

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleTileLayer = (layer: TileLayer) => {
    setTileLayer(layer);
    setMobileOpen(false);
  };

  // Shared panel content used in both desktop and mobile
  const panelContent = (
    <div className="space-y-4">
      {/* View Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">View Mode</label>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => handleViewMode('original')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors min-h-[44px] md:min-h-0 ${
              viewMode === 'original'
                ? 'bg-strava-orange text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Original
          </button>
          {hasEdits && (
            <>
              <button
                onClick={() => handleViewMode('edited')}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors min-h-[44px] md:min-h-0 ${
                  viewMode === 'edited'
                    ? 'bg-strava-orange text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Edited
              </button>
              <button
                onClick={() => handleViewMode('both')}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors min-h-[44px] md:min-h-0 ${
                  viewMode === 'both'
                    ? 'bg-strava-orange text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Both
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tile Layer */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Map Layer</label>
        <div className="flex gap-1 flex-wrap md:flex-col">
          {[
            { id: 'streets' as TileLayer, label: '🗺️ Streets' },
            { id: 'satellite' as TileLayer, label: '🛰️ Satellite' },
            { id: 'terrain' as TileLayer, label: '⛰️ Terrain' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleTileLayer(id)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors text-left min-h-[44px] md:min-h-0 ${
                tileLayer === id
                  ? 'bg-strava-orange text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend when both tracks shown */}
      {viewMode === 'both' && hasEdits && (
        <div className="pt-3 border-t border-gray-700">
          <p className="text-xs font-medium text-gray-300 mb-1">Legend</p>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-blue-500 rounded" />
              <span className="text-gray-400">Original</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-strava-orange rounded" />
              <span className="text-gray-400">Edited</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Desktop: static panel (MapContainer positions it) ──────────── */}
      <div className="hidden md:block bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4">
        {panelContent}
      </div>

      {/* ── Mobile: toggle button + collapsible dropdown ───────────────── */}
      <div className="md:hidden relative">
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="flex items-center gap-1 bg-gray-800/90 backdrop-blur-sm border border-gray-600 rounded-lg px-3 py-2 text-sm text-white shadow-lg min-h-[44px]"
          aria-label="Map controls"
        >
          <span>🗺️</span>
          <span className="text-xs font-medium">
            {tileLayer === 'streets' ? 'Streets' : tileLayer === 'satellite' ? 'Satellite' : 'Terrain'}
          </span>
          <span className="text-gray-400 ml-1">{mobileOpen ? '▲' : '▼'}</span>
        </button>

        {mobileOpen && (
          <div className="absolute top-full right-0 mt-1 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 z-[1010]">
            {panelContent}
          </div>
        )}
      </div>
    </>
  );
}
