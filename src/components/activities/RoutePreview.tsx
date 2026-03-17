import { useMemo } from 'react';
import polyline from '@mapbox/polyline';

interface RoutePreviewProps {
  summaryPolyline: string;
  className?: string;
}

/**
 * Mini route preview component that renders a small SVG visualization
 * of the activity route from Strava's summary polyline
 */
export function RoutePreview({ summaryPolyline, className = '' }: RoutePreviewProps) {
  const svgPath = useMemo(() => {
    if (!summaryPolyline) return null;

    try {
      // Decode the polyline to get coordinates
      const coordinates = polyline.decode(summaryPolyline);

      if (coordinates.length === 0) return null;

      // Find bounds
      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLng = Infinity;
      let maxLng = -Infinity;

      coordinates.forEach(([lat, lng]: [number, number]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });

      // Calculate dimensions and scale
      const latRange = maxLat - minLat;
      const lngRange = maxLng - minLng;

      // Add padding
      const padding = 0.1;
      const paddedLatRange = latRange * (1 + padding);
      const paddedLngRange = lngRange * (1 + padding);

      // SVG dimensions
      const width = 100;
      const height = 60;

      // Scale coordinates to SVG space
      const scaleX = width / paddedLngRange;
      const scaleY = height / paddedLatRange;
      const scale = Math.min(scaleX, scaleY);

      // Center the route
      const offsetX = (width - lngRange * scale) / 2;
      const offsetY = (height - latRange * scale) / 2;

      // Convert coordinates to SVG path
      const pathData = coordinates
        .map(([lat, lng]: [number, number], index: number) => {
          const x = (lng - minLng) * scale + offsetX;
          const y = height - ((lat - minLat) * scale + offsetY); // Flip Y axis
          return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');

      return pathData;
    } catch (error) {
      console.error('Failed to decode polyline:', error);
      return null;
    }
  }, [summaryPolyline]);

  if (!svgPath) {
    return (
      <div className={`bg-gray-700 rounded flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-xs">No route</span>
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 100 60"
      className={`bg-gray-700 rounded ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d={svgPath}
        stroke="#fc4c02"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
