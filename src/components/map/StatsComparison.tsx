import { GPSTrack } from '../../models/GPSTrack';

interface StatsComparisonProps {
  originalTrack: GPSTrack;
  editedTrack: GPSTrack;
  compact?: boolean;
}

interface StatRow {
  label: string;
  original: string;
  edited: string;
  delta: string;
  isSignificant: boolean;
  isPositive: boolean;
}

/**
 * Display before/after statistics comparison
 * Shows original vs edited track stats with deltas
 */
export function StatsComparison({ originalTrack, editedTrack, compact = false }: StatsComparisonProps) {
  // Calculate statistics
  const originalDistance = originalTrack.totalDistance / 1000; // km
  const editedDistance = editedTrack.totalDistance / 1000; // km
  const distanceDelta = editedDistance - originalDistance;

  const originalElevationGain = originalTrack.elevationGain; // m
  const editedElevationGain = editedTrack.elevationGain; // m
  const elevationDelta = editedElevationGain - originalElevationGain;

  // Calculate total time from first to last point
  const originalTime = originalTrack.points.length > 0
    ? (originalTrack.points[originalTrack.points.length - 1].time.getTime() -
       originalTrack.points[0].time.getTime()) / 1000 // seconds
    : 0;
  const editedTime = editedTrack.points.length > 0
    ? (editedTrack.points[editedTrack.points.length - 1].time.getTime() -
       editedTrack.points[0].time.getTime()) / 1000 // seconds
    : 0;
  const timeDelta = editedTime - originalTime;

  // Calculate average speed (km/h)
  const originalSpeed = originalTime > 0 ? (originalDistance / originalTime) * 3600 : 0;
  const editedSpeed = editedTime > 0 ? (editedDistance / editedTime) * 3600 : 0;
  const speedDelta = editedSpeed - originalSpeed;

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format delta with sign
  const formatDelta = (value: number, decimals: number = 1, unit: string = ''): string => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}${unit ? ' ' + unit : ''}`;
  };

  // Determine if change is significant
  const isSignificantDistance = Math.abs(distanceDelta) > 0.1; // > 100m
  const isSignificantElevation = Math.abs(elevationDelta) > 10; // > 10m
  const isSignificantTime = Math.abs(timeDelta) > 60; // > 1 minute
  const isSignificantSpeed = Math.abs(speedDelta) > 0.5; // > 0.5 km/h

  const stats: StatRow[] = [
    {
      label: 'Distance',
      original: `${originalDistance.toFixed(2)} km`,
      edited: `${editedDistance.toFixed(2)} km`,
      delta: formatDelta(distanceDelta, 2, 'km'),
      isSignificant: isSignificantDistance,
      isPositive: distanceDelta > 0,
    },
    {
      label: 'Elevation Gain',
      original: `${Math.round(originalElevationGain)} m`,
      edited: `${Math.round(editedElevationGain)} m`,
      delta: formatDelta(elevationDelta, 0, 'm'),
      isSignificant: isSignificantElevation,
      isPositive: elevationDelta > 0,
    },
    {
      label: 'Total Time',
      original: formatTime(originalTime),
      edited: formatTime(editedTime),
      delta: formatDelta(timeDelta, 0, 's'),
      isSignificant: isSignificantTime,
      isPositive: timeDelta > 0,
    },
    {
      label: 'Average Speed',
      original: `${originalSpeed.toFixed(1)} km/h`,
      edited: `${editedSpeed.toFixed(1)} km/h`,
      delta: formatDelta(speedDelta, 1, 'km/h'),
      isSignificant: isSignificantSpeed,
      isPositive: speedDelta > 0,
    },
  ];

  if (compact) {
    // Compact view - single line summary
    const hasChanges = stats.some(s => s.isSignificant);
    if (!hasChanges) {
      return (
        <div className="text-xs text-gray-400 italic">
          No significant changes to track statistics
        </div>
      );
    }

    return (
      <div className="text-xs text-gray-300">
        <span className="font-semibold">Changes:</span>{' '}
        {stats
          .filter(s => s.isSignificant)
          .map((s, i, arr) => (
            <span key={s.label}>
              {s.label}: {s.delta}
              {i < arr.length - 1 ? ', ' : ''}
            </span>
          ))}
      </div>
    );
  }

  // Full comparison view
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Before/After Comparison</h3>

      <div className="space-y-2">
        {stats.map(stat => (
          <div key={stat.label} className="text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-400 font-medium">{stat.label}:</span>
              <span
                className={`font-semibold ${
                  stat.isSignificant
                    ? stat.delta.startsWith('+')
                      ? 'text-yellow-400'
                      : 'text-red-400'
                    : 'text-gray-500'
                }`}
              >
                {stat.delta}
              </span>
            </div>

            <div className="flex justify-between text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Original:</span>
                <span className="font-mono">{stat.original}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Edited:</span>
                <span className="font-mono font-semibold text-white">{stat.edited}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary message */}
      <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
        {stats.every(s => !s.isSignificant) ? (
          <p className="italic">No significant changes detected.</p>
        ) : (
          <p>
            <span className="text-yellow-400 font-semibold">
              {stats.filter(s => s.isSignificant && s.delta.startsWith('+')).length}
            </span>{' '}
            increase{stats.filter(s => s.isSignificant && s.delta.startsWith('+')).length !== 1 ? 's' : ''},
            <span className="text-red-400 font-semibold ml-1">
              {stats.filter(s => s.isSignificant && !s.delta.startsWith('+')).length}
            </span>{' '}
            decrease{stats.filter(s => s.isSignificant && !s.delta.startsWith('+')).length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
