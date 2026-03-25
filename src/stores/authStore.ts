import { create } from 'zustand';
import type { AuthState, AuthActions, AuthTokens, AthleteProfile } from '../types/auth';
import { secureStorage } from '../utils/secureStorage';
import { deleteAllDrafts } from '../services/draftService';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}/auth/callback`;

// Global timer for automatic token refresh
let refreshTimer: NodeJS.Timeout | null = null;

interface AuthStore extends AuthState, AuthActions {}

/**
 * Schedule automatic token refresh 30 minutes before expiry
 */
function scheduleTokenRefresh(tokens: AuthTokens): void {
  // Clear any existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const timeUntilExpiry = secureStorage.getTimeUntilExpiry(tokens);
  const thirtyMinutes = 30 * 60 * 1000;

  // Schedule refresh 30 minutes before expiry (or immediately if < 30 min left)
  const refreshDelay = Math.max(0, timeUntilExpiry - thirtyMinutes);

  console.log(
    `Token refresh scheduled in ${Math.round(refreshDelay / 1000 / 60)} minutes (expires in ${Math.round(timeUntilExpiry / 1000 / 60)} minutes)`
  );

  refreshTimer = setTimeout(() => {
    console.log('Auto-refreshing token...');
    useAuthStore.getState().refreshAccessToken();
  }, refreshDelay);
}

/**
 * Clear automatic token refresh timer
 */
function clearTokenRefreshTimer(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Authentication store using Zustand
 * Manages OAuth flow, token storage, and authentication state
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  tokens: null,
  athlete: null,
  isLoading: false,
  error: null,

  /**
   * Initiate Strava OAuth login
   * Redirects user to Strava authorization page
   */
  login: () => {
    if (!STRAVA_CLIENT_ID) {
      set({ error: 'Strava Client ID not configured' });
      return;
    }

    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'activity:read_all,activity:write',
      approval_prompt: 'auto',
    });

    window.location.href = `https://www.strava.com/oauth/authorize?${params}`;
  },

  /**
   * Logout and clear all auth data
   */
  logout: () => {
    clearTokenRefreshTimer();
    secureStorage.clear();
    // Clear all cached drafts from IndexedDB on logout
    deleteAllDrafts().catch(() => {});
    set({
      isAuthenticated: false,
      tokens: null,
      athlete: null,
      error: null,
    });
  },

  /**
   * Set tokens and athlete profile after successful authentication
   */
  setTokens: (tokens: AuthTokens, athlete: AthleteProfile) => {
    secureStorage.setTokens(tokens);
    secureStorage.setAthlete(athlete);
    scheduleTokenRefresh(tokens);
    set({
      isAuthenticated: true,
      tokens,
      athlete,
      error: null,
    });
  },

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken: async () => {
    const { tokens } = get();

    if (!tokens?.refreshToken) {
      set({ error: 'No refresh token available' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: tokens.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();

      const newTokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      };

      secureStorage.setTokens(newTokens);
      scheduleTokenRefresh(newTokens); // Schedule next auto-refresh
      set({
        tokens: newTokens,
        isLoading: false,
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Token refresh failed',
        isLoading: false,
      });
      // If refresh fails, logout
      get().logout();
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  },
}));

/**
 * Initialize auth state from storage on app load
 */
export function initializeAuth(): void {
  const tokens = secureStorage.getTokens();
  const athlete = secureStorage.getAthlete();

  if (tokens && athlete) {
    // Check if token is expired
    if (secureStorage.isTokenExpired(tokens)) {
      // Token expired, attempt refresh
      useAuthStore.getState().refreshAccessToken();
    } else {
      // Token still valid
      useAuthStore.setState({
        isAuthenticated: true,
        tokens,
        athlete,
      });

      // Schedule automatic refresh timer
      scheduleTokenRefresh(tokens);

      // If token will expire soon, refresh immediately
      if (secureStorage.willExpireSoon(tokens)) {
        useAuthStore.getState().refreshAccessToken();
      }
    }
  }
}
