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

type ToolMode = 'selectStart' | 'selectEnd' | 'placeWaypoints' | 'preview';

/**
 * Redraw Section tool - allows redrawing sections of GPS track with waypoints and routing
 */
export function RedrawTool() {
  const { editedTrack, setEditedTrack, setPreviewTrack } = useMap();

  // Tool state
  const [mode, setMode] = useState<ToolMode>('selectStart');
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);
  const [waypoints, setWaypoints] = useState<L.LatLng[]>([]);
  const [routingProfile, setRoutingProfile] = useState<RoutingProfile>('bike');

  // Routing state
  const [isRouting, setIsRouting] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [routingStatus, setRoutingStatus] = useState<boolean[]>([]);

  // Map interaction refs
  const mapRef = useRef<L.Map | null>(null);
  const selectionMarkersRef = useRef<L.CircleMarker[]>([]);
  const waypointMarkersRef = useRef<L.Marker[]>([]);
  const waypointLineRef = useRef<L.Polyline | null>(null);

  if (!editedTrack) return null;

  // Clean up markers when tool unmounts or track changes
  useEffect(() => {
    return () => {
      selectionMarkersRef.current.forEach(marker => marker.remove());
      selectionMarkersRef.current = [];
      waypointMarkersRef.current.forEach(marker => marker.remove());
      waypointMarkersRef.current = [];
      if (waypointLineRef.current) {
        waypointLineRef.current.remove();
        waypointLineRef.current = null;
      }
      setPreviewTrack(null);
    };
  }, [setPreviewTrack]);

  // Update preview when waypoints or routing profile changes
  useEffect(() => {
    if (
      mode !== 'placeWaypoints' &&
      mode !== 'preview' ||
      startIndex === null ||
      endIndex === null ||
      waypoints.length === 0
    ) {
      return;
    }

    const updatePreview = async () => {
      setIsRouting(true);
      setRoutingError(null);

      try {
        // Build array of all points to route through
        const startPoint = L.latLng(
          editedTrack.points[startIndex].lat,
          editedTrack.points[startIndex].lng
        );
        const endPoint = L.latLng(
          editedTrack.points[endIndex].lat,
          editedTrack.points[endIndex].lng
        );
        const allPoints = [startPoint, ...waypoints, endPoint];

        // Route through all waypoints
        const { segments, routingStatus: status } = await routeThroughWaypoints(
          allPoints,
          routingProfile
        );
        setRoutingStatus(status);

        // Combine segments
        const combinedPoints = combineRouteSegments(segments);

        // Resample to consistent spacing
        const targetSpacing = calculateAverageSpacing(editedTrack);
        const resampledPoints = resamplePath(combinedPoints, targetSpacing);

        // Convert to GPS points with elevation/time interpolation
        const newGPSPoints = convertToGPSPoints(
          resampledPoints,
          editedTrack.points[startIndex],
          editedTrack.points[endIndex],
          editedTrack
        );

        // Create preview track
        const previewTrack = editedTrack.replaceSection(
          startIndex,
          endIndex,
          newGPSPoints
        );
        setPreviewTrack(previewTrack);
      } catch (error) {
        console.error('Routing error:', error);
        setRoutingError(error instanceof Error ? error.message : 'Routing failed');
        setPreviewTrack(null);
      } finally {
        setIsRouting(false);
      }
    };

    updatePreview();
  }, [waypoints, routingProfile, startIndex, endIndex, editedTrack, mode, setPreviewTrack]);

  // Find closest point on track to click location
  const findClosestTrackPoint = (clickLatLng: L.LatLng): number => {
    let minDistance = Infinity;
    let closestIndex = 0;

    editedTrack.points.forEach((point, index) => {
      const distance = clickLatLng.distanceTo([point.lat, point.lng]);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  };

  // Handle track click for start/end point selection
  const handleTrackClick = (e: L.LeafletMouseEvent) => {
    if (mode === 'selectStart') {
      const index = findClosestTrackPoint(e.latlng);
      setStartIndex(index);

      // Add selection marker
      const marker = L.circleMarker(
        [editedTrack.points[index].lat, editedTrack.points[index].lng],
        {
          radius: 10,
          color: '#fc4c02',
          fillColor: '#fc4c02',
          fillOpacity: 0.5,
          weight: 3,
        }
      );

      if (mapRef.current) {
        marker.addTo(mapRef.current);
        marker.bindTooltip('START', { permanent: true, direction: 'top' });
        selectionMarkersRef.current.push(marker);
      }

      setMode('selectEnd');
    } else if (mode === 'selectEnd') {
      const index = findClosestTrackPoint(e.latlng);

      // Ensure end is after start
      if (startIndex !== null && index > startIndex) {
        setEndIndex(index);

        // Add selection marker
        const marker = L.circleMarker(
          [editedTrack.points[index].lat, editedTrack.points[index].lng],
          {
            radius: 10,
            color: '#fc4c02',
            fillColor: '#fc4c02',
            fillOpacity: 0.5,
            weight: 3,
          }
        );

        if (mapRef.current) {
          marker.addTo(mapRef.current);
          marker.bindTooltip('END', { permanent: true, direction: 'top' });
          selectionMarkersRef.current.push(marker);
        }

        setMode('placeWaypoints');
      }
    }
  };

  // Handle map click for waypoint placement
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (mode !== 'placeWaypoints') return;

    const newWaypoint = e.latlng;
    const newWaypoints = [...waypoints, newWaypoint];
    setWaypoints(newWaypoints);

    // Create waypoint marker
    const markerIndex = newWaypoints.length;
    const icon = L.divIcon({
      html: `<div style="
        background: ${markerIndex === 1 ? '#10b981' : '#3b82f6'};
        color: white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${markerIndex}</div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker(newWaypoint, {
      icon,
      draggable: true,
    });

    marker.on('dragend', (e) => {
      const marker = e.target as L.Marker;
      const newPos = marker.getLatLng();
      const index = waypointMarkersRef.current.indexOf(marker);
      if (index !== -1) {
        const updatedWaypoints = [...waypoints];
        updatedWaypoints[index] = newPos;
        setWaypoints(updatedWaypoints);
        updateWaypointLine(updatedWaypoints);
      }
    });

    marker.on('contextmenu', () => {
      const index = waypointMarkersRef.current.indexOf(marker);
      if (index !== -1) {
        const updatedWaypoints = waypoints.filter((_, i) => i !== index);
        setWaypoints(updatedWaypoints);
        marker.remove();
        waypointMarkersRef.current.splice(index, 1);

        // Re-number remaining markers
        waypointMarkersRef.current.forEach((m, i) => {
          const newIcon = L.divIcon({
            html: `<div style="
              background: ${i === 0 ? '#10b981' : i === waypointMarkersRef.current.length - 1 ? '#ef4444' : '#3b82f6'};
              color: white;
              border-radius: 50%;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              border: 3px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">${i + 1}</div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          m.setIcon(newIcon);
        });

        updateWaypointLine(updatedWaypoints);
      }
    });

    if (mapRef.current) {
      marker.addTo(mapRef.current);
      waypointMarkersRef.current.push(marker);
      updateWaypointLine(newWaypoints);
    }
  };

  // Update connecting line between waypoints
  const updateWaypointLine = (wpts: L.LatLng[]) => {
    if (waypointLineRef.current) {
      waypointLineRef.current.remove();
      waypointLineRef.current = null;
    }

    if (wpts.length > 0 && mapRef.current) {
      const line = L.polyline(wpts, {
        color: '#3b82f6',
        weight: 2,
        opacity: 0.6,
        dashArray: '5, 5',
      });
      line.addTo(mapRef.current);
      waypointLineRef.current = line;
    }
  };

  // Set up map event handlers
  useEffect(() => {
    // Get map instance from DOM (Leaflet map is already rendered by MapView)
    const mapElement = document.querySelector('.leaflet-container');
    if (mapElement && (mapElement as any)._leaflet_map) {
      mapRef.current = (mapElement as any)._leaflet_map;

      // Add click handlers
      if (mode === 'selectStart' || mode === 'selectEnd') {
        if (mapRef.current) mapRef.current.on('click', handleTrackClick);
      } else if (mode === 'placeWaypoints') {
        if (mapRef.current) mapRef.current.on('click', handleMapClick);
      }

      return () => {
        if (mapRef.current) {
          mapRef.current.off('click', handleTrackClick);
          mapRef.current.off('click', handleMapClick);
        }
      };
    }
  }, [mode, startIndex]);

  const handleApply = async () => {
    if (startIndex === null || endIndex === null || waypoints.length === 0) return;

    try {
      // Rebuild the modified track (same as preview logic)
      const startPoint = L.latLng(
        editedTrack.points[startIndex].lat,
        editedTrack.points[startIndex].lng
      );
      const endPoint = L.latLng(
        editedTrack.points[endIndex].lat,
        editedTrack.points[endIndex].lng
      );
      const allPoints = [startPoint, ...waypoints, endPoint];

      const { segments } = await routeThroughWaypoints(allPoints, routingProfile);
      const combinedPoints = combineRouteSegments(segments);
      const targetSpacing = calculateAverageSpacing(editedTrack);
      const resampledPoints = resamplePath(combinedPoints, targetSpacing);
      const newGPSPoints = convertToGPSPoints(
        resampledPoints,
        editedTrack.points[startIndex],
        editedTrack.points[endIndex],
        editedTrack
      );

      const modifiedTrack = editedTrack.replaceSection(startIndex, endIndex, newGPSPoints);
      setEditedTrack(modifiedTrack, true);
      handleReset();
    } catch (error) {
      console.error('Failed to apply redraw:', error);
    }
  };

  const handleReset = () => {
    setMode('selectStart');
    setStartIndex(null);
    setEndIndex(null);
    setWaypoints([]);
    setRoutingError(null);
    setRoutingStatus([]);
    setPreviewTrack(null);

    // Clear all markers
    selectionMarkersRef.current.forEach(marker => marker.remove());
    selectionMarkersRef.current = [];
    waypointMarkersRef.current.forEach(marker => marker.remove());
    waypointMarkersRef.current = [];
    if (waypointLineRef.current) {
      waypointLineRef.current.remove();
      waypointLineRef.current = null;
    }
  };

  const getInstructions = () => {
    switch (mode) {
      case 'selectStart':
        return 'Click on the track to select the start point of the section to redraw';
      case 'selectEnd':
        return 'Click on the track to select the end point of the section to redraw';
      case 'placeWaypoints':
      case 'preview':
        return 'Click on the map to place waypoints along your actual route. Drag to adjust, right-click to remove.';
      default:
        return '';
    }
  };

  const failedSegments = routingStatus.filter(status => !status).length;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-white mb-4">Redraw Section</h3>

      <div className="space-y-4">
        {/* Instructions */}
        <div className="bg-blue-900/30 border border-blue-700 rounded p-3">
          <p className="text-xs text-blue-200">{getInstructions()}</p>
        </div>

        {/* Routing Profile (only show when placing waypoints) */}
        {(mode === 'placeWaypoints' || mode === 'preview') && (
          <div>
            <label className="block text-xs text-gray-400 mb-2">Routing Profile</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRoutingProfile('bike')}
                className={`px-3 py-2 rounded text-xs transition-colors ${
                  routingProfile === 'bike'
                    ? 'bg-strava-orange text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Cycling
              </button>
              <button
                onClick={() => setRoutingProfile('foot')}
                className={`px-3 py-2 rounded text-xs transition-colors ${
                  routingProfile === 'foot'
                    ? 'bg-strava-orange text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Walking/Running
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        {startIndex !== null && endIndex !== null && (
          <div className="bg-gray-900 rounded p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Section:</span>
                <span className="ml-2 text-white font-semibold">
                  {endIndex - startIndex + 1} points
                </span>
              </div>
              <div>
                <span className="text-gray-400">Waypoints:</span>
                <span className="ml-2 text-white font-semibold">{waypoints.length}</span>
              </div>
            </div>
            {isRouting && (
              <p className="text-xs text-blue-400 mt-2">⏳ Routing...</p>
            )}
            {failedSegments > 0 && (
              <p className="text-xs text-yellow-400 mt-2">
                ⚠️ {failedSegments} segment{failedSegments > 1 ? 's' : ''} using straight line
              </p>
            )}
          </div>
        )}

        {/* Error Display */}
        {routingError && (
          <div className="bg-red-900/30 border border-red-700 rounded p-2 text-xs text-red-200">
            ⚠️ {routingError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleApply}
            disabled={waypoints.length === 0 || isRouting}
            className="flex-1 px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Redraw
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
