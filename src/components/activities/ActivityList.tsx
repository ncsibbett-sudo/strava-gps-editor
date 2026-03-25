import { useEffect, useRef, useState } from 'react';
import { useActivities } from '../../hooks/useActivities';
import { ActivityCard } from './ActivityCard';
import { BatchFixDialog } from './BatchFixDialog';
import { useActivityStore } from '../../stores/activityStore';

interface ActivityListProps {
  onActivitySelect: (activityId: number) => void;
}

/**
 * Activity list component with pagination and bulk selection
 * Displays user's Strava activities in a grid
 */
export function ActivityList({ onActivitySelect }: ActivityListProps) {
  const {
    activities,
    filteredActivities,
    isLoading,
    isLoadingTrack,
    error,
    hasMore,
    loadActivities,
    loadMore,
  } = useActivities();
  const activityHints = useActivityStore((s) => s.activityHints);

  const [loadingActivityId, setLoadingActivityId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBatchFix, setShowBatchFix] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Clear loading card indicator once the track finishes loading
  useEffect(() => {
    if (!isLoadingTrack) setLoadingActivityId(null);
  }, [isLoadingTrack]);

  const handleSelect = (activityId: number) => {
    setLoadingActivityId(activityId);
    onActivitySelect(activityId);
  };

  const handleToggleSelect = (activityId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(activityId)) next.delete(activityId);
      else next.add(activityId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredActivities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredActivities.map((a) => a.id)));
    }
  };

  const handleClearSelection = () => setSelectedIds(new Set());

  // Load activities on mount
  useEffect(() => {
    if (filteredActivities.length === 0 && !isLoading && !error) {
      loadActivities(1);
    }
  }, [filteredActivities.length, isLoading, error, loadActivities]);

  // Infinite scroll via IntersectionObserver on the sentinel div
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

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
    const hasActivities = activities.length > 0;
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-400">
          {hasActivities ? 'No activities match your filters' : 'No activities found'}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {hasActivities
            ? 'Try clearing or adjusting your search filters.'
            : 'Upload some activities to Strava to get started.'}
        </p>
        {hasActivities && (
          <button
            onClick={() => {
              const store = useActivityStore.getState();
              store.setFilters({
                searchQuery: '',
                startDate: undefined,
                endDate: undefined,
                sportType: undefined,
                missingElevation: false,
              });
              store.applyFilters();
            }}
            className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  const allSelected = selectedIds.size === filteredActivities.length && filteredActivities.length > 0;

  return (
    <div>
      {/* Toolbar row */}
      <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-400 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 accent-strava-orange"
            />
            {allSelected ? 'Deselect all' : 'Select all'}
          </label>
          {selectedIds.size > 0 && (
            <span className="text-sm text-strava-orange font-medium">
              {selectedIds.size} selected
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {filteredActivities.length} activit{filteredActivities.length === 1 ? 'y' : 'ies'}
        </span>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 mb-4 flex-wrap">
          <span className="text-sm text-white font-medium">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button
            onClick={() => setShowBatchFix(true)}
            className="px-3 py-1.5 bg-strava-orange hover:bg-orange-600 text-white rounded text-sm font-semibold transition-colors"
            title="Remove spikes and fill gaps for all selected activities, then re-upload to Strava"
          >
            ⚡ Fix selected
          </button>
          <button
            onClick={handleClearSelection}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Batch fix dialog */}
      {showBatchFix && (
        <BatchFixDialog
          activities={filteredActivities.filter((a) => selectedIds.has(a.id))}
          onClose={() => setShowBatchFix(false)}
          onComplete={() => setSelectedIds(new Set())}
        />
      )}

      {/* Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActivities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onSelect={handleSelect}
            isLoading={isLoadingTrack && activity.id === loadingActivityId}
            selected={selectedIds.has(activity.id)}
            onToggleSelect={handleToggleSelect}
            hints={activityHints[activity.id]}
          />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={loadMoreRef} className="mt-8 flex justify-center">
        {isLoading && filteredActivities.length > 0 && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-strava-orange" />
            <span className="text-sm">Loading more...</span>
          </div>
        )}
        {!hasMore && filteredActivities.length > 0 && (
          <p className="text-sm text-gray-600">All activities loaded</p>
        )}
      </div>
    </div>
  );
}
