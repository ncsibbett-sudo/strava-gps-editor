import { MapView } from './MapView';
import { MapControls } from './MapControls';
import { EditingToolbar } from './EditingToolbar';
import { TrimTool } from './tools/TrimTool';
import { RemoveSpikesTool } from './tools/RemoveSpikesTool';
import { SmoothTool } from './tools/SmoothTool';
import { FillGapTool } from './tools/FillGapTool';
import { RedrawTool } from './tools/RedrawTool';
import { DeletePointsTool } from './tools/DeletePointsTool';
import { FixElevationTool } from './tools/FixElevationTool';
import { ExportButton } from '../export/ExportButton';
import { UploadToStrava } from '../export/UploadToStrava';
import { useMap } from '../../hooks/useMap';

/**
 * Container component that combines map view and controls
 */
export function MapContainer() {
  const { selectedTool } = useMap();

  return (
    <div className="relative w-full h-full">
      <MapView />
      <MapControls />

      {/* Editing Toolbar (includes undo/redo/reset) */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <EditingToolbar />
      </div>

      {/* Active Tool Panel OR Export/Upload Panel */}
      <div className="absolute top-4 right-4 z-[1000] w-80 space-y-4">
        {selectedTool ? (
          <>
            {selectedTool === 'trim' && <TrimTool />}
            {selectedTool === 'removeSpikes' && <RemoveSpikesTool />}
            {selectedTool === 'smooth' && <SmoothTool />}
            {selectedTool === 'fillGap' && <FillGapTool />}
            {selectedTool === 'redraw' && <RedrawTool />}
            {selectedTool === 'deletePoints' && <DeletePointsTool />}
            {selectedTool === 'fixElevation' && <FixElevationTool />}
          </>
        ) : (
          <>
            {/* Export and Upload Options - shown when no tool is active */}
            <ExportButton />
            <UploadToStrava />
          </>
        )}
      </div>
    </div>
  );
}
