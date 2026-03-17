import type { StravaActivity } from '../../types/strava';
import { RoutePreview } from './RoutePreview';

interface ActivityCardProps {
  activity: StravaActivity;
  onSelect: (activityId: number) => void;
}

/**
 * Card component to display a single Strava activity
 */
export function ActivityCard({ activity, onSelect }: ActivityCardProps) {
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
      onClick={() => onSelect(activity.id)}
      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 cursor-pointer transition-colors border border-gray-700 hover:border-strava-orange"
    >
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
    </div>
  );
}
