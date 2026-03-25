import { useState, useEffect, useRef, useCallback } from 'react';
import { useMap } from '../../../hooks/useMap';
import L from 'leaflet';

type SelectMode = 'individual' | 'range';

function getMap(): L.Map | null {
  const el = document.querySelector('.leaflet-container');
  return el ? (el as unknown as { _leaflet_map: L.Map })._leaflet_map ?? null : null;
}

/**
 * Delete Points tool.
 * Individual mode: click points to toggle selection.
 * Range mode: click two points to select everything between them.
 * Delete key or the button confirms deletion.
 */
export function DeletePointsTool() {
  const { editedTrack, setEditedTrack, setPreviewTrack } = useMap();

  const [pendingIndices, setPendingIndices] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState<SelectMode>('individual');
  const [rangeStart, setRangeStart] = useState<number | null>(null);

  // Stable ref so marker click handlers always see current state without recreating markers
  const pendingRef = useRef<Set<number>>(pendingIndices);
  const rangeStartRef = useRef<number | null>(rangeStart);
  const selectModeRef = useRef<SelectMode>(selectMode);
  const markersRef = useRef<Map<number, L.CircleMarker>>(new Map());

  // Keep refs in sync
  useEffect(() => { pendingRef.current = pendingIndices; }, [pendingIndices]);
  useEffect(() => { rangeStartRef.current = rangeStart; }, [rangeStart]);
  useEffect(() => { selectModeRef.current = selectMode; }, [selectMode]);

  // Update preview whenever selection changes
  useEffect(() => {
    if (!editedTrack) return;
    if (pendingIndices.size === 0) {
      setPreviewTrack(null);
    } else {
      setPreviewTrack(editedTrack.removePoints([...pendingIndices]));
    }
  }, [editedTrack, pendingIndices, setPreviewTrack]);

  // Helper: set marker colour without recreating it
  const setMarkerColor = useCallback((idx: number, selected: boolean, isRangeStart = false) => {
    const m = markersRef.current.get(idx);
    if (!m) return;
    const color = isRangeStart ? '#f59e0b' : selected ? '#ef4444' : '#3b82f6';
    m.setStyle({ color, fillColor: color });
  }, []);

  // Build markers once when editedTrack changes
  useEffect(() => {
    if (!editedTrack) return;

    const map = getMap();
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    // Decimate: at most 600 visible markers
    const step = Math.max(1, Math.floor(editedTrack.points.length / 600));

    editedTrack.points.forEach((pt, idx) => {
      if (idx % step !== 0) return;

      const isPending = pendingRef.current.has(idx);
      const marker = L.circleMarker([pt.lat, pt.lng], {
        radius: 5,
        color: isPending ? '#ef4444' : '#3b82f6',
        fillColor: isPending ? '#ef4444' : '#3b82f6',
        fillOpacity: 0.75,
        weight: 1,
        interactive: true,
        bubblingMouseEvents: false,
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);

        if (selectModeRef.current === 'range') {
          const rs = rangeStartRef.current;
          if (rs === null) {
            // First click — set range start
            setRangeStart(idx);
            setMarkerColor(idx, false, true);
          } else {
            // Second click — select all points between rs and idx
            const lo = Math.min(rs, idx);
            const hi = Math.max(rs, idx);
            const rangeSet = new Set<number>();
            for (let i = lo; i <= hi; i++) {
              if (markersRef.current.has(i)) rangeSet.add(i);
            }
            setPendingIndices((prev) => {
              const next = new Set(prev);
              rangeSet.forEach((i) => next.add(i));
              return next;
            });
            rangeSet.forEach((i) => setMarkerColor(i, true));
            setMarkerColor(rs, true); // clear amber from range start
            setRangeStart(null);
          }
        } else {
          // Individual toggle
          setPendingIndices((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) {
              next.delete(idx);
              setMarkerColor(idx, false);
            } else {
              next.add(idx);
              setMarkerColor(idx, true);
            }
            return next;
          });
        }
      });

      marker.addTo(map);
      markersRef.current.set(idx, marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      setPreviewTrack(null);
    };
  }, [editedTrack, setPreviewTrack, setMarkerColor]);

  // Keyboard: Delete key to confirm, Escape to clear
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (pendingRef.current.size > 0) handleConfirm();
      }
      if (e.key === 'Escape') handleClear();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    if (!editedTrack || pendingRef.current.size === 0) return;
    const updated = editedTrack.removePoints([...pendingRef.current]);
    setEditedTrack(updated, true);
    setPendingIndices(new Set());
    setRangeStart(null);
    // Markers will rebuild from the new editedTrack
  };

  const handleClear = () => {
    pendingRef.current.forEach((idx) => setMarkerColor(idx, false));
    if (rangeStartRef.current !== null) {
      setMarkerColor(rangeStartRef.current, false);
      setRangeStart(null);
    }
    setPendingIndices(new Set());
  };

  if (!editedTrack) return null;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-white mb-3">Delete Points</h3>

      <div className="space-y-3">
        {/* Select mode toggle */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Select Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setSelectMode('individual'); setRangeStart(null); }}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${
                selectMode === 'individual'
                  ? 'bg-strava-orange text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Individual
            </button>
            <button
              onClick={() => { setSelectMode('range'); setRangeStart(null); }}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${
                selectMode === 'range'
                  ? 'bg-strava-orange text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Range
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-900/30 border border-blue-700 rounded p-2.5">
          <p className="text-xs text-blue-200 leading-snug">
            {selectMode === 'individual'
              ? 'Click blue dots on the map to mark them red for deletion.'
              : rangeStart === null
              ? 'Click the first point of the range to delete (shown in amber).'
              : 'Click the last point of the range — all points between will be selected.'}
          </p>
        </div>

        {/* Stats */}
        <div className="bg-gray-900 rounded p-2.5 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Total points:</span>
            <span className="ml-1 text-white font-semibold">{editedTrack.points.length.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400">Selected:</span>
            <span className="ml-1 text-red-400 font-semibold">{pendingIndices.size.toLocaleString()}</span>
          </div>
          {pendingIndices.size > 0 && (
            <div className="col-span-2 text-gray-500">
              → {(editedTrack.points.length - pendingIndices.size).toLocaleString()} points will remain
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={pendingIndices.size === 0}
            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pendingIndices.size > 0
              ? `Delete ${pendingIndices.size.toLocaleString()} point${pendingIndices.size !== 1 ? 's' : ''}`
              : 'Select points first'}
          </button>
          <button
            onClick={handleClear}
            disabled={pendingIndices.size === 0 && rangeStart === null}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors disabled:opacity-40"
            title="Clear selection (Escape)"
          >
            Clear
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center">Delete key confirms · Escape clears</p>
      </div>
    </div>
  );
}
