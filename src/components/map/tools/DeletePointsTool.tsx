import { useState, useEffect, useRef } from 'react';
import { useMap } from '../../../hooks/useMap';
import L from 'leaflet';

/**
 * Delete Points tool - allows clicking individual GPS points to remove them
 */
export function DeletePointsTool() {
  const { editedTrack, setEditedTrack, setPreviewTrack } = useMap();
  const [pendingIndices, setPendingIndices] = useState<Set<number>>(new Set());
  const markersRef = useRef<Map<number, L.CircleMarker>>(new Map());
  const mapRef = useRef<L.Map | null>(null);

  // Clean up markers on unmount or track change
  useEffect(() => {
    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();
      setPreviewTrack(null);
    };
  }, [setPreviewTrack]);

  // Update preview whenever pending selection changes
  useEffect(() => {
    if (!editedTrack) return;
    if (pendingIndices.size === 0) {
      setPreviewTrack(null);
    } else {
      setPreviewTrack(editedTrack.removePoints([...pendingIndices]));
    }
  }, [editedTrack, pendingIndices, setPreviewTrack]);

  // Render clickable point markers when track is available
  useEffect(() => {
    if (!editedTrack) return;

    const mapEl = document.querySelector('.leaflet-container');
    if (!mapEl || !(mapEl as any)._leaflet_map) return;
    mapRef.current = (mapEl as any)._leaflet_map;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    // Only show a marker for every Nth point to avoid overwhelming the map
    // Show all points if track is small, decimate otherwise
    const step = Math.max(1, Math.floor(editedTrack.points.length / 500));

    editedTrack.points.forEach((pt, idx) => {
      if (idx % step !== 0) return;

      const isPending = pendingIndices.has(idx);
      const marker = L.circleMarker([pt.lat, pt.lng], {
        radius: 5,
        color: isPending ? '#ef4444' : '#3b82f6',
        fillColor: isPending ? '#ef4444' : '#3b82f6',
        fillOpacity: 0.7,
        weight: 1,
      });

      marker.bindTooltip(`Point ${idx}`, { direction: 'top' });

      marker.on('click', () => {
        setPendingIndices(prev => {
          const next = new Set(prev);
          if (next.has(idx)) {
            next.delete(idx);
          } else {
            next.add(idx);
          }
          return next;
        });
      });

      if (mapRef.current) {
        marker.addTo(mapRef.current);
        markersRef.current.set(idx, marker);
      }
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();
    };
  }, [editedTrack, pendingIndices]);

  if (!editedTrack) return null;

  const handleConfirm = () => {
    if (pendingIndices.size === 0) return;
    const updated = editedTrack.removePoints([...pendingIndices]);
    setEditedTrack(updated, true);
    setPendingIndices(new Set());
  };

  const handleClear = () => {
    setPendingIndices(new Set());
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-white mb-4">Delete Points</h3>

      <div className="space-y-4">
        <div className="bg-blue-900/30 border border-blue-700 rounded p-3">
          <p className="text-xs text-blue-200">
            Click points on the map to select them for deletion. Blue = unselected, Red = selected.
          </p>
        </div>

        <div className="bg-gray-900 rounded p-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Total Points:</span>
              <span className="ml-2 text-white font-semibold">{editedTrack.points.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Selected:</span>
              <span className="ml-2 text-red-400 font-semibold">{pendingIndices.size}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={pendingIndices.size === 0}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pendingIndices.size > 0
              ? `Delete ${pendingIndices.size} Point${pendingIndices.size > 1 ? 's' : ''}`
              : 'No Points Selected'}
          </button>
          <button
            onClick={handleClear}
            disabled={pendingIndices.size === 0}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
