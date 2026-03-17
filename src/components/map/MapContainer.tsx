import { MapView } from './MapView';
import { MapControls } from './MapControls';
import { EditingToolbar } from './EditingToolbar';
import { TrimTool } from './tools/TrimTool';
import { RemoveSpikesTool } from './tools/RemoveSpikesTool';
import { SmoothTool } from './tools/SmoothTool';
import { FillGapTool } from './tools/FillGapTool';
import { useMap } from '../../hooks/useMap';

/**
 * Container component that combines map view and controls
 */
export function MapContainer() {
  const { selectedTool, undo, redo, canUndo, canRedo } = useMap();

  return (
    <div className="relative w-full h-full">
      <MapView />
      <MapControls />

      {/* Editing Toolbar */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <EditingToolbar />
      </div>

      {/* Undo/Redo Controls */}
      <div className="absolute bottom-4 right-4 z-[1000] flex gap-2">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </button>
      </div>

      {/* Active Tool Panel */}
      {selectedTool && (
        <div className="absolute top-4 right-4 z-[1000] w-80">
          {selectedTool === 'trim' && <TrimTool />}
          {selectedTool === 'removeSpikes' && <RemoveSpikesTool />}
          {selectedTool === 'smooth' && <SmoothTool />}
          {selectedTool === 'fillGap' && <FillGapTool />}
        </div>
      )}
    </div>
  );
}
