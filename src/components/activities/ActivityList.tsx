import { useEffect } from 'react';
import { useActivities } from '../../hooks/useActivities';
import { ActivityCard } from './ActivityCard';

interface ActivityListProps {
  onActivitySelect: (activityId: number) => void;
}

/**
 * Activity list component with pagination
 * Displays user's Strava activities in a grid
 */
export function ActivityList({ onActivitySelect }: ActivityListProps) {
  const {
    filteredActivities,
    isLoading,
    error,
    hasMore,
    loadActivities,
    loadMore,
  } = useActivities();

  // Load activities on mount
  useEffect(() => {
    if (filteredActivities.length === 0 && !isLoading && !error) {
      loadActivities(1);
    }
  }, [filteredActivities.length, isLoading, error, loadActivities]);

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 text-red-200 p-6 rounded-lg max-w-2xl mx-auto">
        <h3 className="text-lg font-bold mb-2">Error Loading Activities</h3>
        <p>{error}</p>
        <button
          onClick={() => loadActivities(1)}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading && filteredActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-strava-orange mb-4"></div>
        <p className="text-gray-400">Loading your activities...</p>
      </div>
    );
  }

  if (filteredActivities.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-400">No activities found</p>
        <p className="text-sm text-gray-500 mt-2">
          Try adjusting your search filters or upload some activities to Strava
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActivities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onSelect={onActivitySelect}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="px-6 py-3 bg-strava-orange hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Loading...
              </span>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {/* Activity count */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Showing {filteredActivities.length} activities
      </div>
    </div>
  );
}
