/**
 * Authentication types and interfaces
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // milliseconds timestamp
}

export interface AthleteProfile {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  profile: string; // URL to profile image
}

export interface AuthState {
  isAuthenticated: boolean;
  tokens: AuthTokens | null;
  athlete: AthleteProfile | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: () => void;
  logout: () => void;
  setTokens: (tokens: AuthTokens, athlete: AthleteProfile) => void;
  refreshAccessToken: () => Promise<void>;
  clearError: () => void;
}

export interface TokenExchangeRequest {
  code: string;
}

export interface TokenExchangeResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  athlete: AthleteProfile;
}

export interface TokenRefreshRequest {
  refreshToken: string;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
