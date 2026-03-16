/**
 * Strava API types and interfaces
 */

export interface StravaActivity {
  id: number;
  name: string;
  type: string; // 'Run', 'Ride', 'Hike', etc.
  start_date: string; // ISO 8601 format
  start_date_local: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  sport_type: string;
  workout_type?: number;
  map: {
    id: string;
    summary_polyline: string;
    resource_state: number;
  };
}

export interface StravaActivityDetailed extends StravaActivity {
  description?: string;
  calories?: number;
  device_name?: string;
  average_speed?: number;
  max_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  start_latlng?: [number, number];
  end_latlng?: [number, number];
}

export interface StravaStream {
  type: string;
  data: number[] | [number, number][];
  series_type: string;
  original_size: number;
  resolution: string;
}

export interface StravaStreamsResponse {
  latlng?: StravaStream;
  altitude?: StravaStream;
  time?: StravaStream;
  distance?: StravaStream;
  velocity_smooth?: StravaStream;
  heartrate?: StravaStream;
  cadence?: StravaStream;
  watts?: StravaStream;
  temp?: StravaStream;
  moving?: StravaStream;
  grade_smooth?: StravaStream;
}

export interface StravaRateLimitInfo {
  shortTerm: {
    limit: number;
    usage: number;
  };
  longTerm: {
    limit: number;
    usage: number;
  };
}

export interface StravaAPIError {
  message: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}
