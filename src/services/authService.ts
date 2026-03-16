import type {
  TokenExchangeRequest,
  TokenExchangeResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
} from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Authentication service for Strava OAuth
 */
export class AuthService {
  /**
   * Exchange authorization code for access/refresh tokens
   */
  static async exchangeToken(code: string): Promise<TokenExchangeResponse> {
    const request: TokenExchangeRequest = { code };

    const response = await fetch(`${API_URL}/auth/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to exchange authorization code');
    }

    return await response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<TokenRefreshResponse> {
    const request: TokenRefreshRequest = { refreshToken };

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to refresh access token');
    }

    return await response.json();
  }
}
