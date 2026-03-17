import { MapView } from './MapView';
import { MapControls } from './MapControls';

/**
 * Container component that combines map view and controls
 */
export function MapContainer() {
  return (
    <div className="relative w-full h-full">
      <MapView />
      <MapControls />
    </div>
  );
}
