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

  const { originalTrack, editedTrack, previewTrack, viewMode, tileLayer } = useMap();

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

  // Update track visualization
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing track layers
    if (trackLayersRef.current.original) {
      trackLayersRef.current.original.remove();
      trackLayersRef.current.original = null;
    }
    if (trackLayersRef.current.edited) {
      trackLayersRef.current.edited.remove();
      trackLayersRef.current.edited = null;
    }
    if (trackLayersRef.current.preview) {
      trackLayersRef.current.preview.remove();
      trackLayersRef.current.preview = null;
    }

    // Add original track if needed
    if (originalTrack && (viewMode === 'original' || viewMode === 'both')) {
      const coords: L.LatLngExpression[] = originalTrack.points.map((p) => [p.lat, p.lng]);
      const originalPolyline = L.polyline(coords, {
        color: viewMode === 'both' ? '#3b82f6' : '#fc4c02', // Blue if both, orange if original only
        weight: 3,
        opacity: 0.8,
      }).addTo(mapRef.current);

      trackLayersRef.current.original = originalPolyline;

      // Fit bounds to original track
      if (viewMode === 'original') {
        mapRef.current.fitBounds(originalPolyline.getBounds(), { padding: [50, 50] });
      }
    }

    // Add edited track if needed (but not if we have a preview)
    if (editedTrack && !previewTrack && (viewMode === 'edited' || viewMode === 'both')) {
      const coords: L.LatLngExpression[] = editedTrack.points.map((p) => [p.lat, p.lng]);
      const editedPolyline = L.polyline(coords, {
        color: viewMode === 'both' ? '#fc4c02' : '#fc4c02', // Orange
        weight: 3,
        opacity: 0.8,
      }).addTo(mapRef.current);

      trackLayersRef.current.edited = editedPolyline;

      // Fit bounds to edited track
      if (viewMode === 'edited') {
        mapRef.current.fitBounds(editedPolyline.getBounds(), { padding: [50, 50] });
      }
    }

    // Add preview track if available (shows instead of edited track)
    if (previewTrack && (viewMode === 'edited' || viewMode === 'both')) {
      const coords: L.LatLngExpression[] = previewTrack.points.map((p) => [p.lat, p.lng]);
      const previewPolyline = L.polyline(coords, {
        color: '#3b82f6', // Blue for preview
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10', // Dashed line to indicate preview
      }).addTo(mapRef.current);

      trackLayersRef.current.preview = previewPolyline;
    }

    // Fit bounds logic
    if (viewMode === 'both') {
      const bounds = L.latLngBounds([]);
      let hasBounds = false;

      if (trackLayersRef.current.original) {
        bounds.extend(trackLayersRef.current.original.getBounds());
        hasBounds = true;
      }
      if (trackLayersRef.current.edited) {
        bounds.extend(trackLayersRef.current.edited.getBounds());
        hasBounds = true;
      }
      if (trackLayersRef.current.preview) {
        bounds.extend(trackLayersRef.current.preview.getBounds());
        hasBounds = true;
      }

      if (hasBounds && mapRef.current) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [originalTrack, editedTrack, previewTrack, viewMode]);

  return (
    <div
      ref={mapContainerRef}
      className={`w-full h-full bg-gray-800 rounded-lg ${className}`}
      style={{ minHeight: '500px' }}
    />
  );
}
