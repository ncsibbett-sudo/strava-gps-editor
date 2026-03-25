import type { StravaActivity } from '../../types/strava';
import { RoutePreview } from './RoutePreview';
import type { ActivityHints } from '../../services/issueDetectionService';

interface ActivityCardProps {
  activity: StravaActivity;
  onSelect: (activityId: number) => void;
  isLoading?: boolean;
  selected?: boolean;
  onToggleSelect?: (activityId: number) => void;
  hints?: ActivityHints;
}

/**
 * Card component to display a single Strava activity
 */
export function ActivityCard({
  activity,
  onSelect,
  isLoading = false,
  selected = false,
  onToggleSelect,
  hints,
}: ActivityCardProps) {
  const activityDate = new Date(activity.start_date_local);
  const distanceKm = (activity.distance / 1000).toFixed(2);
  const durationMinutes = Math.floor(activity.moving_time / 60);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Format date as "Jan 15, 2024"
  const dateStr = activityDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Get activity icon based on type
  const getActivityIcon = (type: string) => {
    const lowerType = type.toLowerCase();

    // Skiing types
    if (lowerType.includes('ski') || lowerType.includes('snowboard')) {
      if (lowerType.includes('nordic') || lowerType.includes('crosscountry')) {
        return '🎿'; // Cross-country skis
      }
      return '⛷️'; // Downhill skier
    }

    switch (lowerType) {
      case 'run':
        return '🏃';
      case 'ride':
      case 'virtualride':
      case 'ebikeride':
      case 'mountainbikeride':
      case 'gravelride':
        return '🚴';
      case 'hike':
        return '🥾';
      case 'walk':
        return '🚶';
      case 'swim':
        return '🏊';
      case 'kayaking':
      case 'canoeing':
      case 'rowing':
        return '🚣';
      case 'iceSkate':
        return '⛸️';
      case 'inlineskate':
      case 'rollerski':
        return '⛸️';
      default:
        return '📍';
    }
  };

  return (
    <div
      onClick={() => !isLoading && onSelect(activity.id)}
      className={`relative bg-gray-800 rounded-lg p-4 transition-colors border ${
        isLoading
          ? 'border-strava-orange cursor-wait'
          : selected
          ? 'border-strava-orange bg-gray-750 cursor-pointer'
          : 'hover:bg-gray-700 cursor-pointer border-gray-700 hover:border-strava-orange'
      }`}
    >
      {/* Selection checkbox */}
      {onToggleSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(activity.id); }}
          className="absolute top-2 left-2 z-20 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
          style={{
            backgroundColor: selected ? 'rgb(252,76,2)' : 'rgba(17,24,39,0.8)',
            borderColor: selected ? 'rgb(252,76,2)' : 'rgb(107,114,128)',
          }}
          title={selected ? 'Deselect' : 'Select'}
        >
          {selected && <span className="text-white text-xs leading-none">✓</span>}
        </button>
      )}
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/70 rounded-lg flex items-center justify-center z-10">
          <div className="flex items-center gap-3 bg-gray-800 px-4 py-2 rounded-lg border border-strava-orange">
            <div className="w-4 h-4 border-2 border-strava-orange border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-white font-medium">Loading GPS data...</span>
          </div>
        </div>
      )}
      {/* Route Preview */}
      {activity.map?.summary_polyline && (
        <div className="mb-3">
          <RoutePreview summaryPolyline={activity.map.summary_polyline} className="w-full h-48" />
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">
            {activity.name}
          </h3>
          <p className="text-sm text-gray-400">{dateStr}</p>
        </div>
        <span className="text-2xl ml-2">{getActivityIcon(activity.type)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="bg-gray-900 rounded px-3 py-2">
          <p className="text-xs text-gray-400">Distance</p>
          <p className="text-sm font-semibold text-white">{distanceKm} km</p>
        </div>
        <div className="bg-gray-900 rounded px-3 py-2">
          <p className="text-xs text-gray-400">Duration</p>
          <p className="text-sm font-semibold text-white">{durationStr}</p>
        </div>
        <div className="bg-gray-900 rounded px-3 py-2">
          <p className="text-xs text-gray-400">Type</p>
          <p className="text-sm font-semibold text-white">{activity.type}</p>
        </div>
      </div>

      {activity.total_elevation_gain > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          Elevation: {Math.round(activity.total_elevation_gain)}m
        </div>
      )}

      {/* View on Strava link */}
      <a
        href={`https://www.strava.com/activities/${activity.id}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-2 inline-flex items-center gap-1 text-xs text-strava-orange hover:underline"
      >
        View on Strava ↗
      </a>

      {/* Issue badges */}
      {hints && hints.issueCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {hints.likelyHasSpikes && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-900/50 border border-red-700 rounded text-xs text-red-300">
              🎯 Spikes
            </span>
          )}
          {hints.missingElevation && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-900/50 border border-yellow-700 rounded text-xs text-yellow-300">
              ⛰️ No elevation
            </span>
          )}
          {hints.noGPS && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-700 border border-gray-600 rounded text-xs text-gray-400">
              📍 No GPS
            </span>
          )}
        </div>
      )}
    </div>
  );
}
