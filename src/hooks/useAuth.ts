import { useAuthStore } from '../stores/authStore';
import type { AuthState, AuthActions } from '../types/auth';

/**
 * Custom hook for accessing authentication state and actions
 * Provides a clean interface to the auth store
 */
export function useAuth(): AuthState & AuthActions {
  const {
    isAuthenticated,
    tokens,
    athlete,
    isLoading,
    error,
    login,
    logout,
    setTokens,
    refreshAccessToken,
    clearError,
  } = useAuthStore();

  return {
    isAuthenticated,
    tokens,
    athlete,
    isLoading,
    error,
    login,
    logout,
    setTokens,
    refreshAccessToken,
    clearError,
  };
}
