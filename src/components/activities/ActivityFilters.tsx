import { useState } from 'react';
import { useActivities } from '../../hooks/useActivities';

/**
 * Activity search and filter component
 */
export function ActivityFilters() {
  const { filters, setFilters, applyFilters } = useActivities();
  const [localFilters, setLocalFilters] = useState(filters);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchQuery = e.target.value;
    setLocalFilters({ ...localFilters, searchQuery });
    setFilters({ searchQuery });
    applyFilters();
  };

  const handleSportTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sportType = e.target.value || undefined;
    setLocalFilters({ ...localFilters, sportType });
    setFilters({ sportType });
    applyFilters();
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startDate = e.target.value ? new Date(e.target.value) : undefined;
    setLocalFilters({ ...localFilters, startDate });
    setFilters({ startDate });
    applyFilters();
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const endDate = e.target.value ? new Date(e.target.value) : undefined;
    setLocalFilters({ ...localFilters, endDate });
    setFilters({ endDate });
    applyFilters();
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      searchQuery: '',
      startDate: undefined,
      endDate: undefined,
      sportType: undefined,
    };
    setLocalFilters(emptyFilters);
    setFilters(emptyFilters);
    applyFilters();
  };

  const hasActiveFilters =
    filters.searchQuery || filters.startDate || filters.endDate || filters.sportType;

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Search
          </label>
          <input
            type="text"
            placeholder="Search activities..."
            value={localFilters.searchQuery}
            onChange={handleSearchChange}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-strava-orange"
          />
        </div>

        {/* Sport Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sport Type
          </label>
          <select
            value={localFilters.sportType || ''}
            onChange={handleSportTypeChange}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-strava-orange"
          >
            <option value="">All Types</option>
            <option value="Run">Run</option>
            <option value="Ride">Ride</option>
            <option value="Hike">Hike</option>
            <option value="Walk">Walk</option>
            <option value="Swim">Swim</option>
            <option value="VirtualRide">Virtual Ride</option>
            <option value="VirtualRun">Virtual Run</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            From Date
          </label>
          <input
            type="date"
            value={
              localFilters.startDate
                ? localFilters.startDate.toISOString().split('T')[0]
                : ''
            }
            onChange={handleStartDateChange}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-strava-orange"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            To Date
          </label>
          <input
            type="date"
            value={
              localFilters.endDate
                ? localFilters.endDate.toISOString().split('T')[0]
                : ''
            }
            onChange={handleEndDateChange}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-strava-orange"
          />
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="mt-4">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
