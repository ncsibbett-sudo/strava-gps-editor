import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from '../../hooks/useMap';

interface MapViewProps {
  className?: string;
}

// Tile layer URLs
const TILE_LAYERS = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
  },
};

/**
 * Leaflet map component for displaying GPS tracks
 */
export function MapView({ className = '' }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const trackLayersRef = useRef<{
    original: L.Polyline | null;
    edited: L.Polyline | null;
    preview: L.Polyline | null;
  }>({ original: null, edited: null, preview: null });
  // Track the last originalTrack identity so we only fitBounds on first load
  const lastFitTrackRef = useRef<object | null>(null);
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null);

  const { originalTrack, editedTrack, previewTrack, viewMode, tileLayer, hoveredPointIndex } = useMap();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: [40.7128, -74.0060], // Default to NYC
      zoom: 13,
      zoomControl: true,
    });

    // Add initial tile layer
    const layer = L.tileLayer(TILE_LAYERS.streets.url, {
      attribution: TILE_LAYERS.streets.attribution,
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    tileLayerRef.current = layer;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update tile layer when changed
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    const selectedLayer = TILE_LAYERS[tileLayer];
    tileLayerRef.current.setUrl(selectedLayer.url);
    tileLayerRef.current.options.attribution = selectedLayer.attribution;
  }, [tileLayer]);

  // Update track visualization — uses setLatLngs to avoid costly DOM remove+recreate
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const isNewTrack = originalTrack && originalTrack !== lastFitTrackRef.current;
    if (isNewTrack) lastFitTrackRef.current = originalTrack;

    const POLYLINE_OPTS = { weight: 3, opacity: 0.8, smoothFactor: 2 } as const;

    // ── Original polyline ───────────────────────────────────────────────────
    const showOriginal = !!(originalTrack && (viewMode === 'original' || viewMode === 'both'));
    if (showOriginal) {
      const coords: L.LatLngExpression[] = originalTrack!.points.map((p) => [p.lat, p.lng]);
      const color = viewMode === 'both' ? '#3b82f6' : '#fc4c02';
      if (trackLayersRef.current.original) {
        trackLayersRef.current.original.setLatLngs(coords);
        trackLayersRef.current.original.setStyle({ color });
      } else {
        trackLayersRef.current.original = L.polyline(coords, { ...POLYLINE_OPTS, color }).addTo(map);
      }
    } else if (trackLayersRef.current.original) {
      trackLayersRef.current.original.remove();
      trackLayersRef.current.original = null;
    }

    // ── Edited polyline (hidden when preview is active) ─────────────────────
    const showEdited = !!(editedTrack && !previewTrack && (viewMode === 'edited' || viewMode === 'both'));
    if (showEdited) {
      const coords: L.LatLngExpression[] = editedTrack!.points.map((p) => [p.lat, p.lng]);
      if (trackLayersRef.current.edited) {
        trackLayersRef.current.edited.setLatLngs(coords);
      } else {
        trackLayersRef.current.edited = L.polyline(coords, { ...POLYLINE_OPTS, color: '#fc4c02' }).addTo(map);
      }
    } else if (trackLayersRef.current.edited) {
      trackLayersRef.current.edited.remove();
      trackLayersRef.current.edited = null;
    }

    // ── Preview polyline ────────────────────────────────────────────────────
    const showPreview = !!(previewTrack && (viewMode === 'edited' || viewMode === 'both'));
    if (showPreview) {
      const coords: L.LatLngExpression[] = previewTrack!.points.map((p) => [p.lat, p.lng]);
      if (trackLayersRef.current.preview) {
        trackLayersRef.current.preview.setLatLngs(coords);
      } else {
        trackLayersRef.current.preview = L.polyline(coords, {
          ...POLYLINE_OPTS, color: '#3b82f6', opacity: 0.7, dashArray: '10, 10',
        }).addTo(map);
      }
    } else if (trackLayersRef.current.preview) {
      trackLayersRef.current.preview.remove();
      trackLayersRef.current.preview = null;
    }

    // Only fitBounds on first load
    if (isNewTrack) {
      const bounds = L.latLngBounds([]);
      let hasBounds = false;
      if (trackLayersRef.current.original) { bounds.extend(trackLayersRef.current.original.getBounds()); hasBounds = true; }
      if (trackLayersRef.current.edited) { bounds.extend(trackLayersRef.current.edited.getBounds()); hasBounds = true; }
      if (hasBounds) map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [originalTrack, editedTrack, previewTrack, viewMode]);

  // Show/move hover marker when elevation chart is hovered
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing hover marker
    if (hoverMarkerRef.current) {
      hoverMarkerRef.current.remove();
      hoverMarkerRef.current = null;
    }

    if (hoveredPointIndex === null) return;

    // Get the active track to find the point
    const activeTrack = editedTrack || originalTrack;
    if (!activeTrack) return;

    const point = activeTrack.points[hoveredPointIndex];
    if (!point) return;

    hoverMarkerRef.current = L.circleMarker([point.lat, point.lng], {
      radius: 7,
      color: '#fff',
      fillColor: '#fc4c02',
      fillOpacity: 1,
      weight: 2,
    }).addTo(mapRef.current);
  }, [hoveredPointIndex, editedTrack, originalTrack]);

  return (
    <div
      ref={mapContainerRef}
      className={`w-full h-full bg-gray-800 rounded-lg ${className}`}
      style={{ minHeight: '500px' }}
    />
  );
}
