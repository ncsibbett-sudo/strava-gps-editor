import { useState } from 'react';
import { useActivities } from '../../hooks/useActivities';
import type { SortField } from '../../stores/activityStore';

/**
 * Activity search and filter component
 */
export function ActivityFilters() {
  const { filters, setFilters, applyFilters, getSportTypesByFrequency } = useActivities();
  const [localFilters, setLocalFilters] = useState(filters);

  // Get sport types sorted by frequency
  const sportTypes = getSportTypesByFrequency();

  const update = (partial: Partial<typeof filters>) => {
    setLocalFilters((prev) => ({ ...prev, ...partial }));
    setFilters(partial);
    applyFilters();
  };

  const handleClearFilters = () => {
    const reset = {
      searchQuery: '',
      startDate: undefined,
      endDate: undefined,
      sportType: undefined,
      missingElevation: false,
    };
    setLocalFilters((prev) => ({ ...prev, ...reset }));
    setFilters(reset);
    applyFilters();
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.startDate ||
    filters.endDate ||
    filters.sportType ||
    filters.missingElevation;

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
          <input
            type="text"
            placeholder="Search activities..."
            value={localFilters.searchQuery}
            onChange={(e) => update({ searchQuery: e.target.value })}
            className="w-full px-3 py-2 min-h-[44px] bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-strava-orange"
          />
        </div>

        {/* Sport Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Sport Type</label>
          <select
            value={localFilters.sportType || ''}
            onChange={(e) => update({ sportType: e.target.value || undefined })}
            className="w-full px-3 py-2 min-h-[44px] bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-strava-orange"
          >
            <option value="">All Types</option>
            {sportTypes.map(({ type, count }) => (
              <option key={type} value={type}>
                {type} ({count})
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">From Date</label>
          <input
            type="date"
            value={localFilters.startDate ? localFilters.startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => update({ startDate: e.target.value ? new Date(e.target.value) : undefined })}
            className="w-full px-3 py-2 min-h-[44px] bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-strava-orange"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">To Date</label>
          <input
            type="date"
            value={localFilters.endDate ? localFilters.endDate.toISOString().split('T')[0] : ''}
            onChange={(e) => update({ endDate: e.target.value ? new Date(e.target.value) : undefined })}
            className="w-full px-3 py-2 min-h-[44px] bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-strava-orange"
          />
        </div>
      </div>

      {/* Second row: Sort + Missing Elevation */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {/* Sort By */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-300 whitespace-nowrap">Sort by</label>
          <select
            value={localFilters.sortBy}
            onChange={(e) => update({ sortBy: e.target.value as SortField })}
            className="px-3 py-1.5 min-h-[36px] bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-strava-orange"
          >
            <option value="date">Date</option>
            <option value="distance">Distance</option>
            <option value="duration">Duration</option>
            <option value="name">Name</option>
          </select>
          <button
            onClick={() => update({ sortOrder: localFilters.sortOrder === 'asc' ? 'desc' : 'asc' })}
            className="px-2 py-1.5 min-h-[36px] bg-gray-900 border border-gray-700 rounded text-white text-sm hover:bg-gray-700 transition-colors"
            title={localFilters.sortOrder === 'asc' ? 'Ascending — click to reverse' : 'Descending — click to reverse'}
          >
            {localFilters.sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>
        </div>

        {/* Missing Elevation */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={localFilters.missingElevation}
            onChange={(e) => update({ missingElevation: e.target.checked })}
            className="w-4 h-4 accent-strava-orange"
          />
          <span className="text-sm text-gray-300">Missing elevation only</span>
        </label>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="ml-auto px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
