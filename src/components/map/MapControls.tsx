import { useMap } from '../../hooks/useMap';
import type { ViewMode, TileLayer } from '../../stores/mapStore';

/**
 * Map control panel for view mode and tile layer selection
 */
export function MapControls() {
  const { viewMode, tileLayer, setViewMode, setTileLayer, originalTrack, editedTrack } =
    useMap();

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleTileLayerChange = (layer: TileLayer) => {
    setTileLayer(layer);
  };

  // Don't show controls if no track is loaded
  if (!originalTrack) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 z-[1000]">
      {/* View Mode Toggle */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">View Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleViewModeChange('original')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === 'original'
                ? 'bg-strava-orange text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Original
          </button>
          {editedTrack && editedTrack !== originalTrack && (
            <>
              <button
                onClick={() => handleViewModeChange('edited')}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  viewMode === 'edited'
                    ? 'bg-strava-orange text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Edited
              </button>
              <button
                onClick={() => handleViewModeChange('both')}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
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

      {/* Tile Layer Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Map Layer</label>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleTileLayerChange('streets')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors text-left ${
              tileLayer === 'streets'
                ? 'bg-strava-orange text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🗺️ Streets
          </button>
          <button
            onClick={() => handleTileLayerChange('satellite')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors text-left ${
              tileLayer === 'satellite'
                ? 'bg-strava-orange text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🛰️ Satellite
          </button>
          <button
            onClick={() => handleTileLayerChange('terrain')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors text-left ${
              tileLayer === 'terrain'
                ? 'bg-strava-orange text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ⛰️ Terrain
          </button>
        </div>
      </div>

      {/* Legend (when showing both) */}
      {viewMode === 'both' && editedTrack && editedTrack !== originalTrack && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs font-medium text-gray-300 mb-2">Legend</p>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-blue-500"></div>
              <span className="text-gray-400">Original</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-strava-orange"></div>
              <span className="text-gray-400">Edited</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
