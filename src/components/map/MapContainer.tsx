import { useRef, useState } from 'react';
import { MapView } from './MapView';
import { MapControls } from './MapControls';
import { EditingToolbar } from './EditingToolbar';
import { ElevationProfile } from './ElevationProfile';
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

function ActiveToolPanel({ selectedTool }: { selectedTool: string }) {
  return (
    <>
      {selectedTool === 'trim' && <TrimTool />}
      {selectedTool === 'removeSpikes' && <RemoveSpikesTool />}
      {selectedTool === 'smooth' && <SmoothTool />}
      {selectedTool === 'fillGap' && <FillGapTool />}
      {selectedTool === 'redraw' && <RedrawTool />}
      {selectedTool === 'deletePoints' && <DeletePointsTool />}
      {selectedTool === 'fixElevation' && <FixElevationTool />}
    </>
  );
}

/**
 * Container component that combines map view and controls.
 * Desktop: right-side panel + bottom-left toolbar.
 * Mobile: full-height map with bottom-anchored toolbar and tool panel.
 */
export function MapContainer() {
  const { selectedTool } = useMap();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col w-full h-full bg-gray-900">
      {/* Map area */}
      <div className="relative flex-1 min-h-0">
        <MapView />

        {/* ── Desktop layout (md+) ─────────────────────────────────────── */}

        {/* Map controls: top-left on desktop */}
        <div className="hidden md:block absolute top-4 left-4 z-[1000]">
          <MapControls />
        </div>

        {/* Editing Toolbar — bottom-left on desktop */}
        <div className="hidden md:block absolute bottom-4 left-4 z-[1000]">
          <EditingToolbar />
        </div>

        {/* Tool / Export panel — top-right on desktop */}
        <div className="hidden md:block absolute top-4 right-4 z-[1000] w-80 space-y-4">
          {selectedTool ? (
            <ActiveToolPanel selectedTool={selectedTool} />
          ) : (
            <>
              <ExportButton />
              <UploadToStrava />
            </>
          )}
        </div>

        {/* Fullscreen toggle — bottom-right corner */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="absolute bottom-4 right-4 z-[1000] w-9 h-9 flex items-center justify-center bg-gray-800/90 border border-gray-600 rounded text-white hover:bg-gray-700 transition-colors shadow-lg text-sm"
        >
          {isFullscreen ? '⊠' : '⛶'}
        </button>

        {/* ── Mobile layout (< md) ─────────────────────────────────────── */}

        {/* Map controls: compact top-right on mobile */}
        <div className="md:hidden absolute top-2 right-2 z-[1000]">
          <MapControls />
        </div>

        {/* Bottom bar: tool panel (scrollable) + editing toolbar */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-[1000] flex flex-col">
          {/* Active tool panel or export/upload — scrollable bottom sheet */}
          <div className="max-h-[45vh] overflow-y-auto bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 p-2 space-y-2">
            {selectedTool ? (
              <ActiveToolPanel selectedTool={selectedTool} />
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <ExportButton />
                <UploadToStrava />
              </div>
            )}
          </div>

          {/* Editing toolbar — horizontal strip at the very bottom */}
          <div
            className="bg-gray-800 border-t border-gray-700"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <EditingToolbar />
          </div>
        </div>
      </div>

      {/* Elevation profile — below map on desktop, hidden on mobile */}
      <div className="hidden md:block">
        <ElevationProfile />
      </div>
    </div>
  );
}
