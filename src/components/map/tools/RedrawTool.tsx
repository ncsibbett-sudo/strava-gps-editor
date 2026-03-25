import { useState, useEffect, useRef } from 'react';
import { useMap } from '../../../hooks/useMap';
import L from 'leaflet';
import {
  routeThroughWaypoints,
  combineRouteSegments,
  resamplePath,
  RoutingProfile,
} from '../../../utils/routing';
import {
  convertToGPSPoints,
  calculateAverageSpacing,
} from '../../../utils/interpolation';

type ToolMode = 'selectStart' | 'selectEnd' | 'placeWaypoints' | 'freehandDraw' | 'preview';
type DrawingMode = 'snap-to-road' | 'freehand';

function getMap(): L.Map | null {
  const el = document.querySelector('.leaflet-container');
  return el ? (el as unknown as { _leaflet_map: L.Map })._leaflet_map ?? null : null;
}

/**
 * Redraw Section tool.
 * Snap-to-road: place waypoints, OSRM routes between them.
 * Freehand: hold and drag to sketch a path directly on the map.
 */
export function RedrawTool() {
  const { editedTrack, setEditedTrack, setPreviewTrack } = useMap();

  const [mode, setMode] = useState<ToolMode>('selectStart');
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('snap-to-road');
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);
  const [waypoints, setWaypoints] = useState<L.LatLng[]>([]);
  const [routingProfile, setRoutingProfile] = useState<RoutingProfile>('bike');
  const [isRouting, setIsRouting] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [routingStatus, setRoutingStatus] = useState<boolean[]>([]);

  // Freehand drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [freehandPoints, setFreehandPoints] = useState<L.LatLng[]>([]);

  const mapRef = useRef<L.Map | null>(null);
  const selectionMarkersRef = useRef<L.CircleMarker[]>([]);
  const waypointMarkersRef = useRef<L.Marker[]>([]);
  const waypointLineRef = useRef<L.Polyline | null>(null);
  const freehandLineRef = useRef<L.Polyline | null>(null);
  const freehandPointsRef = useRef<L.LatLng[]>([]);
  const isDrawingRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      selectionMarkersRef.current.forEach((m) => m.remove());
      waypointMarkersRef.current.forEach((m) => m.remove());
      if (waypointLineRef.current) waypointLineRef.current.remove();
      if (freehandLineRef.current) freehandLineRef.current.remove();
      setPreviewTrack(null);
    };
  }, [setPreviewTrack]);

  // ─── Snap-to-road: update preview whenever waypoints change ──────────────
  useEffect(() => {
    if (drawingMode !== 'snap-to-road') return;
    if (mode !== 'placeWaypoints' && mode !== 'preview') return;
    if (startIndex === null || endIndex === null || waypoints.length === 0) return;

    let cancelled = false;

    const updatePreview = async () => {
      if (!editedTrack) return;
      setIsRouting(true);
      setRoutingError(null);

      try {
        const startPt = L.latLng(editedTrack.points[startIndex].lat, editedTrack.points[startIndex].lng);
        const endPt = L.latLng(editedTrack.points[endIndex].lat, editedTrack.points[endIndex].lng);
        const allPoints = [startPt, ...waypoints, endPt];

        const { segments, routingStatus: status } = await routeThroughWaypoints(allPoints, routingProfile);
        if (cancelled) return;
        setRoutingStatus(status);

        const combinedPoints = combineRouteSegments(segments);
        const targetSpacing = calculateAverageSpacing(editedTrack);
        const resampledPoints = resamplePath(combinedPoints, targetSpacing);
        const newGPSPoints = convertToGPSPoints(
          resampledPoints,
          editedTrack.points[startIndex],
          editedTrack.points[endIndex],
          editedTrack
        );
        setPreviewTrack(editedTrack.replaceSection(startIndex, endIndex, newGPSPoints));
      } catch (err) {
        if (!cancelled) {
          setRoutingError(err instanceof Error ? err.message : 'Routing failed');
          setPreviewTrack(null);
        }
      } finally {
        if (!cancelled) setIsRouting(false);
      }
    };

    updatePreview();
    return () => { cancelled = true; };
  }, [waypoints, routingProfile, startIndex, endIndex, editedTrack, mode, drawingMode, setPreviewTrack]);

  // ─── Freehand: update preview whenever freehandPoints change ─────────────
  useEffect(() => {
    if (drawingMode !== 'freehand') return;
    if (mode !== 'freehandDraw' && mode !== 'preview') return;
    if (startIndex === null || endIndex === null || freehandPoints.length < 2) return;
    if (!editedTrack) return;

    const targetSpacing = calculateAverageSpacing(editedTrack);
    const rawPath = freehandPoints.map((p) => ({ lat: p.lat, lng: p.lng }));
    const resampledPoints = resamplePath(rawPath, targetSpacing);
    const newGPSPoints = convertToGPSPoints(
      resampledPoints,
      editedTrack.points[startIndex],
      editedTrack.points[endIndex],
      editedTrack
    );
    setPreviewTrack(editedTrack.replaceSection(startIndex, endIndex, newGPSPoints));
  }, [freehandPoints, startIndex, endIndex, editedTrack, mode, drawingMode, setPreviewTrack]);

  // ─── Find closest track point ─────────────────────────────────────────────
  const findClosestTrackPoint = (latlng: L.LatLng): number => {
    if (!editedTrack) return 0;
    let minDist = Infinity;
    let closest = 0;
    editedTrack.points.forEach((pt, i) => {
      const d = latlng.distanceTo([pt.lat, pt.lng]);
      if (d < minDist) { minDist = d; closest = i; }
    });
    return closest;
  };

  // ─── Handle map clicks for start/end selection ────────────────────────────
  const handleTrackClick = (e: L.LeafletMouseEvent) => {
    if (mode === 'selectStart') {
      const idx = findClosestTrackPoint(e.latlng);
      setStartIndex(idx);
      addSelectionMarker(idx, 'START');
      setMode('selectEnd');
    } else if (mode === 'selectEnd') {
      const idx = findClosestTrackPoint(e.latlng);
      if (startIndex !== null && idx > startIndex) {
        setEndIndex(idx);
        addSelectionMarker(idx, 'END');
        setMode(drawingMode === 'freehand' ? 'freehandDraw' : 'placeWaypoints');
      }
    }
  };

  const addSelectionMarker = (idx: number, label: string) => {
    const map = mapRef.current;
    if (!map || !editedTrack) return;
    const pt = editedTrack.points[idx];
    const m = L.circleMarker([pt.lat, pt.lng], {
      radius: 10, color: '#fc4c02', fillColor: '#fc4c02', fillOpacity: 0.5, weight: 3,
    });
    m.addTo(map).bindTooltip(label, { permanent: true, direction: 'top' });
    selectionMarkersRef.current.push(m);
  };

  // ─── Snap-to-road: map click → place waypoint ────────────────────────────
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (mode !== 'placeWaypoints') return;

    const newWaypoints = [...waypoints, e.latlng];
    setWaypoints(newWaypoints);

    const markerNum = newWaypoints.length;
    const icon = L.divIcon({
      html: `<div style="
        background:#3b82f6;color:white;border-radius:50%;
        width:28px;height:28px;display:flex;align-items:center;
        justify-content:center;font-weight:bold;font-size:12px;
        border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4)
      ">${markerNum}</div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker(e.latlng, { icon, draggable: true });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const i = waypointMarkersRef.current.indexOf(marker);
      if (i !== -1) {
        const updated = [...waypoints];
        updated[i] = pos;
        setWaypoints(updated);
        updateWaypointLine(updated);
      }
    });

    marker.on('contextmenu', () => {
      const i = waypointMarkersRef.current.indexOf(marker);
      if (i !== -1) {
        const updated = waypoints.filter((_, j) => j !== i);
        setWaypoints(updated);
        marker.remove();
        waypointMarkersRef.current.splice(i, 1);
        renumberWaypointIcons();
        updateWaypointLine(updated);
      }
    });

    if (mapRef.current) {
      marker.addTo(mapRef.current);
      waypointMarkersRef.current.push(marker);
      updateWaypointLine(newWaypoints);
    }
  };

  const renumberWaypointIcons = () => {
    waypointMarkersRef.current.forEach((m, i) => {
      m.setIcon(L.divIcon({
        html: `<div style="
          background:#3b82f6;color:white;border-radius:50%;
          width:28px;height:28px;display:flex;align-items:center;
          justify-content:center;font-weight:bold;font-size:12px;
          border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4)
        ">${i + 1}</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }));
    });
  };

  const updateWaypointLine = (wpts: L.LatLng[]) => {
    if (waypointLineRef.current) { waypointLineRef.current.remove(); waypointLineRef.current = null; }
    if (wpts.length > 0 && mapRef.current) {
      waypointLineRef.current = L.polyline(wpts, {
        color: '#3b82f6', weight: 2, opacity: 0.5, dashArray: '5,5',
      }).addTo(mapRef.current);
    }
  };

  // ─── Freehand mouse handlers ──────────────────────────────────────────────
  const startFreehandDraw = (e: L.LeafletMouseEvent) => {
    if (mode !== 'freehandDraw') return;
    isDrawingRef.current = true;
    setIsDrawing(true);
    freehandPointsRef.current = [e.latlng];
    setFreehandPoints([e.latlng]);

    if (freehandLineRef.current) { freehandLineRef.current.remove(); freehandLineRef.current = null; }
    if (mapRef.current) {
      freehandLineRef.current = L.polyline([e.latlng], {
        color: '#10b981', weight: 3, opacity: 0.8,
      }).addTo(mapRef.current);
      // Disable map drag while drawing
      mapRef.current.dragging.disable();
    }
  };

  const continueFreehandDraw = (e: L.LeafletMouseEvent) => {
    if (!isDrawingRef.current) return;
    freehandPointsRef.current = [...freehandPointsRef.current, e.latlng];
    if (freehandLineRef.current) {
      freehandLineRef.current.setLatLngs(freehandPointsRef.current);
    }
  };

  const endFreehandDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);
    if (mapRef.current) mapRef.current.dragging.enable();

    const pts = freehandPointsRef.current;
    if (pts.length >= 2) {
      setFreehandPoints([...pts]);
      setMode('preview');
    }
  };

  // ─── Wire map event handlers based on mode ────────────────────────────────
  useEffect(() => {
    const map = getMap();
    if (!map) return;
    mapRef.current = map;

    // Always remove old handlers first
    map.off('click');
    map.off('mousedown');
    map.off('mousemove');
    map.off('mouseup');

    if (mode === 'selectStart' || mode === 'selectEnd') {
      map.on('click', handleTrackClick);
    } else if (mode === 'placeWaypoints') {
      map.on('click', handleMapClick);
    } else if (mode === 'freehandDraw') {
      map.on('mousedown', startFreehandDraw);
      map.on('mousemove', continueFreehandDraw);
      map.on('mouseup', endFreehandDraw);
    }

    return () => {
      map.off('click');
      map.off('mousedown');
      map.off('mousemove');
      map.off('mouseup');
      if (mapRef.current) mapRef.current.dragging.enable();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, startIndex, waypoints, drawingMode]);

  // ─── Apply the redrawn section ────────────────────────────────────────────
  const handleApply = async () => {
    if (startIndex === null || endIndex === null || !editedTrack) return;

    try {
      let rawPath: Array<{ lat: number; lng: number }>;

      if (drawingMode === 'freehand') {
        if (freehandPoints.length < 2) return;
        rawPath = freehandPoints.map((p) => ({ lat: p.lat, lng: p.lng }));
      } else {
        if (waypoints.length === 0) return;
        const startPt = L.latLng(editedTrack.points[startIndex].lat, editedTrack.points[startIndex].lng);
        const endPt = L.latLng(editedTrack.points[endIndex].lat, editedTrack.points[endIndex].lng);
        const { segments } = await routeThroughWaypoints(
          [startPt, ...waypoints, endPt],
          routingProfile
        );
        rawPath = combineRouteSegments(segments);
      }

      const targetSpacing = calculateAverageSpacing(editedTrack);
      const resampledPoints = resamplePath(rawPath, targetSpacing);
      const newGPSPoints = convertToGPSPoints(
        resampledPoints,
        editedTrack.points[startIndex],
        editedTrack.points[endIndex],
        editedTrack
      );
      setEditedTrack(editedTrack.replaceSection(startIndex, endIndex, newGPSPoints), true);
      handleReset();
    } catch (err) {
      setRoutingError(err instanceof Error ? err.message : 'Failed to apply');
    }
  };

  const handleReset = () => {
    setMode('selectStart');
    setStartIndex(null);
    setEndIndex(null);
    setWaypoints([]);
    setFreehandPoints([]);
    freehandPointsRef.current = [];
    setIsDrawing(false);
    isDrawingRef.current = false;
    setRoutingError(null);
    setRoutingStatus([]);
    setPreviewTrack(null);

    selectionMarkersRef.current.forEach((m) => m.remove());
    selectionMarkersRef.current = [];
    waypointMarkersRef.current.forEach((m) => m.remove());
    waypointMarkersRef.current = [];
    if (waypointLineRef.current) { waypointLineRef.current.remove(); waypointLineRef.current = null; }
    if (freehandLineRef.current) { freehandLineRef.current.remove(); freehandLineRef.current = null; }
    if (mapRef.current) mapRef.current.dragging.enable();
  };

  const handleSwitchDrawingMode = (dm: DrawingMode) => {
    // Reset section selection when switching modes
    setDrawingMode(dm);
    handleReset();
  };

  const getInstruction = () => {
    switch (mode) {
      case 'selectStart': return 'Click on the track to set the start of the section to redraw.';
      case 'selectEnd': return 'Click on the track to set the end of the section.';
      case 'placeWaypoints': return 'Click anywhere on the map to place waypoints along your route. Drag to adjust, right-click to remove.';
      case 'freehandDraw': return isDrawing
        ? 'Drawing — release the mouse when done.'
        : 'Hold the mouse button and drag to draw your route freehand.';
      case 'preview': return drawingMode === 'freehand'
        ? 'Preview shown. Apply to commit or Reset to start over.'
        : 'Preview shown. Adjust waypoints or Apply to commit.';
      default: return '';
    }
  };

  if (!editedTrack) return null;

  const failedSegments = routingStatus.filter((s) => !s).length;
  const canApply = drawingMode === 'freehand'
    ? freehandPoints.length >= 2 && !isDrawing
    : waypoints.length > 0 && !isRouting;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-white mb-3">Redraw Section</h3>

      <div className="space-y-3">
        {/* Drawing mode toggle — always visible */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Drawing Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSwitchDrawingMode('snap-to-road')}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${
                drawingMode === 'snap-to-road'
                  ? 'bg-strava-orange text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🛣️ Snap to Road
            </button>
            <button
              onClick={() => handleSwitchDrawingMode('freehand')}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${
                drawingMode === 'freehand'
                  ? 'bg-strava-orange text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ✏️ Freehand
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className={`rounded p-2.5 border text-xs leading-snug ${
          isDrawing
            ? 'bg-green-900/30 border-green-700 text-green-200'
            : 'bg-blue-900/30 border-blue-700 text-blue-200'
        }`}>
          {getInstruction()}
        </div>

        {/* Routing profile — snap-to-road only */}
        {drawingMode === 'snap-to-road' && (mode === 'placeWaypoints' || mode === 'preview') && (
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Routing Profile</label>
            <div className="grid grid-cols-2 gap-2">
              {(['bike', 'foot'] as RoutingProfile[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setRoutingProfile(p)}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${
                    routingProfile === p
                      ? 'bg-strava-orange text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {p === 'bike' ? '🚴 Cycling' : '🏃 Running/Walking'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {startIndex !== null && endIndex !== null && (
          <div className="bg-gray-900 rounded p-2.5 text-xs space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-400">Section:</span>
                <span className="ml-1 text-white font-semibold">{endIndex - startIndex + 1} pts</span>
              </div>
              {drawingMode === 'snap-to-road' && (
                <div>
                  <span className="text-gray-400">Waypoints:</span>
                  <span className="ml-1 text-white font-semibold">{waypoints.length}</span>
                </div>
              )}
              {drawingMode === 'freehand' && freehandPoints.length > 0 && (
                <div>
                  <span className="text-gray-400">Drawn pts:</span>
                  <span className="ml-1 text-white font-semibold">{freehandPoints.length}</span>
                </div>
              )}
            </div>
            {isRouting && (
              <div className="flex items-center gap-2 pt-1">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-blue-400">Routing via OSRM…</span>
              </div>
            )}
            {failedSegments > 0 && (
              <p className="text-yellow-400">
                ⚠️ {failedSegments} segment{failedSegments > 1 ? 's' : ''} using straight line
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {routingError && (
          <div className="bg-red-900/30 border border-red-700 rounded p-2 text-xs text-red-200">
            ⚠️ {routingError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleApply}
            disabled={!canApply}
            className="flex-1 px-3 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply Redraw
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
