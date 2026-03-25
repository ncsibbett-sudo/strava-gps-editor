import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useMap } from '../../hooks/useMap';
import type { GPSTrack } from '../../models/GPSTrack';

interface ElevationPoint {
  dist: number; // km
  elev: number; // m
  index: number;
}

function buildElevationData(track: GPSTrack): ElevationPoint[] {
  const points = track.points;
  if (points.length === 0) return [];

  // Sample down to at most 500 points for performance
  const step = Math.max(1, Math.floor(points.length / 500));
  const data: ElevationPoint[] = [];
  let cumulativeDist = 0;

  for (let i = 0; i < points.length; i += step) {
    const p = points[i];
    if (i > 0) {
      const prev = points[i - step] ?? points[i - 1];
      const dx = (p.lat - prev.lat) * 111320;
      const dy = (p.lng - prev.lng) * 111320 * Math.cos((prev.lat * Math.PI) / 180);
      cumulativeDist += Math.sqrt(dx * dx + dy * dy);
    }
    if (p.elevation !== undefined && p.elevation !== null) {
      data.push({ dist: cumulativeDist / 1000, elev: Math.round(p.elevation), index: i });
    }
  }
  return data;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  hoveredIndex: number | null;
}

function CustomActiveDot({ cx, cy }: CustomDotProps) {
  if (cx === undefined || cy === undefined) return null;
  return <circle cx={cx} cy={cy} r={5} fill="#fc4c02" stroke="#fff" strokeWidth={2} />;
}

export function ElevationProfile() {
  const { originalTrack, editedTrack, viewMode, hoveredPointIndex, setHoveredPointIndex } = useMap();

  const activeTrack = viewMode === 'original' ? originalTrack : (editedTrack ?? originalTrack);
  if (!activeTrack) return null;

  const data = buildElevationData(activeTrack);
  if (data.length === 0) return null;

  const elevations = data.map((d) => d.elev);
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const range = maxElev - minElev;

  // If range is < 5m don't show the chart (flat track, no useful info)
  if (range < 5) return null;

  const hoveredData = hoveredPointIndex !== null
    ? data.find((d) => d.index === hoveredPointIndex) ?? null
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      const payload = e.activePayload[0].payload as ElevationPoint;
      setHoveredPointIndex(payload.index);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPointIndex(null);
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-4 pt-3 pb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-400">Elevation Profile</span>
        <span className="text-xs text-gray-500">
          ↑ {Math.round(maxElev)}m · ↓ {Math.round(minElev)}m · Δ {Math.round(range)}m
        </span>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fc4c02" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#fc4c02" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="dist"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(v) => `${v.toFixed(1)}km`}
            tickCount={5}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minElev - 5, maxElev + 5]}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(v) => `${v}m`}
            tickCount={3}
            width={40}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ElevationPoint;
              return (
                <div className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white shadow">
                  <span>{d.elev}m</span>
                  <span className="text-gray-400 ml-2">@ {d.dist.toFixed(2)}km</span>
                </div>
              );
            }}
          />
          {hoveredData && (
            <ReferenceLine x={hoveredData.dist} stroke="#fc4c02" strokeOpacity={0.6} strokeWidth={1} />
          )}
          <Area
            type="monotone"
            dataKey="elev"
            stroke="#fc4c02"
            strokeWidth={1.5}
            fill="url(#elevGrad)"
            dot={false}
            activeDot={<CustomActiveDot hoveredIndex={hoveredPointIndex} />}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
